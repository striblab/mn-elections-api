/**
 * Common functions around fetching data via FTP
 */

// Dependencies
require('dotenv').load();
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const FTP = require('ftp');
const byline = require('byline');
const joinStream = require('join-stream');
const debug = require('debug')('mn-elections-api:common-fetch');

// Main fetch function.  Input should be connection object and an array of objects like:
// { file: 'name.txt', local: 'path/to/save/locally', other: 'fields to attach' }
async function fetch(connectionOptions = {}, fileOptions = [], parser) {
  // Update user/pass
  let o = _.clone(connectionOptions);
  o.user = o.user || process.env.SOS_FTP_USER;
  o.password = o.password || process.env.SOS_FTP_PASS;
  o.connTimeout = o.connTimeout || 20000;
  o.pasvTimeout = o.pasvTimeout || 20000;
  o.keepalive = o.keepalive || 5000;

  // Make connection
  let connection = new FTP();
  connection.origOptions = o;

  // Promisfy
  return new Promise((resolve, reject) => {
    connection.on('ready', async () => {
      // Fetch all results
      let results = [];
      await Promise.all(
        fileOptions.map(async f => {
          try {
            debug('Fetching results from file: ', f.file);
            let rows = await fetchFile(connection, f, parser);
            results = results.concat(rows);
          }
          catch (e) {
            debug('Unable to fetch results for: ', f.file);
            reject(e);
          }
        })
      );

      // Resolve when ended
      connection.once('end', () => {
        resolve(results);
      });

      // Disconnect and return
      connection.end();
    });

    connection.on('error', reject);
    connection.connect(o);
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
    input.on('data', d => {
      rows.push(parser(d.toString(), file));
    });
    input.on('error', reject);

    // Get file
    connection.get(
      connection.origOptions.dir + '/' + file.file,
      (error, stream) => {
        if (error) {
          return reject(error);
        }
        stream.on('error', reject);

        // Once done
        stream.once('close', () => {
          resolve(rows);
        });

        // Start piping
        stream
          .pipe(input)
          .pipe(joinStream('\n'))
          .pipe(output);
      }
    );
  });
}

// Main export
fetch.fetchFile = fetchFile;
module.exports = fetch;
