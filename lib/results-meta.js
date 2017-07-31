/**
 * Match results with meta data.
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const common = require('./common.js');
const fetchMeta = require('./meta-fetch.js');
const debug = require('debug')('mn-elections-api:results-meta');

// Main function
async function matchMeta(contests, election = {}, options = {}) {
  options.exportPath = options.exportPath || path.join(__dirname, '..', 'export');
  options.exportMeta = path.join(options.exportPath, 'meta');

  // Possible cache
  let meta = await source(election, options);

  // Note if we don't have some core parts
  if (!meta.districts) {
    debug('District data not found in meta data.');
  }

  // Match data
  contests = _.map(contests, (contest) => {
    if (meta.districts) {
      contest = matchDistrict(contest, meta.districts);

      // We may have more data to make a better ID
      contest.contestID = common.makeContestID(contest);
      contest.candidates = _.map(contest.candidates, (c) => {
        c.entryID = common.makeEntryID(contest, c);
        return c;
      });
    }
    if (meta.questions) {
      contest = matchQuestion(contest, meta.questions);
    }

    return contest;
  });

  return contests;
}

// Match a contest with district data
function matchDistrict(contest, districts) {
  if (contest.type === 'local') {
    let match = _.find(districts, { localID: common.padLeft(contest.districtID, 5), type: 'local' });
    if (match) {
      contest.area = match.name;
      contest.countyID = match.countyID;
    }
  }
  else if (contest.type === 'county') {
    let match = _.find(districts, { countyID: common.padLeft(contest.countyID, 2), type: 'county' });
    if (match) {
      contest.area = match.name;
    }
  }
  else if (contest.type === 'school') {
    // Not sure way to get this information, and it should come in
    // through the results.
  }
  else if (contest.type === 'state') {
    contest.area = contest.stateID === 'MN' ? 'Minnesota' : undefined;
  }

  return contest;
}

// Match a contest with question data
function matchQuestion(contest, questions) {
  if (!contest.question) {
    return contest;
  }

  let match = _.find(questions, (q) => {
    // Contest data comes in as just a single ID
    return (contest.type === 'local' && contest.districtID === q.localID) ||
      (contest.type === 'school' && contest.districtID === q.schoolID) ||
      (contest.type === 'county' && contest.districtID === q.countyID);
  });
  if (match) {
    contest.questionTitle = match.questionTitle;
    contest.questionText = match.questionText;
  }

  return contest;
}

// Get data or fetch
async function source(election, options) {
  let all = path.join(options.exportMeta, 'meta-all.json');

  return new Promise(async (resolve, reject) => {
    if (!fs.existsSync(all)) {
      try {
        await fetchMeta(election, options);
      }
      catch (e) {
        reject(e);
      }
    }

    return resolve(JSON.parse(fs.readFileSync(all, 'utf-8')));
  });
}

// Export
module.exports = matchMeta;
