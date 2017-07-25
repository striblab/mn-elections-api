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
const parser = require('./results-parse.js');
const aggregate = require('./results-aggregate.js');
const supplement = require('./results-supplement.js');
const debug = require('debug')('mn-elections-api:results-fetch');

// Fetch
function fetch(config) {
  config = config || {};

  // Defaults (mostly for easier testing)
  config.sos = _.extend(config.sos || {}, {
    host: 'ftp.sos.state.mn.us',
    user: 'media',
    password: 'results',
    dir: '20131105_MG'
  });
  config.results = config.results || [
    { file: 'local.txt', type: 'local' }
  ];

  // Make connection
  let ftpConnection = new FTP();

  return new Promise((resolve, reject) => {
    ftpConnection.on('ready', () => {
      // Fetch all results
      let results = [];
      _.each(config.results, async (r) => {
        try {
          let f = await fetchSet(r, config.sos.dir, ftpConnection);
          results = results.concat(f);
        }
        catch (e) {
          debug('Unable to fetch results for: ', r);
          reject(e);
        }

        ftpConnection.end();
        render(results);
        resolve(results);
      });
    });
    ftpConnection.on('error', reject);
    ftpConnection.connect(config.sos);
  });
}

// Get a specific result set
function fetchSet(resultsConfig, directory, connection) {
  return new Promise((resolve, reject) => {
    // Pipe
    let input = byline.createStream();
    let rows = [];

    // Handle each line
    input.on('data', (d) => {
      rows.push(parser(d.toString()));
    });
    input.on('error', reject);

    // Get file
    connection.get(path.join(directory, resultsConfig.file), (error, stream) => {
      if (error) {
        return reject(error);
      }
      stream.on('error', reject);

      // Once done
      stream.once('close', () => {
        resolve(supplement(aggregate(rows, resultsConfig), resultsConfig));
      });
      stream.pipe(input);
    });
  });
}

// Export results
function render(results) {
  let e = path.join(__dirname, '..', 'export');
  mkdirp(e);

  // Save all
  fs.writeFileSync(path.join(e, 'results-all.json'), JSON.stringify(results));

  // TODO: Break up
  // TODO: Metadata
}

// Main export
module.exports = fetch;
