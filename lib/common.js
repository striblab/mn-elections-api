/**
 * Utility/common functions
 */

// Dependencies
const _ = require('lodash');

// Fix/correct name
function styleName(input) {
  if (!_.isObject(input) || _.isArray(input)) {
    return input;
  }

  let i = _.clone(input);

  // Middle intial
  i.middle = i.middle ? i.middle.replace(/^([a-z])$/i, '$1.') : i.middle;

  // Ensure suffix has period
  i.suffix = i.suffix ? i.suffix.replace(/(jr|sr)\.?/i, '$1.') : i.suffix;

  // Do not use personal titles
  i.title = i.title ? i.title.replace(/(mrs|miss|ms|mr)\.?/i, '') || undefined : i.title;

  return i;
}

// Style district/area name
function styleArea(input) {
  if (!_.isString(input)) {
    return input;
  }

  // Various formatting
  input = input.replace(/(^|[^a-zA-Z0-9])(st|saint|st\.)\s/i, '$1St. ');
  input = input.replace(/(^|[^a-zA-Z0-9])(isd)\s/i, '$1ISD ');

  // Multiple spaces
  input.replace(/\s+/g, ' ');

  return input.trim();
}

// Put together a name from a name object.
function renderName(input) {
  if (_.isString(input)) {
    return input;
  }
  else if (!_.isObject(input) || _.isArray(input)) {
    return '';
  }
  else if (input.writeIn) {
    return 'Write-in';
  }

  return _.filter([input.title, input.prefix, input.first, input.middle,
    input.nick ? '"' + input.nick + '"' : null,
    input.last, input.suffix]).join(' ');
}

// Put together a name from a name object.
function renderSortName(input) {
  let heavy = 'zzzzz';

  if (_.isString(input)) {
    return input;
  }
  else if (!_.isObject(input) || _.isArray(input)) {
    return heavy;
  }
  else if (input.writeIn) {
    return heavy;
  }
  else if (input.sort) {
    return input.sort;
  }
  else if (!input.last && !input.first && !input.middle) {
    return heavy;
  }

  return _.filter([input.last, input.first, input.middle]).join(' ');
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

// Wrapper to handle undefined values
function padLeft(input, padding, char = '0') {
  return input || _.isNumber(input) ? _.padStart(input, padding, char) : undefined;
}

// Make contest ID
function makeContestID(contest) {
  return makeID([contest.type, contest.countyID, contest.districtID, contest.officeID]);
}

// Make entry ID
function makeEntryID(contest, candidate) {
  return makeID([contest.type, contest.countyID, contest.districtID, candidate.candidateID]);
}


// Export
module.exports = {
  raw: raw,
  makeID: makeID,
  makeContestID: makeContestID,
  makeEntryID: makeEntryID,
  styleArea: styleArea,
  styleName: styleName,
  renderName: renderName,
  renderSortName: renderSortName,
  padLeft: padLeft
};
