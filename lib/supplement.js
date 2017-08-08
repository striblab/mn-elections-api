/**
 * Supplement class
 */

// Dependencies
const _ = require('lodash');
const airtable = require('./airtable.js');
const Base = require('./base.js');
const debug = require('debug')('mn-elections-api:supplement');


// Main class
class Supplement extends Base {
  constructor(options = {}, election) {
    super(options);
    this.election = election;
    this.attachConfig();

    // Check for key
    if (!process.env.AIRTABLE_API_KEY) {
      throw new Error('AIRTABLE_API_KEY environment variable not found.');
    }

    // double check for supplement
    if (!_.isPlainObject(election.get('supplement'))) {
      throw new Error('Election does not have supplement object.');
    }

    // Create airtable connection
    this.airtable = airtable(election.get('supplement').id);
  }

  // Fetch all
  async fetch() {
    await this.fetchContests();
    await this.fetchCandidates();
  }

  // Get contests
  async fetchContests() {
    debug('Fetching contests from supplement.');
    this.contests = await this.airtable.fetchAll(this.config.tables.contest);
    this.export(this.contests, 'supplement', 'sources', 'contests.json');

    this.contests = _.map(this.contests, (c) => {
      c.type = 'contest';
      return this.translate(c);
    });
    this.contests = _.filter(this.contests, 'supplemented');
    this.export(this.contests, 'supplement', 'contests.json');
  }

  // Get candidates
  async fetchCandidates() {
    debug('Fetching candidates from supplement.');
    this.candidates = await this.airtable.fetchAll(this.config.tables.candidate);
    this.export(this.candidates, 'supplement', 'sources', 'candidates.json');

    this.candidates = _.map(this.contests, (c) => {
      c.type = 'candidate';
      return this.translate(c);
    });
    this.candidates = _.filter(this.candidates, 'supplemented');
    this.export(this.candidates, 'supplement', 'candidates.json');
  }

  // Load results into an airtable
  async setup(contests) {
    if (!_.isArray(contests) || !contests.length) {
      throw new Error('contests provided to setup is not array or empty.');
    }

    // Get current values
    let supContests = await this.airtable.fetchAll(this.config.tables.contest);
    supContests = _.keyBy(supContests, 'Contest ID');
    let supCandidates = await this.airtable.fetchAll(this.config.tables.candidate);
    supCandidates = _.keyBy(supCandidates, 'Candidate ID');

    // Go through each contests
    for (let c of contests) {
      // Create row for contest
      if (!supContests[c.id()]) {
        debug('Creating supplement record for: ' + c.id());

        await this.airtable.createRecord(this.config.tables.contest,
          this.reverseTranslate(c, 'contest'));

        // Go through candidates
        for (let cand of c.candidates) {
          // Create row for candidate
          if (!supCandidates[cand.id()]) {
            let record = this.reverseTranslate(cand, 'candidate');

            // Get helpful contest data
            _.each(this.config.translations.candidate, (source, target) => {
              if (source.indexOf('contest.') === 0) {
                record[target] = c.get(source.replace('contest.', ''));
              }
            });

            await this.airtable.createRecord(this.config.tables.candidate, record);
          }
        }
      }
    }
  }

  // Translate field names (supplement to spec)
  translate(data) {
    let translated = {};

    _.each(this.config.translations[data.type], (target, source) => {
      if (!_.isUndefined(data[source])) {
        translated[target] = _.clone(data[source]);
      }
    });

    return translated;
  }

  // Reverse translate (spec to supplement)
  reverseTranslate(data, type) {
    let translated = {};

    _.each(this.config.translations[type], (source, target) => {
      let s = data.get(source);

      if (!_.isUndefined(s)) {
        translated[target] = s;
      }
    });

    return translated;
  }

  // Configuration, specifically around translation for tables and fields
  attachConfig() {
    this.config = {
      tables: {
        contest: process.env.AIRTABLE_TABLE_CONTESTS || 'Contests',
        candidate: process.env.AIRTABLE_TABLE_RESULTS || 'Results'
      },
      translations: {
        contest: {
          'Contest ID': 'id',
          'Publish': 'supplemented',
          'Title': 'name',
          'Area': 'area',
          'Seats': 'seats',
          'Ranked-choice': 'ranked',
          'Called': 'called',
          'Question Title': 'questionTitle',
          'Question': 'questionText',
          'Contest Note': 'note'
        },

        candidate: {
          'Candidate ID': 'id',
          'Contest ID': 'contest.id',
          'Publish': 'supplemented',
          'Contest Title': 'contest.name',
          'Contest Area': 'contest.area',
          'Incumbent': 'incumbent',
          'Candidate Name': 'display',
          'Candidate Sort Name': 'sort',
          'Votes': 'votes',
          'Notes': 'note',
          'Winner': 'winner'
        },
      }
    };
  }
}


// Export
module.exports = Supplement;
