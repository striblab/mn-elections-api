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

    let found = false;
    if (this.options.cache || this.options.cacheSupplement) {
      this.contests = this.import('supplement', 'sources', 'contests.json');
      found = !!this.contests;
      debug('Using cache for contests supplement.  Cache found: ' + found);
    }

    if (!found) {
      try {
        this.contests = await this.airtable.fetchAll(
          this.config.tables.contest
        );
        this.export(this.contests, 'supplement', 'sources', 'contests.json');
      }
      catch (e) {
        if (this.options.cacheOnFail) {
          this.contests = this.import('supplement', 'sources', 'contests.json');

          found = !!this.contests;
          debug(
            '[cacheOnFail] Using cache for contests supplement.  Cache found: ' +
              found
          );
          this.election.set('supplement', 'contests:stale');
          if (!found) {
            throw e;
          }
        }
      }
    }

    this.contests = _.map(this.contests, c => {
      return this.translate(c, 'contest');
    });
    this.contests = _.filter(this.contests, 'supplemented');
    this.export(this.contests, 'supplement', 'contests.json');
  }

  // Get candidates
  async fetchCandidates() {
    debug('Fetching candidates from supplement.');

    let found = false;
    if (this.options.cache || this.options.cacheSupplement) {
      this.candidates = this.import('supplement', 'sources', 'candidates.json');
      found = !!this.candidates;
      debug('Using cache for candidates supplement.  Cache found: ' + found);
    }

    if (!found) {
      try {
        this.contests = await this.airtable.fetchAll(
          this.config.tables.candidate
        );
        this.export(this.contests, 'supplement', 'sources', 'candidates.json');
      }
      catch (e) {
        if (this.options.cacheOnFail) {
          this.contests = this.import(
            'supplement',
            'sources',
            'candidates.json'
          );

          found = !!this.contests;
          debug(
            '[cacheOnFail] Using cache for candidates supplement.  Cache found: ' +
              found
          );
          this.election.set('supplement', 'candidates:stale');
          if (!found) {
            throw e;
          }
        }
      }
    }

    this.candidates = _.map(this.candidates, c => {
      return this.translate(c, 'candidate');
    });
    this.candidates = _.filter(this.candidates, 'supplemented');
    this.export(this.candidates, 'supplement', 'candidates.json');
  }

  // Load results into an airtable
  async setup(contests) {
    if (!_.isArray(contests) || !contests.length) {
      throw new Error('contests provided to setup is not array or empty.');
    }

    // Get current values and key by ID
    let supContests = await this.airtable.fetchAll(this.config.tables.contest);
    supContests = _.keyBy(supContests, 'Contest ID');
    let supCandidates = await this.airtable.fetchAll(
      this.config.tables.candidate
    );
    supCandidates = _.keyBy(supCandidates, 'Candidate ID');

    // Get supplemented field
    let contestSupplemented = _.invert(this.config.translations.contest)
      .supplemented;
    let candidateSupplemented = _.invert(this.config.translations.candidate)
      .supplemented;

    // Go through each contests
    for (let c of contests) {
      // Create row for contest if not there
      if (!supContests[c.id()]) {
        debug('Creating supplement record for: ' + c.id());

        await this.airtable.createRecord(
          this.config.tables.contest,
          _.pickBy(this.reverseTranslate(c, 'contest'))
        );
      }
      else if (
        supContests[c.id()] &&
        !supContests[c.id()][contestSupplemented] &&
        supContests[c.id()].airtableID
      ) {
        // Otherwise, only update records that have not been published/supplemented yet
        debug('Updating supplement record for: ' + c.id());

        await this.airtable.updateRecord(
          this.config.tables.contest,
          supContests[c.id()].airtableID,
          _.pickBy(this.reverseTranslate(c, 'contest'))
        );
      }

      // Go through candidates
      for (let cand of c.candidates) {
        // Make candidate data and get helpful contest data
        let record = this.reverseTranslate(cand, 'candidate');
        _.each(this.config.translations.candidate, (source, target) => {
          if (source.indexOf('contest.') === 0) {
            record[target] = c.get(source.replace('contest.', ''));
          }
        });
        record = _.pickBy(record);

        // Create row for candidate
        if (!supCandidates[cand.id()]) {
          await this.airtable.createRecord(
            this.config.tables.candidate,
            record
          );
        }
        else if (
          supCandidates[cand.id()] &&
          !supCandidates[cand.id()][candidateSupplemented] &&
          supCandidates[cand.id()].airtableID
        ) {
          // Only update if not published
          await this.airtable.updateRecord(
            this.config.tables.candidate,
            supCandidates[cand.id()].airtableID,
            record
          );
        }
      }
    }
  }

  // Translate field names (supplement to spec)
  translate(data, type) {
    let translated = {};
    let ignores = this.config.translations[type + 'Ignores'] || [];

    _.each(this.config.translations[type], (target, source) => {
      // Check for type
      let parts = target.split('-');

      if (!_.isUndefined(data[source]) && !~ignores.indexOf(source)) {
        // Handle array value
        if (parts[1] === 'array') {
          translated[parts[0]] = _.map(_.clone(data[source]).split('|'), d => {
            return d.trim();
          });
        }
        else {
          translated[target] = _.clone(data[source]);
        }
      }
    });

    return translated;
  }

  // Reverse translate (spec to supplement)
  reverseTranslate(data, type) {
    let translated = {};

    _.each(this.config.translations[type], (source, target) => {
      let parts = source.split('-');

      // Handle array value
      if (parts[1] === 'array') {
        if (parts[0] && _.isArray(data.get(parts[0]))) {
          translated[target] = data.get(parts[0]).join(' | ');
        }
      }
      else if (!_.isUndefined(data.get(source))) {
        translated[target] = data.get(source);
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
          Publish: 'supplemented',
          Title: 'name',
          Area: 'area',
          'Sub Area': 'subArea',
          'Seat Name': 'seatName',
          'Sort Name': 'sort',
          Metro: 'metro',
          Groups: 'groups-array',
          Seats: 'seats',
          'Ranked-choice': 'ranked',
          Candidates: 'candidates.length',
          Called: 'called',
          Final: 'final',
          'Question Title': 'questionTitle',
          Question: 'questionText',
          'Contest Note': 'note'
        },

        contestIgnores: ['Candidates'],

        candidate: {
          'Candidate ID': 'id',
          'Contest ID': 'contest.id',
          Publish: 'supplemented',
          'Contest Title': 'contest.name',
          'Contest Area': 'contest.area',
          'Contest Sub Area': 'contest.subArea',
          'Contest Seat Name': 'contest.seatName',
          Incumbent: 'incumbent',
          'Candidate Name': 'display',
          'Candidate Sort Name': 'sort',
          Party: 'party',
          Votes: 'votes',
          Notes: 'note',
          Winner: 'winner'
        },

        candidateIgnores: [
          'Contest ID',
          'Contest Title',
          'Contest Area',
          'Contest Sub Area',
          'Contest Seat Name'
        ]
      }
    };
  }
}

// Export
module.exports = Supplement;
