/**
 * Aggregate data (by contest)
 */

// Dependencies
const _ = require('lodash');
const moment = require('moment');
const common = require('./common.js');

// Main export function
module.exports = (data) => {
  let grouped = {};

  // Go through each row and group data
  _.each(data, (d) => {
    grouped[d.contestID] = grouped[d.contestID] || {};
    let contest = grouped[d.contestID];

    // Contest-level data
    ['contestID', 'stateID', 'countyID', 'precinctID', 'officeID', 'districtID',
      'precincts', 'totalPrecincts', 'totalVotes', 'office', 'area', 'seats',
      'question', 'ranked'].forEach((f) => {
        contest[f] = d[f];
      });

    // Candidate level data (note totalVotes is included here for ranked choice)
    contest.candidates = contest.candidates || [];
    contest.candidates.push(_.pick(d, ['entryID', 'candidate', 'candidateID', 'incumbent', 'party', 'votes', 'percent', 'rankedChoice', 'totalVotes']));
  });

  // Oh, ranked choice
  _.each(grouped, (g) => {
    if (g.ranked) {
      // Group by each candidate
      let candidates = _.groupBy(g.candidates, 'entryID');
      g.candidates = _.map(candidates, (c) => {
        // Get the candidate level data
        let p = _.pick(c[0], ['entryID', 'candidateID', 'incumbent', 'party', 'candidate']);

        // 100 is the code for the final
        let choices = _.filter(c, (i) => {
          return i.rankedChoice !== 100;
        });
        let final = _.find(c, { rankedChoice: 100 });

        // Determine how many choices there are in total.  This is a
        // race-level value
        g.maxChoice = _.maxBy(choices, 'rankedChoice').rankedChoice;

        // Ranked choice total votes should come from the first round
        g.totalVotes = _.find(c, { rankedChoice: 1 }).totalVotes;

        // Mark final
        p.votes = final ? final.votes : null;
        p.percent = final ? final.percent : null;

        // Rank results
        p.ranks = _.map(c, (i) => {
          return _.pick(i, ['votes', 'percent', 'rankedChoice', 'totalVotes']);
        });

        return p;
      });
    }
    else {
      g.candidates = _.map(g.candidates, (c) => {
        return _.omit(c, 'totalVotes');
      });
    }
  });

  // Sort candidates
  _.each(grouped, (g) => {
    g.candidates = _.orderBy(g.candidates, [
      (c) => { return c.votes; },
      (c) => { return common.renderSortName(c.candidate); }
    ], ['desc', 'asc']);
  });

  // Determine winner(s) and add some metadata
  _.each(grouped, (g) => {
    // Uncontested
    g.uncontested = _.filter(g.candidates, (c) => {
      return !c.candidate.writeIn;
    }).length === 1;

    // Updated
    g.updated = moment().unix();

    // Final
    g.final = g.totalPrecincts === g.precincts;

    // Called
    g.called = _.isBoolean(g.called) ? g.called : false;

    // Mark winner(s).  We know that canidates will be orderd by
    // highest votes
    g.candidates = _.map(g.candidates, (c, ci) => {
      // The SoS data is only the number of votes in each place,
      // This makes it impossible to know the winner, as all ballots
      // are needed for that.  Except if someone has more than 50%.
      // (If more than 1 seat, we can't say either)
      if (g.ranked && g.final && !g.called && g.seats === 1 && ci === 0 && c.percent > 50) {
        c.winner = true;
      }
      // Otherwise, if not ranked, and final, mark the seats
      else if (!g.ranked && g.final && !g.called && ci < g.seats) {
        c.winner = true;
      }
      // TODO: Policy on calling uncontested
      // TODO: Handle primary
      else {
        c.winner = _.isBoolean(c.winner) ? c.winner : false;
      }

      return c;
    });

    // If called, just make sure there is winner info
    if (g.called) {
      g.candidates = _.map(g.candidates, (c) => {
        c.winner = _.isBoolean(c.winner) ? c.winner : false;
        return c;
      });
    }
  });

  return grouped;
};
