/**
 * Election class
 */


// Dependencies
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const utility = require('./utility.js');
const fetchSoS = require('./fetch-sos.js');
const Base = require('./base.js');
const Meta = require('./meta.js');
const Contest = require('./contest.js');
const Supplement = require('./supplement.js');
const debug = require('debug')('mn-elections-api:election');


// Main class
class Election extends Base {
  constructor(election = {}, options = {}) {
    super(options);

    // Check for election
    if (!_.isPlainObject(election)) {
      throw new Error('election parameter provided to Election class was not an object.');
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
    let files = _.map(this.get('results'), (s) => {
      s.local = ['results', 'sources'];
      return s;
    });

    // Fetch data
    this.contests = [];
    await this.fetch(files, (i, f) => {
      delete f.local;
      let c = new Contest(i, f, this.options, this);

      // Look for existing contest
      let existing = _.find(this.contests, (i) => {
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
    _.each(this.contests, (c) => {
      c.matchMeta(this.meta);
    });

    // Match supplement
    if (this.supplement && (this.supplement.contests || this.supplement.candidates)) {
      _.each(this.contests, (c) => {
        c.supplement(this.supplement);
      });
    }

    // Winner and validate
    _.each(this.contests, (c) => {
      c.updateWinners();
      c.validateAll();
    });

    // Break down results and export
    this.exportResults();
    this.export(this.toJSON(), 'election', 'election.json');
  }

  // Export results
  exportResults() {
    // Export all
    this.exportObjects(this.contests, 'results', 'all.json');

    // Export each individual contest
    _.each(this.contests, (c) => {
      this.export(c.toJSON(), 'results', 'contests', c.id() + '.json');
    });

    // Export keyword search
    this.export(_.map(this.contests, (c) => {
      return _.pick(c.toJSON(), ['id', 'name', 'area', 'type', 'questionTitle', 'questionText']);
    }), 'results', 'all-search.json');

    // Export contests sets
    if (_.isPlainObject(this.get('sets'))) {
      _.each(this.get('sets'), (s, si) => {
        if (_.isArray(s)) {
          this.export(_.filter(_.map(s, (id) => {
            return _.find(this.contests, (c) => {
              return c.id() === id;
            });
          })), 'results', 'sets-' + _.kebabCase(si) + '.json');
        }
      });
    }
  }

  // Export contest out for Saxotech
  exportPrint() {
    // Display name for candidate
    function display(candidate) {
      return _.filter([
        candidate.title, candidate.prefix,
        candidate.first, candidate.middle,
        candidate.nick ? '"' + candidate.nick + '"' : null,
        candidate.last, candidate.suffix
      ]).join(' ');
    }

    // Get simple objects
    let contests = _.map(this.contests, (c) => {
      return c.toJSON();
    });

    // How to group
    let grouped = _.groupBy(contests, (c) => {
      return c.area || c.name;
    });

    // lines for each area
    let lines = _.map(grouped, (group, groupName) => {
      let sublines = [];
      sublines.push('@Elex_Head1:' + groupName.toUpperCase());

      // Each contest
      _.each(group, (c) => {
        // Ranked choice is different
        if (c.ranked) {
          // TODO
        }
        else {
          sublines.push('@Elex_Head2:' + c.name.toUpperCase());

          if (c.seats > 1) {
            sublines.push('@Elex_precinct:Open seats: ' + c.seats);
          }

          sublines.push('@Elex_precinct:' + (c.precincts || 0) +
            ' of ' + c.totalPrecincts + ' precincts (' +
            Math.round(c.precincts / c.totalPrecincts) + '%)');

          _.each(c.candidates, (candidate) => {
            if (candidate.writeIn) {
              return;
            }

            sublines.push('@Elex_Text_2tabsPlusPct:' +
              (candidate.winner ? '<saxo:ch value="226 136 154"/>' : ' ') + '\t' +
              display(candidate) +
              (candidate.incumbent ? ' (i)' : '') + '\t' +
              (candidate.votes ? utility.formatNumber(candidate.votes, 0) : 0) + '\t' +
              (candidate.percent ? Math.round(candidate.percent) : '0') + '%');
          });
        }
      });

      return sublines;
    });

    return _.flatten(lines).join('\r\n');
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
    let meta = this.loadObjects('meta', 'meta', 'all.json');
    if (!meta) {
      debug('Unable to find meta cache.');
    }
    else {
      debug('Using meta cache.');
      this.meta = meta;
      return;
    }

    // Make set of files to parse
    let files = _.reduce(this.get('meta'), (total, set, si) => {
      return total.concat(_.map(set, (s) => {
        s.local = ['meta', 'sources'];
        s.set = si;
        return s;
      }));
    }, []);

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
    contests = _.orderBy(contests, [
      (c) => { return c.get('name'); },
      (c) => { return c.get('area'); }
    ], ['asc', 'asc']);
    _.each(contests, (c) => {
      c.candidatesSort();
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
    if (this.get('noMeta') && (!_.isPlainObject(this.get('results')))) {
      throw new Error('meta field not present in election and noMeta is true: ' + this.id());
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
      return 'Contest count did not match. Projected: ' + projectedContests + ', found: ' + this.contests.length;
    }

    // Count actual candidates
    let foundCandidates = _.sumBy(this.contests, (c) => {
      return c.candidates.length;
    });
    if (projectedCandidates !== foundCandidates) {
      return 'Candidate count did not match. Projected: ' + projectedCandidates + ', found: ' + foundCandidates;
    }

    return true;
  }

  // Export array of objects
  exportObjects(objects, ...paths) {
    if (!_.isArray(objects)) {
      throw new Error('objects provided to exportObjects is not an array.');
    }

    let exported = _.map(objects, (o) => {
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
      throw new Error('loadObjects needs array, but data loaded was not an array.');
    }

    return objects.map((o) => {
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
    files = files.map((f) => {
      f.local = _.isArray(f.local) ? path.join(this.exportPath, ...f.local) : f.local;
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
