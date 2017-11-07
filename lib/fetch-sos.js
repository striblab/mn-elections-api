/**
 * Common functions around fetching data via FTP
 */

// Dependencies
require('dotenv').load();
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const FTP = require('ftp');
const byline = require('byline');
const joinStream = require('join-stream');
const debug = require('debug')('mn-elections-api:fetch-sos');

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

  // Promisfy
  return new Promise(async (resolve, reject) => {
    // Fetch all results
    let results = [];
    await Promise.all(
      fileOptions.map(async f => {
        try {
          debug('Fetching results from file: ', f.file);
          let rows = await fetchFile(o, f, parser);
          results = results.concat(rows);
        }
        catch (e) {
          debug('Unable to fetch results for: ', f.file);
          reject(e);
        }
      })
    );

    resolve(results);
  });
}

// Get a specific file.  Due to bugs in downloading files, a new connection
// is made for each file.
function fetchFile(options, file, parser) {
  // Promisify
  return new Promise((resolve, reject) => {
    mkdirp.sync(file.local);
    let outputPath = path.join(file.local, file.file);
    let remoteFileInfoPath = path.join(file.local, file.file + '.meta.json');
    let previousOutputContent = fs.existsSync(outputPath)
      ? fs.readFileSync(outputPath, 'utf-8')
      : null;
    let remoteFileInfoPrevious;
    let output = fs.createWriteStream(outputPath);
    let input = byline.createStream();
    let rows = [];

    // Read meta
    if (fs.existsSync(remoteFileInfoPath)) {
      try {
        remoteFileInfoPrevious = JSON.parse(
          fs.readFileSync(remoteFileInfoPath, 'utf-8')
        );
      }
      catch (e) {
        debug(e);
      }
    }

    // Make connection
    let connection = new FTP();

    // Handle each line
    input.on('data', d => {
      rows.push(parser(d.toString(), file));
    });
    input.on('error', reject);

    // Once output is all
    output.on('close', () => {
      connection.end();
      resolve(rows);
    });

    // Get file
    connection.on('ready', async () => {
      let remoteFilePath = options.dir + '/' + file.file;

      // Checkout file metadata, and if changed, use that, otherwise
      // use the local file
      connection.list(remoteFilePath, (error, info) => {
        info = _.isArray(info) ? info[0] : undefined;

        // Save new info
        if (info) {
          fs.writeFileSync(remoteFileInfoPath, JSON.stringify(info));
        }

        // If we have new info, old info, and a local file with contents, then
        // check for difference
        if (
          options.checkChange &&
          info &&
          remoteFileInfoPrevious &&
          fs.existsSync(outputPath) &&
          previousOutputContent &&
          (info.size !== remoteFileInfoPrevious.size ||
            info.date !== remoteFileInfoPrevious.date)
        ) {
          debug('Remote file has not changed, using local: ' + file.file);

          // Since we are reading and writing to the same file, read file
          // synchronously, then stream it
          let inputStream = new stream.Readable();
          inputStream
            .pipe(input)
            .pipe(joinStream('\n'))
            .pipe(output);

          inputStream.push(previousOutputContent);
          inputStream.push(null);
        }
        else {
          connection.get(options.dir + '/' + file.file, (error, stream) => {
            if (error) {
              return reject(error);
            }
            stream.on('error', reject);

            // Start piping
            stream
              .pipe(input)
              .pipe(joinStream('\n'))
              .pipe(output);
          });
        }
      });
    });

    // Connect
    connection.on('error', reject);
    connection.connect(options);
  });
}

// Main export
fetch.fetchFile = fetchFile;
module.exports = fetch;
