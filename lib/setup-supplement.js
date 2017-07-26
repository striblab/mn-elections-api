/**
 * Add results and candidate data to supplemental source
 */

// Dependencies
require('dotenv').load();
const fs = require('fs');
const _ = require('lodash');
const airtable = require('airtable');
const common = require('./common.js');
const debug = require('debug')('mn-elections-api:setup-supplement');

// Check for Airtable API key
if (!process.env.AIRTABLE_API_KEY) {
  throw new Error('AIRTABLE_API_KEY environment variable not found.');
}
if (!process.env.AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_BASE_ID environment variable not found.');
}

// Since there are not hard ID's for tables and fields names
let config = {
  tables: {
    contestInfo: process.env.TABLE_CONTEST_INFO || 'Contest Info',
    results: process.env.TABLE_RESULTS || 'Results'
  }
};

// We will use this often
let supplementalBase = airtable.base(process.env.AIRTABLE_BASE_ID);

// Main function
async function setup(source) {
  source = source || 'export/results/results-all.json';

  // Read source from file
  if (_.isString(source)) {
    source = JSON.parse(fs.readFileSync(source, 'utf-8'));
  }

  // Setup each table
  await setupContests(source);
  await setupCandidates(source);
}

// Setup candidate info
async function setupCandidates(results) {
  let current = await fetchAll(config.tables.results);
  //let contests = await fetchAll(config.tables.contestInfo);

  // Go through contests and candidates
  for (let r of results) {
    for (let c of r.candidates) {
      // Only create record if not there already
      if (!_.find(current, { 'Candidate ID': c.entryID })) {
        await createRecord(config.tables.results, {
          'Candidate ID': c.entryID,
          'Contest ID': r.contestID,
          'Contest Title': r.office,
          'Contest Area': r.area,
          'Candidate Name': common.renderName(c.candidate),
          'Candidate Sort Name': common.renderSortName(c.candidate)
        });
        debug('Created candidate record: ' + c.entryID);
      }
    }
  }
}

// Setup contest info
async function setupContests(results) {
  let current = await fetchAll(config.tables.contestInfo);

  // Go through
  for (let r of results) {
    // Only create record if not there already
    if (!_.find(current, { 'Contest ID': r.contestID })) {
      await createRecord(config.tables.contestInfo, {
        'Contest ID': r.contestID,
        'Title': r.office,
        'Area': r.area,
        'Seats': r.seats,
        'Ranked-choice': r.ranked
      });
      debug('Created contest record: ' + r.contestID);
    }
  }
}

// Create record
function createRecord(table, newRecord) {
  return new Promise((resolve, reject) => {
    supplementalBase(table).create(newRecord, (error, record) => {
      if (error) {
        return reject(error);
      }
      resolve(record);
    });
  });
}

// Get all data
function fetchAll(table) {
  return new Promise((resolve, reject) => {
    let all = [];

    supplementalBase(table).select({ }).eachPage((records, next) => {
      all = all.concat(_.map(records, 'fields'));
      next();
    }, (error) => {
      if (error) {
        return reject(error);
      }

      // Filter empty rows
      all = _.filter(all, (a) => {
        return a && !_.isEmpty(a);
      });

      resolve(all);
    });
  });
}

// Main export
module.exports = setup;
