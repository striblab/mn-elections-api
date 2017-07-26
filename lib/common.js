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
  i.title = i.title ? i.title.replace(/(mrs|miss|ms|mr)\.?/i, '') : i.title;

  return i;
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

// Export
module.exports = {
  styleName: styleName,
  renderName: renderName,
  renderSortName: renderSortName
};
