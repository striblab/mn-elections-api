/**
 * Put to Saxo FTP
 */

// Dependencies
require('dotenv').load();
const path = require('path');
const _ = require('lodash');
const FTP = require('ftp');
const debug = require('debug')('mn-elections-api:put-saxo');

// Main put function.  files shoudl be an array of paths to put
async function fetch(connectionOptions = {}, files = []) {
  // Update user/pass
  let o = _.clone(connectionOptions);
  o.host = o.host || process.env.SAXO_FTP_HOST;
  o.user = o.user || process.env.SAXO_FTP_USER;
  o.password = o.password || process.env.SAXO_FTP_PASS;
  o.dir = o.dir || process.env.SAXO_FTP_PUT_LOCATION;
  o.connTimeout = o.connTimeout || 20000;
  o.pasvTimeout = o.pasvTimeout || 20000;
  o.keepalive = o.keepalive || 5000;

  // Promisfy
  return new Promise(async (resolve, reject) => {
    // Fetch all results
    await Promise.all(
      files.map(async f => {
        try {
          debug('Putting file: ', f);
          await putFile(o, f);
        }
        catch (e) {
          debug('Unable to put file: ', f);
          reject(e);
        }
      })
    );

    resolve();
  });
}

// Put a specific file.
function putFile(options, file) {
  let fileName = path.basename(file);

  // Promisify
  return new Promise((resolve, reject) => {
    // Make connection
    let connection = new FTP();

    // Get file
    connection.on('ready', async () => {
      connection.put(file, options.dir + '/' + fileName, error => {
        if (error) {
          return reject(error);
        }

        debug('Put file: ' + file);
        connection.end();
      });
    });

    // When done
    connection.on('end', resolve);

    // Connect
    connection.on('error', reject);
    connection.connect(options);
  });
}

// Main export
fetch.putFile = putFile;
module.exports = fetch;
