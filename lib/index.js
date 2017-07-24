
// Dependencies
const FTP = require('ftp');
const byline = require('byline');
const parser = require('./parser.js');
const aggregate = require('./aggregate.js');

let ftpConnection = new FTP();
ftpConnection.on('ready', () => {
  // Pipe
  let input = byline.createStream();
  let rows = [];

  // Handle each line
  input.on('data', (d) => {
    rows.push(parser(d.toString()));
  });

  // Get file
  ftpConnection.get('20131105_MG/local.txt', (error, stream) => {
    if (error) {
      return console.error(error);
    }

    // Once done
    stream.once('close', () => {
      aggregate(rows);
      ftpConnection.end();
    });
    stream.pipe(input);
  });


});

ftpConnection.connect({
  host: 'ftp.sos.state.mn.us',
  user: 'media',
  password: 'results'
});
