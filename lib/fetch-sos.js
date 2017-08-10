/**
 * Common functions around fetching data via FTP
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const FTP = require('ftp');
const byline = require('byline');
const joinStream = require('join-stream');
const debug = require('debug')('mn-elections-api:common-fetch');



// Main fetch function.  Input should be connection object and an array of objects like:
// { file: 'name.txt', local: 'path/to/save/locally', other: 'fields to attach' }
async function fetch(connectionOptions = {}, fileOptions = [], parser) {
  // Make connection
  let connection = new FTP();
  connection.origOptions = connectionOptions;

  // Promisfy
  return new Promise((resolve, reject) => {
    connection.on('ready', async () => {
      // Fetch all results
      let results = [];
      await Promise.all(fileOptions.map(async (f) => {
        try {
          debug('Fetching results from file: ', f.file);
          let rows = await fetchFile(connection, f, parser);
          results = results.concat(rows);
        }
        catch (e) {
          debug('Unable to fetch results for: ', f.file);
          reject(e);
        }
      }));

      // Disconnect and return
      connection.end();
      resolve(results);
    });

    connection.on('error', reject);
    connection.connect(connectionOptions);
  });
}

// Get a specific file
function fetchFile(connection, file, parser) {
  // Promisify
  return new Promise((resolve, reject) => {
    let input = byline.createStream();
    mkdirp.sync(file.local);
    let output = fs.createWriteStream(path.join(file.local, file.file));
    let rows = [];

    // Handle each line
    input.on('data', (d) => {
      rows.push(parser(d.toString(), file));
    });
    input.on('error', reject);

    // Get file
    connection.get(connection.origOptions.dir + '/' + file.file, (error, stream) => {
      if (error) {
        return reject(error);
      }
      stream.on('error', reject);

      // Once done
      stream.once('close', () => {
        resolve(rows);
      });

      // Start piping
      stream.pipe(input).pipe(joinStream('\n')).pipe(output);
    });
  });
}

// Main export
fetch.fetchFile = fetchFile;
module.exports = fetch;
