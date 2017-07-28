/**
 * Given agregated results, add supplemental data from the newsroom.
 */

// Dependencies
require('dotenv').load();
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const airtable = require('airtable');
const supplement = require('./common-supplement.js');
const config = require('./config-supplement.js');
const debug = require('debug')('mn-elections-api:results-supplement');

// Check for Airtable API key
if (!process.env.AIRTABLE_API_KEY) {
  throw new Error('AIRTABLE_API_KEY environment variable not found.');
}
if (!process.env.AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_BASE_ID environment variable not found.');
}

// We will use this often
const base = airtable.base(process.env.AIRTABLE_BASE_ID);


// Main function
async function supplementAggregatedResults(aggregated, options = {}) {
  options.useCache = _.isBoolean(options.useCache) ? options.useCache : false;
  options.exportSource = _.isBoolean(options.saveSource) ? options.saveSource : true;
  options.exportPath = options.exportPath || path.join(__dirname, '..', 'export');
  options.exportSupplement = path.join(options.exportPath, 'supplement');

  // Possible cache
  let { contests, results } = await source(options);

  // Filter unpublished
  contests = _.filter(contests, 'Publish');
  results = _.filter(results, 'Publish');

  // Key contests for quicker lookup
  contests = _.keyBy(contests, 'Contest ID');

  // Aggregate results by contest
  results = _.groupBy(results, 'Contest ID');

  // Attempt to match
  return _.map(aggregated, (a) => {
    a = supplementContests(a, contests);
    a = supplementResults(a, results);
    return a;
  });
}

// Match contest information
function supplementContests(contest, supplements) {
  let s = supplements ? supplements[contest.contestID] : undefined;
  if (s) {
    // Use translations
    _.each(config.translations.contests, (target, source) => {
      if ((_.isBoolean(s[source]) || !_.isNil(s[source])) && _.get(contest, target) !== s[source]) {
        _.set(contest, target, s[source]);
        contest.supplemented = true;
      }
    });
  }

  return contest;
}

// Match results information
function supplementResults(contest, supplements) {
  let r = supplements ? supplements[contest.contestID] : undefined;
  if (r) {
    // Check if the number of results/candidates for a contest
    // are the same.  If they are not, then not all results
    // have been published yet or some other mistake
    if (r.length !== contest.candidates.length) {
      debug('Supplement results/candidates does not have the same amount as SoS: ' + contest.contentID);
      return contest;
    }

    // Check if all entryIDs are the same
    if (!_.isEqual(_.sortBy(_.map(contest.candidates, 'entryID')), _.sortBy(_.map(r, 'Candidate ID')))) {
      debug('Supplement results/candidates does not have the same IDs as SoS: ' + contest.contentID);
      return contest;
    }

    // Go through each candidate/results
    contest.candidates = _.map(contest.candidates, (candidate) => {
      // Find matching
      let match = _.find(r, { 'Candidate ID': candidate.entryID });
      if (match) {
        // Use translations
        _.each(config.translations.results, (target, source) => {
          if ((_.isBoolean(match[source]) || !_.isNil(match[source])) && _.get(candidate, target) !== match[source]) {
            _.set(candidate, target, match[source]);
            candidate.supplemented = true;
          }
        });
      }

      return candidate;
    });
  }

  return contest;
}

// Handle possible cache and saving source data
async function source(options) {
  // Use cache
  if (options.useCache) {
    debug('Using cache for supplement source.');
    return loadCache(options);
  }
  else {
    // Try to get data from supplement database
    try {
      let contests = await supplement.fetchAll(base, config.tables.contests);
      let results = await supplement.fetchAll(base, config.tables.results);

      // Save supplement source data
      if (options.exportSource) {
        debug('Saving supplement data to: ' + options.exportSupplement);
        mkdirp.sync(options.exportSupplement);
        fs.writeFileSync(path.join(options.exportSupplement, 'contests.json'), JSON.stringify(contests));
        fs.writeFileSync(path.join(options.exportSupplement, 'results.json'), JSON.stringify(results));
      }

      return { contests, results };
    }
    catch (e) {
      debug('Unable to get data source, or save locally: ', e);
      debug('Using cache for supplement source.');
      return loadCache(options);
    }
  }
}

// Load from cache
function loadCache(options) {
  let c = path.join(options.exportSupplement, 'contests.json');
  let r = path.join(options.exportSupplement, 'results.json');

  // Check if there
  if (fs.existsSync(c) && fs.existsSync(r)) {
    return {
      contests: JSON.parse(fs.readFileSync(c, 'utf-8')),
      results: JSON.parse(fs.readFileSync(r, 'utf-8')),
    };
  }
  else {
    debug('Supplement cache not found.');
    return { contests: [], results: [] };
  }
}

// Export
module.exports = supplementAggregatedResults;
