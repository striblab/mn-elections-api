/**
 * Fetch meta data from SoS.
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const fetch = require('./common-fetch.js');
const parser = require('./meta-parse.js');
//const debug = require('debug')('mn-elections-api:meta-fetch');

// Main fetch function
async function fetchMeta(election, options = {}) {
  // Setup options and paths
  options.exportPath = options.exportPath || path.join(__dirname, '..', 'export');
  options.exportMeta = path.join(options.exportPath, 'meta');
  mkdirp.sync(options.exportMeta);

  // Compile files
  let files = _.reduce(election.meta, (total, set, si) => {
    return total.concat(_.map(set, (s) => {
      s.local = path.join(options.exportMeta, 'sources');
      s.set = si;
      return s;
    }));
  }, []);

  // Fetch district data
  let rows = await fetch(election.sos, files, parser);

  // Regroup by set
  let grouped = _.groupBy(rows, 'set');

  // Output
  fs.writeFileSync(path.join(options.exportMeta, 'meta-all.json'), JSON.stringify(grouped));
  _.each(grouped, (group, file) => {
    fs.writeFileSync(path.join(options.exportMeta, 'meta-' + file + '.json'), JSON.stringify(group));
  });
}

// Export
module.exports = fetchMeta;
