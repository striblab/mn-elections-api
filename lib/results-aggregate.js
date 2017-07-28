/**
 * Aggregate data (by contest)
 */

// Dependencies
const _ = require('lodash');
const moment = require('moment');

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
        p.votes = final ? final.votes : undefined;
        p.percent = final ? final.percent : undefined;

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

  // Add some metadata
  return _.map(grouped, (g) => {
    // Uncontested
    g.uncontested = _.filter(g.candidates, (c) => {
      return !c.candidate.writeIn;
    }).length === 1;

    // Updated
    g.updated = moment().unix();

    // Final, if there is no precints for some reason, then be conservative
    g.final = g.totalPrecincts ? g.totalPrecincts === g.precincts : undefined;

    // Called
    g.called = _.isBoolean(g.called) ? g.called : false;

    // Determine partisanship
    g.nonpartisan = !_.find(g.candidates, (c) => {
      return c.party && c.party.match(/^(np|wi)$/);
    });

    return g;
  });
};
