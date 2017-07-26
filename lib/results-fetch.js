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
const debug = require('debug')('mn-elections-api:results-fetch');


// Fetch
function fetch(config = {}, exportPath) {
  exportPath = exportPath || path.join(__dirname, '..', 'export', 'results');
  mkdirp.sync(exportPath);

  // Defaults (mostly for easier testing and showing of structure)
  config.sos = _.extend(config.sos || {}, {
    host: 'ftp.sos.state.mn.us',
    user: 'media',
    password: 'results',
    dir: '20131105_MG'
  });
  config.results = config.results || [
    { file: 'local.txt', type: 'local' },
    { file: 'cntyRaces.txt', type: 'county' }
  ];

  // Make connection
  let ftpConnection = new FTP();

  return new Promise((resolve, reject) => {
    ftpConnection.on('ready', async () => {
      // Fetch all results
      let results = [];
      await Promise.all(config.results.map(async (r) => {
        try {
          debug('Fetching results from file: ', r.file);
          let f = await fetchSet(r, config.sos.dir, ftpConnection, exportPath);
          results = results.concat(f);
        }
        catch (e) {
          debug('Unable to fetch results for: ', r);
          reject(e);
        }
      }));

      ftpConnection.end();
      render(_.orderBy(supplement(aggregate(results)), ['office', 'area']), exportPath);
      resolve(results);
    });
    ftpConnection.on('error', reject);
    ftpConnection.connect(config.sos);
  });
}

// Get a specific result set
function fetchSet(resultsConfig, directory, connection, exportPath) {
  return new Promise((resolve, reject) => {
    let input = byline.createStream();
    let originals = path.join(exportPath, 'sources');
    mkdirp(originals);
    let output = fs.createWriteStream(path.join(originals, resultsConfig.file));
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
        resolve(rows, resultsConfig);
      });
      stream.pipe(input).pipe(joinStream('\n')).pipe(output);
    });
  });
}

// Export results
function render(results, exportPath) {
  // Save all
  fs.writeFileSync(path.join(exportPath, 'results-all.json'), JSON.stringify(results));

  // TODO: Break up
  // TODO: Metadata
}

// Main export
module.exports = fetch;
