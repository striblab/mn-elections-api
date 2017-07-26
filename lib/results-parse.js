/**
 * Parse a row of data from the MN Secretary of State.
 */

// Dependencies
const _ = require('lodash');
const titlecase = require('titlecase');
const parseName = require('parse-full-name').parseFullName;
const common = require('./common.js');

// Main parsing function
function parse(row) {
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
}

// Handle raw value
function raw(input, type) {
  if (type === 'int') {
    return _.isNaN(parseInt(input, 10)) ? undefined : parseInt(input, 10);
  }
  else if (type === 'float') {
    return _.isNaN(parseFloat(input)) ? undefined : parseFloat(input);
  }
  else if (_.isString(input)) {
    return input ? input.trim() : undefined;
  }
  else if (_.isNil(input) || _.isNaN(input)) {
    return undefined;
  }

  return input;
}

// Make ID
function makeID(input) {
  if (_.isString(input)) {
    return _.kebabCase(input.toLowerCase().trim());
  }
  if (_.isNumber(input) && !_.isNaN(input)) {
    return input.toString();
  }
  else if (_.isArray(input) && input.length) {
    return _.map(input, (i) => {
      return _.isNaN(i) || _.isNil(i) || (_.isString(i) && i.trim() === '') ? '|' : i.toString().trim();
    }).join('-');
  }

  return undefined;
}

// Parse office, get area out
function parseOffice(input) {
  if (!_.isString(input)) {
    return undefined;
  }

  // Ranked choice translations
  let choiceTranslations = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'nineth': 9, 'tenth': 10, 'final': 100 };

  // Get main parts
  let m = input.match(/(^[^\(]+?)\s*(\([^\(]*\))?\s*(\([^\(]*\))?$/i);

  // Get parts that are not in parenthese and determine ranked choice
  // and compile office name.
  let parts = m[1].trim().replace(/\s+/g, ' ').split(' ');
  let ranked = !!parts[parts.length - 1].trim().match(/choice/i);
  let office = ranked ? parts.slice(0, -2).join(' ') : parts.join(' ');

  // Look to see if there is an elected part (this could be more efficient)
  let area = undefined;
  let seats = 1;
  if (m[2] && m[2].match(/elect ([0-9]+)/i)) {
    seats = parseInt(m[2].match(/elect ([0-9]+)/i)[1], 10);
    area = m[3];
  }
  else if (m[3] && m[3].match(/elect ([0-9]+)/i)) {
    seats = parseInt(m[3].match(/elect ([0-9]+)/i)[1], 10);
    area = m[2];
  }
  else {
    area = m[2] || m[3] || null;
  }

  return {
    office: titlecase(office.toLowerCase()),
    area: area ? area.replace('(', '').replace(')', '') : undefined,
    seats: seats,
    question: !!input.match(/.*question.*/i),
    ranked: ranked,
    rankedChoice: ranked ? choiceTranslations[parts[parts.length - 2].toLowerCase()] : undefined
  };
}

// Parse candidate name into parts
function parseCandidate(input, suffix) {
  if (!_.isString(input)) {
    return { error: ['Input not a string'] };
  }
  if (input.match(/write(-| )*in.*/i)) {
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

  // Style
  p = common.styleName(p);

  return p;
}

// Exports.  Mostly adding functions for testing
parse.raw = raw;
parse.makeID = makeID;
parse.parseOffice = parseOffice;
parse.parseCandidate = parseCandidate;
module.exports = parse;
