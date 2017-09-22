/**
 * Utility/common functions
 */

// Dependencies
const _ = require('lodash');
const titlecase = require('titlecase');

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
  else if (_.isNumber(input) && !_.isNaN(input)) {
    return input.toString();
  }
  else if (_.isArray(input) && input.length) {
    return _.map(input, i => {
      return _.isNaN(i) || _.isNil(i) || (_.isString(i) && i.trim() === '')
        ? '|'
        : _.kebabCase(i.toString().trim()).toLowerCase();
    }).join('-');
  }

  return undefined;
}

// Make url/file system safe
function urlSafe(input) {
  if ((_.isString(input) || _.isNumber(input)) && !_.isNaN(input)) {
    return input
      .toString()
      .trim()
      .replace(/[^0-9a-z-]/gi, '');
  }

  return undefined;
}

// Wrapper to handle undefined values
function padLeft(input, padding, char = '0') {
  return input || _.isNumber(input)
    ? _.padStart(input, padding, char)
    : undefined;
}

// Wrapper around titlecase to make better
function titleCase(input) {
  if (!_.isString(input)) {
    return input;
  }

  return titlecase(
    input.toLowerCase()
  ).replace(
    /(^|\s)(isd|i|ii|iii|iv|v|vi|[0-9]+[a-z])($|\s)/i,
    (m, p1, p2, p3) => {
      return p1 + p2.toUpperCase() + p3;
    }
  );
}

// Format number with commas
// https://stackoverflow.com/questions/5731193/how-to-format-numbers-using-javascript
function formatNumber(number, places = 2) {
  number = number.toFixed(places) + '';
  let x = number.split('.');
  let x1 = x[0];
  let x2 = x.length > 1 ? '.' + x[1] : '';
  let rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
}

// Export
module.exports = {
  raw: raw,
  makeID: makeID,
  urlSafe: urlSafe,
  padLeft: padLeft,
  titleCase: titleCase,
  formatNumber: formatNumber
};
