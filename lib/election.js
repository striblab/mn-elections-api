/**
 * Election class
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const sift = require('sift');
const utility = require('./utility.js');
const fetchSoS = require('./fetch-sos.js');
const Base = require('./base.js');
const Meta = require('./meta.js');
const Contest = require('./contest.js');
const Supplement = require('./supplement.js');
const print = require('./print.js');
const debug = require('debug')('mn-elections-api:election');

// Main class
class Election extends Base {
  constructor(election = {}, options = {}) {
    super(options);

    // Check for election
    if (!_.isPlainObject(election)) {
      throw new Error(
        'election parameter provided to Election class was not an object.'
      );
    }

    // Check for exportPath
    if (!this.exportPath) {
      throw new Error('exportPath not provided to options.');
    }

    // Set
    this.set('', election);

    // Make supplement if needed
    if (this.get('supplement')) {
      this.supplement = new Supplement(options, this);
    }
  }

  // Get results (contests and candidates)
  async fetchResults() {
    // Check if we have contests
    if (this.contests && this.contests.length) {
      return;
    }

    // Get supplement if needed
    if (this.supplement) {
      await this.supplement.fetch();
    }

    // Make sure we have meta data
    await this.fetchMeta();

    // Make set of files to parse
    let files = _.map(this.get('results'), s => {
      s.local = ['results', 'sources'];
      return s;
    });

    // Fetch data
    this.contests = [];
    await this.fetch(files, (i, f) => {
      delete f.local;
      let c = new Contest(i, f, this.options, this);

      // Look for existing contest
      let existing = _.find(this.contests, i => {
        return i.id() === c.id();
      });
      if (existing) {
        existing.setAll(c.toJSON());
      }
      else {
        this.contests.push(c);
      }
    });

    // Match contests with meta and supplement
    _.each(this.contests, c => {
      c.matchMeta(this.meta);
    });

    // Match supplement
    if (
      this.supplement &&
      (this.supplement.contests || this.supplement.candidates)
    ) {
      _.each(this.contests, c => {
        c.supplement(this.supplement);
      });
    }

    // Winner and validate
    _.each(this.contests, c => {
      c.updateWinners();
      c.validateAll();
    });

    // Break down results and export
    this.exportResults();
  }

  // Export results
  exportResults() {
    this.sortContests();

    // Easy JSON
    let contests = _.map(this.contests, c => {
      return c.toJSON();
    });

    // Export all
    this.exportObjects(this.contests, 'results', 'all.json');

    // Export each individual contest
    _.each(this.contests, c => {
      this.export(c.toJSON(), 'results', 'contests', c.id() + '.json');
    });

    // Export keyword search
    this.export(
      _.map(contests, c => {
        let p = _.pick(c, [
          'id',
          'name',
          'area',
          'subArea',
          'seatName',
          'type'
        ]);

        if (!c.question) {
          p.candidates = _.filter(
            _.map(c.candidates, a => {
              if (a.writeIn) {
                return null;
              }

              return _.filter([
                a.title,
                a.prefix,
                a.first,
                a.middle,
                a.nick ? '"' + a.nick + '"' : null,
                a.last,
                a.suffix ? ', ' + a.suffix : null
              ]).join(' ');
            })
          );
        }

        return p;
      }),
      'results',
      'all-search.json'
    );

    // Export contests sets
    if (_.isPlainObject(this.get('sets'))) {
      _.each(this.get('sets'), (s, si) => {
        if (_.isArray(s) || _.isPlainObject(s)) {
          this.export(
            {
              title: _.isPlainObject(s) && s.title ? s.title : si,
              set: 'custom-sets',
              // If array, assume array of IDs, if object, look for where
              // clause to filter contests.
              contests:
                _.isPlainObject(s) && s.where
                  ? this.filterContests(s.where)
                  : _.filter(
                      _.map(s, id => {
                        return _.find(contests, c => {
                          return c.id === id;
                        });
                      })
                    )
            },
            'results',
            'sets',
            utility.urlSafe(utility.makeID(si)) + '.json'
          );
        }
      });
    }

    // Export contest by area
    _.each(
      _.groupBy(contests, c => {
        return c.area;
      }),
      (set, area) => {
        this.export(
          {
            title: area + ' races',
            set: 'areas',
            contests: set
          },
          'results',
          'areas',
          utility.urlSafe(utility.makeID(area)) + '.json'
        );
      }
    );

    // Export contest by type
    _.each(
      _.groupBy(contests, c => {
        return c.type;
      }),
      (set, type) => {
        this.export(
          {
            title: type + ' races',
            set: 'types',
            contests: set
          },
          'results',
          'types',
          utility.urlSafe(utility.makeID(type)) + '.json'
        );
      }
    );

    // Export by group
    let byGroup = {};
    _.each(contests, c => {
      if (c.groups) {
        _.each(c.groups, g => {
          byGroup[g] = byGroup[g] || [];
          byGroup[g].push(c);
        });
      }
    });
    _.each(byGroup, (set, group) => {
      this.export(
        {
          title: group,
          set: 'groups',
          contests: set
        },
        'results',
        'groups',
        utility.urlSafe(utility.makeID(group)) + '.json'
      );
    });

    // Export all
    this.export(this.toJSON(), 'election', 'election.json');
  }

  // Export contest out for Saxotech
  exportPrint() {
    this.sortContests();
    let outputs = [];

    // Go through each print sections
    let sections = this.get('print');
    if (!sections) {
      debug('No print sections found');
      return;
    }

    _.each(sections, section => {
      let now = moment();
      let subset = this.filterContests(section.where);
      let outputPath = [
        'print',
        now.format('YYYYMMDD-HHmmss'),
        section.filename
          ? section.filename.toUpperCase() +
            '_' +
            now.format('DDMMYY') +
            '_' +
            now.format('HHmm') +
            '.txt'
          : 'saxo-elections-' +
            utility.urlSafe(utility.makeID(section.title)) +
            '.txt'
      ];
      outputs.push(outputPath);

      this.export(print(subset, section), ...outputPath);
    });

    return outputs;
  }

  // Filter contests by a where object
  filterContests(where, contests) {
    contests = contests || this.contests;
    contests = contests.toJSON ? contests.toJSON() : contests;

    // Check for where
    if (!where) {
      return [];
    }

    // Use sift to filter contests
    return this.sortContests(sift(where, contests));
  }

  // Get meta data
  async fetchMeta() {
    // If no meta data explicitly set
    if (this.get('noMeta')) {
      this.meta = [];
      return;
    }

    // If already loaded, don't worry about it
    if (this.meta && this.meta.length) {
      return;
    }

    // Attempt to load from cache
    if (this.options.cache) {
      let meta = this.loadObjects('meta', 'meta', 'all.json');
      if (!meta) {
        debug('Unable to find meta cache.');
      }
      else {
        debug('Using meta cache.');
        this.meta = meta;
        return;
      }
    }

    // Make set of files to parse
    let files = _.reduce(
      this.get('meta'),
      (total, set, si) => {
        return total.concat(
          _.map(set, s => {
            s.local = ['meta', 'sources'];
            s.set = si;
            return s;
          })
        );
      },
      []
    );

    // Fetch district data
    let rows = await this.fetch(files, (i, f) => {
      delete f.local;
      return new Meta(i, f, {}, this);
    });

    this.meta = rows;
    this.exportObjects(this.meta, 'meta', 'all.json');
  }

  // Setup supplement
  async setupSupplement() {
    if (!this.supplement) {
      debug('Supplement cannot be setup for this election.');
      return false;
    }

    // Get results first
    await this.fetchResults();

    // Setup
    this.contests = this.sortContests();
    await this.supplement.setup(this.contests);
  }

  // Sort contests
  sortContests(contests) {
    contests = contests || this.contests;
    contests = _.orderBy(
      contests,
      [
        c => {
          return _.isPlainObject(c) ? c.sort : c.get('sort');
        },
        c => {
          return _.isPlainObject(c) ? c.area : c.get('area');
        },
        c => {
          return _.isPlainObject(c) ? c.name : c.get('name');
        },
        c => {
          return _.isPlainObject(c) ? c.subArea : c.get('subArea');
        },
        c => {
          return _.isPlainObject(c) ? c.seatName : c.get('seatName');
        }
      ],
      ['asc', 'asc', 'asc', 'asc', 'asc']
    );
    _.each(contests, c => {
      if (!_.isPlainObject(c)) {
        c.candidatesSort();
      }
    });

    return contests;
  }

  // On update
  update() {
    this.set('updated', moment().unix());
  }

  // Validation when updating
  validate() {
    if (this.noValidate) {
      return;
    }

    // Check that id field is present
    if (!this.get('id')) {
      throw new Error('id field not present in election: ' + this.id());
    }
    // Check results
    if (!_.isArray(this.get('results')) || !this.get('results').length) {
      throw new Error('results field not present in election: ' + this.id());
    }
    // Check meta, allow for noMeta
    if (this.get('noMeta') && !_.isPlainObject(this.get('results'))) {
      throw new Error(
        'meta field not present in election and noMeta is true: ' + this.id()
      );
    }
  }

  // Verify.  Checks if the number of contests and candidates matches.  Returns
  // string if there is a warning, true if all good, and false if no projections
  verify() {
    // Check for contests
    if (!this.contests || !this.contests.length) {
      throw new Error('No contests found in election: ' + this.id());
    }

    // Get projected totals
    let projectedContests = _.sumBy(this.get('results'), 'contests');
    let projectedCandidates = _.sumBy(this.get('results'), 'candidates');

    // Make sure we have projects
    if (!projectedContests) {
      return false;
    }

    // Count actual contests
    if (projectedContests !== this.contests.length) {
      return (
        'Contest count did not match. Projected: ' +
        projectedContests +
        ', found: ' +
        this.contests.length
      );
    }

    // Count actual candidates
    let foundCandidates = _.sumBy(this.contests, c => {
      return c.candidates.length;
    });
    if (projectedCandidates !== foundCandidates) {
      return (
        'Candidate count did not match. Projected: ' +
        projectedCandidates +
        ', found: ' +
        foundCandidates
      );
    }

    return true;
  }

  // Export array of objects
  exportObjects(objects, ...paths) {
    if (!_.isArray(objects)) {
      throw new Error('objects provided to exportObjects is not an array.');
    }

    let exported = _.map(objects, o => {
      return o.toJSON();
    });

    this.export(exported, ...paths);
  }

  // Load objects
  loadObjects(type, ...paths) {
    let file = path.join(...[this.exportPath, ...paths]);
    if (!fs.existsSync(file)) {
      return false;
    }

    let objects = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!_.isArray(objects)) {
      throw new Error(
        'loadObjects needs array, but data loaded was not an array.'
      );
    }

    return objects.map(o => {
      if (type === 'meta') {
        return new Meta(o, {}, this.options, this);
      }
      else if (type === 'contest') {
        return new Contest(o, {}, this.options, this);
      }
    });
  }

  // Wrapper around fetch
  async fetch(files, parser) {
    let connection = this.get('sos');
    connection.user = connection.user || process.env.SOS_FTP_USER;
    connection.password = connection.pass || process.env.SOS_FTP_PASS;

    // Update local path
    files = files.map(f => {
      f.local = _.isArray(f.local)
        ? path.join(this.exportPath, ...f.local)
        : f.local;
      return f;
    });

    return await fetchSoS(connection, files, parser);
  }

  // Make id
  id() {
    return this.get('id');
  }

  // Default values
  defaults() {
    return {
      primary: false,
      special: false
    };
  }
}

// Export
module.exports = Election;
