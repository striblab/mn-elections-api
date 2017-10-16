/**
 * An attempt to read a results file from SoS and get a quick,
 * but accurate count of contests and candidates, to help verify.
 */

// Dependencies
const _ = require('lodash');
const fetch = require('./fetch-sos.js');

// Main function to calculate results
async function verifyResults(ftp, results) {
  results = _.map(results, _.clone);

  // Update user/pass
  let o = _.clone(ftp);
  o.user = o.user || process.env.SOS_FTP_USER;
  o.password = o.password || process.env.SOS_FTP_PASS;

  // Go through results
  await Promise.all(
    results.map(async r => {
      let contests = [];
      let candidates = [];
      r.local = '/tmp';

      await fetch.fetchFile(o, r, row => {
        row = row.split(';');

        // Oh, ranked-choice.  Just ignore anything but the 1st choice
        if (row[4].match(/first choice/i)) {
          row[3] = row[3].replace(/.$/, '1');
          r.hasRankedChoice = true;
        }
        else if (row[4].match(/ choice/i) && !row[4].match(/first choice/i)) {
          r.hasRankedChoice = true;
          return;
        }

        // Put togeher
        let contest = _.map(_.pick(row, [0, 1, 2, 3, 4, 5])).join('-');
        let candidate = _.map(_.pick(row, [6, 7])).join('-');

        contests.push(contest);
        candidates.push(contest + candidate);
        delete r.local;
      });

      // Update
      r.contests = _.uniq(contests).length;
      r.candidates = _.uniq(candidates).length;
    })
  );

  return results;
}

// Export
module.exports = verifyResults;
