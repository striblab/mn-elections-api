/**
 * Fetch results.
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const FTP = require('ftp');
const byline = require('byline');
const joinStream = require('join-stream');
const parser = require('./results-parse.js');
const aggregate = require('./results-aggregate.js');
const supplement = require('./results-supplement.js');
const winner = require('./common-winner.js');
const debug = require('debug')('mn-elections-api:results-fetch');


// Fetch.  Config is configuration describing the election.  Options
// are options to use for the processing, such as where to save.
async function fetch(config = {}, options = {}) {
  options.exportPath = options.exportPath || path.join(__dirname, '..', 'export');
  options.exportResults = path.join(options.exportPath, 'results');
  mkdirp.sync(options.exportResults);

  // Make connection
  let ftpConnection = new FTP();

  return new Promise((resolve, reject) => {
    ftpConnection.on('ready', async () => {
      // Fetch all results
      let results = [];
      await Promise.all(config.results.map(async (r) => {
        try {
          debug('Fetching results from file: ', r.file);
          let f = await fetchSet(ftpConnection, r, config, options);
          results = results.concat(f);
        }
        catch (e) {
          debug('Unable to fetch results for: ', r);
          reject(e);
        }
      }));

      // Disconnect
      ftpConnection.end();

      // Aggregate the parsed results
      debug('Aggregating ' + results.length + ' rows.');
      results = aggregate(results);

      // Add supplement
      debug('Supplementing ' + results.length + ' contests.');
      results = await supplement(results, options);

      // Winner calculations
      debug('Calculating winners.');
      results = _.map(results, winner);

      // Order and render
      debug('Rendering.');
      render(_.orderBy(results, ['office', 'area']), options);

      resolve(results);
    });
    ftpConnection.on('error', reject);
    ftpConnection.connect(config.sos);
  });
}

// Get a specific result set
function fetchSet(connection, resultsConfig = {}, electionConfig = {}, options = {}) {
  return new Promise((resolve, reject) => {
    let input = byline.createStream();
    let sources = path.join(options.exportResults, 'sources');
    mkdirp(sources);
    let output = fs.createWriteStream(path.join(sources, resultsConfig.file));
    let rows = [];

    // Handle each line
    input.on('data', (d) => {
      rows.push(parser(d.toString()));
    });
    input.on('error', reject);

    // Get file
    connection.get(path.join(electionConfig.sos.dir, resultsConfig.file), (error, stream) => {
      if (error) {
        return reject(error);
      }
      stream.on('error', reject);

      // Once done
      stream.once('close', () => {
        resolve(rows, resultsConfig);
      });

      // Start piping
      stream.pipe(input).pipe(joinStream('\n')).pipe(output);
    });
  });
}

// Export results
function render(results, options = {}) {
  // Save all
  fs.writeFileSync(path.join(options.exportResults, 'results-all.json'), JSON.stringify(results));

  // TODO: Break up
  // TODO: Metadata
}

// Main export
module.exports = fetch;
