/**
 * Fetch results.
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const parser = require('./results-parse.js');
const aggregate = require('./results-aggregate.js');
const supplement = require('./results-supplement.js');
const meta = require('./results-meta.js');
const winner = require('./common-winner.js');
const fetch = require('./common-fetch.js');
const debug = require('debug')('mn-elections-api:results-fetch');

// Main fetch function
async function fetchResults(election, options = {}) {
  // Setup options and paths
  options.exportPath = options.exportPath || path.join(__dirname, '..', 'export');
  options.exportResults = path.join(options.exportPath, 'results');
  mkdirp.sync(options.exportResults);

  // Main fetch of data.  Add export path
  let rows = await fetch(election.sos, _.map(election.results, (r) => {
    r.local = path.join(options.exportResults, 'sources');
    return r;
  }), parser);

  // Aggregate the parsed results
  debug('Aggregating ' + rows.length + ' rows.');
  let results = aggregate(rows, election, options);

  // Match with meta
  debug('Matching meta data with ' + results.length + ' contests.');
  results = await meta(results, election, options);

  // Incumbent
  // TODO

  // Add supplement
  debug('Supplementing ' + results.length + ' contests.');
  results = await supplement(results, election, options);

  // Winner calculations
  debug('Calculating winners.');
  results = _.map(results, winner);

  // Order and render
  debug('Rendering.');
  render(_.orderBy(results, ['office', 'area']), election, options);
}

// Export results
function render(results, election = {}, options = {}) {
  // Save all
  fs.writeFileSync(path.join(options.exportResults, 'results-all.json'), JSON.stringify(results));

  // TODO: Break up
  // TODO: Metadata
}

// Main export
module.exports = fetchResults;
