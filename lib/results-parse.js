/**
 * Parse a row of data from the MN Secretary of State.
 */

// Dependencies
const _ = require('lodash');
const titlecase = require('titlecase');
const parseName = require('parse-full-name').parseFullName;
const common = require('./common.js');

// Main parsing function
function parse(row, config = {}) {
  // This is a ;-delimited row
  let parts = row.split(';');

  // Put together parts
  let d = {
    stateID: common.raw(parts[0]),
    countyID: common.raw(parts[1]),
    precinctID: common.raw(parts[2]),
    officeID: common.raw(parts[3]),
    officeRaw: common.raw(parts[4]),
    districtID: common.raw(parts[5]),
    candidateID: common.raw(parts[6]),
    candidateRaw: common.raw(parts[7]).replace('WRITE-IN**', 'WRITE-IN'),
    suffix: common.raw(parts[8]),
    incumbent: common.raw(parts[9]),
    party: common.raw(parts[10]),
    precincts: common.raw(parts[11], 'int'),
    totalPrecincts: common.raw(parts[12], 'int'),
    votes: common.raw(parts[13], 'int'),
    percent: common.raw(parts[14], 'float'),
    totalVotes: common.raw(parts[15], 'int')
  };

  // Add config informatio
  d.type = config.type;

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
  d.contestID = common.makeID(['id', d.stateID, d.countyID, d.precinctID, d.districtID, d.officeID]);
  d.entryID = common.makeID([d.contestID, d.candidateID]);

  return d;
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
parse.parseOffice = parseOffice;
parse.parseCandidate = parseCandidate;
module.exports = parse;
