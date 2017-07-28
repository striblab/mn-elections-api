/**
 * Add results and candidate data to supplemental source
 */

// Dependencies
require('dotenv').load();
const fs = require('fs');
const _ = require('lodash');
const airtable = require('airtable');
const common = require('./common.js');
const supplement = require('./common-supplement.js');
const config = require('./config-supplement.js');
const debug = require('debug')('mn-elections-api:setup-supplement');

// Check for Airtable API key
if (!process.env.AIRTABLE_API_KEY) {
  throw new Error('AIRTABLE_API_KEY environment variable not found.');
}
if (!process.env.AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_BASE_ID environment variable not found.');
}

// We will use this often
let base = airtable.base(process.env.AIRTABLE_BASE_ID);

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
  let current = await supplement.fetchAll(base, config.tables.results);
  //let contests = await fetchAll(config.tables.contests);

  // Go through contests and candidates
  for (let r of results) {
    for (let c of r.candidates) {
      // Only create record if not there already
      if (!_.find(current, { 'Candidate ID': c.entryID })) {
        await supplement.createRecord(base, config.tables.results, {
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
  let current = await supplement.fetchAll(base, config.tables.contests);

  // Go through
  for (let r of results) {
    // Only create record if not there already
    if (!_.find(current, { 'Contest ID': r.contestID })) {
      await supplement.createRecord(base, config.tables.contests, {
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

// Main export
module.exports = setup;
