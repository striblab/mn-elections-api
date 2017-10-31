/**
 * Add test data to contests.
 */

// Dependencies
const _ = require('lodash');
const debug = require('debug')('mn-elections-api:test-data');

// Main function to alter contests
function alterContests(contests, options = {}) {
  debug(
    'Altering ' +
      contests.length +
      ' contests with a ' +
      options.timeline +
      ' timeline.'
  );

  // Options for timeline are 'zero', 'early', 'middle', 'end'
  options.timeline = options.timeline || 'middle';
  // Whether to overwrite non-zero votes
  options.overwrite = _.isBoolean(options.overwrite)
    ? options.overwrite
    : false;
  // Ranges
  options.votes = options.votes || [100, 1000000];

  // Go through each contest
  _.each(contests, c => {
    // Check for votes
    let hasVotes = !!_.find(c.candidates, a => {
      return a.get('votes');
    });

    // Check overwrite
    if (!options.overwrite && hasVotes) {
      return;
    }

    // update reporting
    let reportingRange =
      options.timeline === 'end'
        ? [0.9, 1]
        : options.timeline === 'zero'
          ? [0, 0]
          : options.timeline === 'middle' ? [0.2, 1] : [0, 0.5];
    let reporting =
      Math.random() * (reportingRange[1] - reportingRange[0]) +
      reportingRange[0];
    c.set('precincts', Math.round(c.get('totalPrecincts') * reporting));

    // If no reporting, then no need to update votes
    if (!c.get('precincts')) {
      return;
    }

    // Make a total number of votes
    let totalVotes = Math.round(
      Math.random() * (options.votes[1] - options.votes[0]) + options.votes[0]
    );

    // If not ranked, or ranked and full reporting
    if (!c.get('ranked') || (c.get('final') && c.get('ranked'))) {
      // Update candidates.  Do a bit of a shimmy to set the write-in to the
      // lowest
      let distribution = _.sortBy(percentageSet(c.candidates.length));
      c.candidates = _.sortBy(c.candidates, a => {
        return a.get('writeIn') ? -0.0001 : Math.random();
      });
      _.each(c.candidates, (a, ai) => {
        a.set('votes', Math.round(distribution[ai] * totalVotes));
        a.set('percent', a.get('votes') / totalVotes * 100);
      });
    }

    // If ranked, add some ranked data
    if (c.get('ranked')) {
      [0, 1, 2].forEach(i => {
        let distribution = _.sortBy(percentageSet(c.candidates.length));
        _.each(c.candidates, (a, ai) => {
          a.get('ranks')[i].votes = Math.round(distribution[ai] * totalVotes);
          a.get('ranks')[i].percent =
            a.get('ranks')[i].votes / totalVotes * 100;
        });
      });
    }

    // Update winners
    c.updateWinners();
  });
}

// Make a set of percentages
function percentageSet(count) {
  let set = _.map(_.range(count), () => {
    return Math.random();
  });
  let sum = _.sum(set);
  return _.map(set, s => {
    return s / sum;
  });
}

// Export
module.exports = alterContests;
