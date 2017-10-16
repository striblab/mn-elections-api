/**
 * Export contests to print
 */

// Dependencies
const _ = require('lodash');
const utility = require('./utility.js');
const debug = require('debug')('mn-elections-api:print');

// Print line tags
const tags = {
  heading1: '@Head1:',
  heading2: '@Elex_Head1:',
  heading3: '@Elex_Head2:',
  heading4: '@Elex_Head_Sub_Bold:',
  meta: '@Elex_Precinct:',
  note: '@Elex_Text_Question:',
  candidate: '@Elex_Text_2tabsPlusPct:',
  ranked: '@Elex_Text_RCV_3choice:',
  ranked6: '@Elex_Text_RCV_6choice:',
  question: '@Elex_Text_Question:',
  space: ''
};

// Main function, takes array of contests
function toPrint(contests, section) {
  debug('Print section: ', section.title, contests.length);
  if (!contests.length) {
    return;
  }

  // Get simple objects
  contests = _.map(contests, c => {
    return _.isPlainObject(c) ? c : c.toJSON();
  });

  // Default headings
  let defaultHeadings = ['area', 'name', 'subArea'];

  // Place to compile lines
  let lines = [];

  // Title
  lines.push(tags.heading1 + section.title);

  // Go through each contest
  let previous = null;
  _.each(contests, c => {
    // Determine what headings we need to display
    let higherHeadingChanged = false;
    _.each(section.headings || defaultHeadings, (h, hi) => {
      if (h) {
        // If heading changed or no previous or high heading changed
        if (
          (higherHeadingChanged || !previous || previous[h] !== c[h]) &&
          c[h]
        ) {
          // Name should be combined with seatName
          let value =
            h === 'name' ? c[h] + (c.seatName ? ' ' + c.seatName : '') : c[h];

          // Don't output question, as it gets inlined with question text
          if (!(h === 'name' && c.question)) {
            lines.push(tags['heading' + (hi + 2)] + value);
          }

          higherHeadingChanged = true;
        }
      }
    });

    // Note if no candidates (besides write-ins)
    if (c.candidates.length <= 1) {
      lines.push(tags.note + 'No candidates running in this contest.');
      previous = c;
      return;
    }

    // Meta
    if (c.seats > 1) {
      lines.push(tags.meta + 'Open seats: ' + c.seats);
    }

    // Question text
    if (c.questionText) {
      lines.push(
        tags.question +
          c.name +
          (c.seatName ? ' ' + c.seatName : '') +
          ': ' +
          c.questionText.replace(/\s+/gm, ' ')
      );
    }

    // Precincts
    lines.push(
      tags.meta +
        (c.precincts || 0) +
        ' of ' +
        c.totalPrecincts +
        ' precincts (' +
        Math.round(c.precincts / c.totalPrecincts * 100) +
        '%)'
    );

    // Candidates
    _.each(c.candidates, (candidate, ci) => {
      if (candidate.writeIn) {
        return;
      }

      if (c.ranked) {
        lines.push(
          tags.ranked +
            (candidate.winner ? '<saxo:ch value="226 136 154"/>' : ' ') +
            '\t' +
            display(candidate) +
            (candidate.incumbent ? ' (i)' : '') +
            '\t' +
            (candidate.ranks[0].votes
              ? utility.formatNumber(candidate.ranks[0].votes, 0)
              : 0) +
            '\t' +
            (candidate.ranks[0].percent
              ? Math.round(candidate.ranks[0].percent)
              : '0') +
            '\t' +
            (candidate.ranks[1].votes
              ? utility.formatNumber(candidate.ranks[1].votes, 0)
              : 0) +
            '\t' +
            (candidate.ranks[1].percent
              ? Math.round(candidate.ranks[1].percent)
              : '0') +
            '\t' +
            (candidate.ranks[2].votes
              ? utility.formatNumber(candidate.ranks[2].votes, 0)
              : 0) +
            '\t' +
            (candidate.ranks[2].percent
              ? Math.round(candidate.ranks[2].percent)
              : '0')
        );
      }
      else {
        lines.push(
          tags.candidate +
            (candidate.winner ? '<saxo:ch value="226 136 154"/>' : ' ') +
            '\t' +
            display(candidate) +
            (candidate.incumbent ? ' (i)' : '') +
            '\t' +
            (candidate.votes ? utility.formatNumber(candidate.votes, 0) : 0) +
            '\t' +
            (candidate.percent ? Math.round(candidate.percent) : '0') +
            (ci === 0 ? '%' : '')
        );
      }
    });

    previous = c;
  });

  // Output text
  return _.flatten(lines).join('\r\n');
}

// Display name for candidate
function display(candidate) {
  return _.filter([
    candidate.title,
    candidate.prefix,
    candidate.first,
    candidate.middle,
    candidate.nick ? '"' + candidate.nick + '"' : null,
    candidate.last,
    candidate.suffix
  ]).join(' ');
}

// Export
module.exports = toPrint;
