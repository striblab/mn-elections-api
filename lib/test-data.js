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

  // Options for timeline are 'early', 'middle', 'end'
  options.timeline = 'middle';
  // Whether to overwrite non-zero votes
  options.overwrite = true;
  // Ranges
  options.votes = [100, 4000000];

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
    console.log(totalVotes);

    // Update candidates
    let distribution = percentageSet(c.candidates.length);
    _.each(c.candidates, (a, ai) => {
      a.set('votes', distribution[ai] * totalVotes);
    });

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
