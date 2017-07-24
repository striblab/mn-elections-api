/**
 * Parse a row of data from the MN Secretary of State.
 */

// Dependencies
const _ = require('lodash');
const titlecase = require('titlecase');
const parseName = require('parse-full-name').parseFullName;

// Main parsing function
module.exports = (row) => {
  // This is a ;-delimited row
  let parts = row.split(';');

  // Put together parts
  let d = {
    stateID: raw(parts[0]),
    countyID: raw(parts[1]),
    precinctID: raw(parts[2]),
    officeID: raw(parts[3]),
    officeRaw: raw(parts[4]),
    districtID: raw(parts[5]),
    candidateID: raw(parts[6]),
    candidateRaw: raw(parts[7]).replace('WRITE-IN**', 'WRITE-IN'),
    suffix: raw(parts[8]),
    incumbent: raw(parts[9]),
    party: raw(parts[10]),
    precincts: raw(parts[11], 'int'),
    totalPrecincts: raw(parts[12], 'int'),
    votes: raw(parts[13], 'int'),
    percent: raw(parts[14], 'float'),
    totalVotes: raw(parts[15], 'int')
  };

  // Parse candidates names
  d.candidate = parseCandidate(d.candidateRaw, d.suffix);

  // Parse/format office
  let o = parseOffice(d.officeRaw);
  if (o) {
    d.office = o.office;
    d.area = o.area;
    d.seats = o.seats;
    d.question = o.question;
    d.ranked = o.ranked;
    d.rankedChoice = o.rankedChoice;
  }

  // SoS assigns a different officeID for
  // each choice, so update to the same one
  if (d.ranked) {
    d.officeID = d.officeID.replace(/.$/, '1');
  }

  // Make IDs
  d.contestID = makeID(['id', d.stateID, d.countyID, d.precinctID, d.districtID, d.officeID]);
  d.entryID = makeID([d.contestID, d.candidateID]);

  return d;
};

// Handle raw value
function raw(input, type) {
  if (type === 'int') {
    return _.isNaN(parseInt(input, 10)) ? null : parseInt(input, 10);
  }
  else if (type === 'float') {
    return _.isNaN(parseFloat(input)) ? null : parseFloat(input);
  }
  else if (_.isString(input)) {
    return input ? input.trim() : null;
  }
  else if (_.isNil(input)) {
    return null;
  }
  else if (_.isFunction(input.toString)) {
    return input.toString();
  }

  return input;
}

// Make ID
function makeID(input) {
  if (_.isString(input)) {
    return _.kebabCase(input);
  }
  else if (_.isArray(input)) {
    return _.map(input, (i) => {
      return _.isNil(i) ? '|' : i;
    }).join('-');
  }

  return input;
}

// Parse office, get area out
function parseOffice(input) {
  if (!_.isString(input)) {
    return null;
  }

  let choiceTranslations = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'nineth': 9, 'tenth': 10, 'final': 100 };
  let m = input.match(/(^[^\(]+?)\s*(\([^\(]*\))?\s*(\(elect ([0-9]+)\))?$/i);
  let parts = m[1].trim().replace(/\s+/g, ' ').split(' ');
  let ranked = !!parts[parts.length - 1].trim().match(/choice/i);
  let office = ranked ? parts.slice(0, -2).join(' ') : parts.join(' ');

  return {
    office: titlecase(office.toLowerCase()),
    area: m[2].trim().replace('(', '').replace(')', ''),
    seats: m[4] ? parseInt(m[4], 10) : 1,
    question: !!input.match(/.*question.*/i),
    ranked: ranked,
    rankedChoice: ranked ? choiceTranslations[parts[parts.length - 2].toLowerCase()] : null
  };
}

// Parse candidate name into parts
function parseCandidate(input, suffix) {
  if (!_.isString(input)) {
    return { error: ['Input not a string'] };
  }
  if (input.match(/write-in.*/i)) {
    return { writeIn: true };
  }

  // Parse
  let p = parseName(input);

  // Suffix doesn't actually come through in the data, but
  // just in case
  p.suffix = p.suffix || suffix;

  // TODO: Cleanup with regards to Star Tribune styles

  // Clean up errors
  if (p.error && p.error.length === 0) {
    delete p.error;
  }
  // Cleanup empty
  _.each(p, (v, k) => {
    if (!v) {
      delete p[k];
    }
  });

  return p;
}
