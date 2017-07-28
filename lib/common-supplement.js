/**
 * Some common functions for working with the supplemental data
 * i.e. AirTable
 */

// Dependencies
const _ = require('lodash');


// Promisify create record
function createRecord(base, table, newRecord) {
  return new Promise((resolve, reject) => {
    base(table).create(newRecord, (error, record) => {
      if (error) {
        return reject(error);
      }
      resolve(record);
    });
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
module.exports = {
  createRecord: createRecord,
  fetchAll: fetchAll
};
