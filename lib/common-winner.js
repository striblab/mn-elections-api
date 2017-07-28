/**
 * Logic around determine winner(s)
 */

// Depedencies
const _ = require('lodash');
const common = require('./common.js');
const debug = require('debug')('mn-elections-api:common-winner');

// Main function to determine winners.  Alters contest object
// in place.
function winners(contest) {
  // Some top level checks
  if (!contest.seats) {
    debug('Seats property not available for contest: ', contest.contestID);
    return contest;
  }
  if (!contest.candidates || !contest.candidates.length) {
    debug('No candidates present for contest: ', contest.contestID);
    return contest;
  }

  // Calculate votes and percentages
  contest = calculateVotes(contest);

  // Sort candidates
  contest.candidates = _.orderBy(contest.candidates, [
    (c) => { return c.votes; },
    (c) => { return common.renderSortName(c.candidate); }
  ], ['desc', 'asc']);

  // If called, make sure there is a winner, as called should be a
  // manual process.
  if (contest.called) {
    if (!_.find(contest.candidates, 'winner')) {
      debug('Contest is called but no winner is present: ', contest.contestID);
    }

    return contest;
  }

  // Uncontested and not final
  if (contest.uncontested && !contest.final) {
    // TODO!
  }

  // Not primary or non-partisan
  if (!contest.primary || contest.nonpartisan) {
    contest.candidates = parseWinner(contest.candidates, contest);
  }
  else {
    // Break into parties.  In theory there should be no partisan parties (NP)
    contest.candidates = _.flatten(_.map(_.groupBy(contest.candidates, 'party'), (candidates) => {
      return parseWinner(candidates, contest);
    }));
  }

  // TODO: Handle primary.

  return contest;
}

// Parse winners from a set of candidates.  No write-ins
// should be winners
function parseWinner(candidates, contest) {
  // Doube check called
  if (contest.called) {
    return candidates;
  }

  // Sort in case
  candidates = _.orderBy(candidates, [
    (c) => { return c.votes; },
    (c) => { return common.renderSortName(c.candidate); }
  ], ['desc', 'asc']);

  // Go through canidates
  candidates = _.map(candidates, (c, ci) => {
    // For ranked choice voting.
    // The SoS data is only the number of votes in each place,
    // This makes it impossible to know the winner, as all ballots
    // are needed for that.  Except if someone has more than 50%.
    // (If more than 1 seat, we can't say either)
    if (contest.ranked && contest.final && !c.candidate.writeIn &&
      contest.seats === 1 && ci === 0 && c.percent > 50) {
      c.winner = true;
    }
    // Otherwise, if not ranked, and final, mark the seats
    else if (!contest.ranked && contest.final && !c.candidate.writeIn && ci < contest.seats) {
      c.winner = true;
    }
    else {
      c.winner = false;
    }

    return c;
  });

  // Check for possible ties
  let winningVotes = _.map(_.filter(candidates, 'winner'), 'votes');
  _.each(_.reject(candidates, 'winner'), (c) => {
    c.winner =  !c.candidate.writeIn && ~winningVotes.indexOf(c.votes) ? true : c.winner;
  });

  return candidates;
}

// Calculate votes, specifically because manually enetered data is
// by vote only.
function calculateVotes(contest) {
  let total = _.sumBy(contest.candidates, 'votes');
  let supplemented = contest.supplemented || _.find(contest.candidates, { supplemented: true });

  // Update total votes if supplemented
  contest.totalVotes = supplemented ? total :
    contest.totalVotes || total || undefined;

  // Calculate percentage
  contest.candidates = _.map(contest.candidates, (c) => {
    if (c.votes && contest.totalVotes) {
      c.percent = Math.round((c.votes / contest.totalVotes) * 10000) / 100;
    }

    return c;
  });

  return contest;
}


// Export, add more for testing
winners.calculateVotes = calculateVotes;
winners.parseWinner = parseWinner;
module.exports = winners;
