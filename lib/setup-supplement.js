/**
 * Add results and candidate data to supplemental source
 */

// Dependencies
require('dotenv').load();
const fs = require('fs');
const _ = require('lodash');
const airtable = require('airtable');
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
let supplementalBase = airtable.base(process.env.AIRTABLE_BASE_ID);

// Main function
function setup(source) {
  source = source || 'export/results-all.json';

  // Read source from file
  if (_.isString(source)) {
    source = JSON.parse(fs.readFileSync(source, 'utf-8'));
  }

  // Return promise
  return new Promise((resolve, reject) => {

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
