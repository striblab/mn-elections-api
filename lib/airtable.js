/**
 * Some added functionality for AirTable
 */

// Dependencies
const airtable = require('airtable');
const _ = require('lodash');


// Promisify create record
function createRecord(base, table, newRecord) {
  return new Promise((resolve, reject) => {
    // There are API limits, "The API is limited to 5 requests per second."
    setTimeout(() => {
      base(table).create(newRecord, (error, record) => {
        if (error) {
          return reject(error);
        }
        resolve(record);
      });
    }, 250);
  });
}

// Get all data
function fetchAll(base, table) {
  return new Promise((resolve, reject) => {
    let all = [];

    base(table).select({ }).eachPage((records, next) => {
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

// Export
module.exports = (base) => {
  let b = airtable.base(base);

  b.createRecord = _.bind((...args) => {
    return createRecord(b, ...args);
  }, b);
  b.fetchAll = _.bind((...args) => {
    return fetchAll(b, ...args);
  }, b);

  return b;
};
