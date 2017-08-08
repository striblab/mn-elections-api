/**
 * Election class
 */


// Dependencies
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
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
      // Contest currently expects some election level
      // values as properties.  This should be updated.
      f.election = this.id();
      f.primary = this.get('primary');
      let c = new Contest(i, f, {}, this);

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
    this.contests.forEach((c) => {
      c.matchMeta(this.meta);
    });

    // TODO: Match supplement

    // Winner and validate
    _.each(this.contests, (c) => {
      c.updateWinners();
      c.validateAll();
    });

    // Save
    this.exportObjects(this.contests, 'results', 'all.json');
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

  // Update
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
