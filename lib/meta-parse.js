/**
 * Main parsing to deal with meta parsing.
 */

// Dependencies
const titlecase = require('titlecase');
const common = require('./common.js');


// Main parser
function parser(row, options) {
  row = row.split(';');

  // Districts
  if (options.set === 'districts') {
    return parseDistricts(row, options);
  }
  else if (options.set === 'questions') {
    return parseQuestions(row, options);
  }

  return row;
}

// Parse questions
function parseQuestions(row, options) {
  let parsed = {
    set: options.set,
    type: options.type
  };

  parsed.countyID = common.padLeft(common.raw(row[0]), 2),
  parsed.officeID = common.padLeft(common.raw(row[1]), 4),
  parsed.localID = common.padLeft(common.raw(row[2]), 5);
  parsed.schoolID = common.padLeft(common.raw(row[3]), 4);
  // Question number, though it is actually the description "office"
  parsed.officeRaw = common.raw(row[4]);
  parsed.questionTitle = titlecase(common.raw(row[5])
    .replace(/[^\w\s]/g, ' ').toLowerCase());
  parsed.questionText = common.raw(row[6])
    .replace(/\s{4,}/g, ' \n\n');

  // Attempt to make contest ID
  parsed.questionID = common.makeID(['question', parsed.countyID,
    parsed.localID, parsed.schoolID, parsed.officeID]);

  return parsed;
}

// Parse district
function parseDistricts(row, options) {
  let parsed = {
    set: options.set,
    type: options.type
  };

  // For some reference
  // http://electionresults.sos.state.mn.us/Select/DownloadFileFormats/6
  if (options.type === 'county') {
    parsed.countyID = common.padLeft(common.raw(row[0]), 2),
    parsed.name = common.styleArea(common.raw(row[1])),
    parsed.precincts = common.raw(row[2], 'int');

    parsed.id = common.makeID([options.type, parsed.countyID]);
  }
  else if (options.type === 'school') {
    parsed.schoolID = common.padLeft(common.raw(row[0]), 4),
    parsed.name = common.styleArea(titlecase(common.raw(row[1]).toLowerCase()))
      .replace(/(area school district|school district)/i, '').trim(),
    parsed.countyID = common.padLeft(common.raw(row[2]), 2),
    parsed.countyName = common.styleArea(common.raw(row[3]));

    parsed.id = common.makeID([options.type, parsed.schoolID]);
  }
  else if (options.type === 'local') {
    parsed.countyID = common.padLeft(common.raw(row[0]), 2),
    parsed.countyName = common.styleArea(common.raw(row[1])),
    // FIPS code
    parsed.localID = common.padLeft(common.raw(row[2]), 5);
    parsed.name = common.styleArea(titlecase(common.raw(row[3]).toLowerCase()));

    parsed.id = common.makeID([options.type, parsed.localID]);
  }
  else if (options.type === 'precinct') {
    parsed.countyID = common.padLeft(common.raw(row[0]), 2),
    parsed.precinctID = common.padLeft(common.raw(row[1]), 4),
    parsed.name = common.styleArea(titlecase(common.raw(row[2]).toLowerCase()));
    parsed.congressID = common.raw(row[3]);
    parsed.mnHouseID = common.padLeft(common.raw(row[4]), 3);
    parsed.countyCommID = common.padLeft(common.raw(row[5]), 2);
    parsed.judicialID = common.padLeft(common.raw(row[6]), 2);
    parsed.soilWaterID = common.padLeft(common.raw(row[7]), 4);
    // FIPS code
    parsed.localID = common.padLeft(common.raw(row[8]), 5);
    parsed.schoolID = common.padLeft(common.raw(row[9]), 4),

    parsed.mnSenateID = parsed.mnHouseID ? parsed.mnHouseID.replace(/[a-z]+/, '') : undefined;
    // Princt code is unique to county
    parsed.id = common.makeID([
      parsed.schoolID ? options.type + '-school' : options.type,
      parsed.schoolID ? parsed.schoolID : parsed.countyID,
      parsed.precinctID]);
  }

  return parsed;
}


// Export
module.exports = parser;
