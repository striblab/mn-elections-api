/**
 * Test lib/common-winner.js
 */

// Implicit depedences
/* global describe, test, expect */

// To help with testing
const _ = require('lodash');

// To test
const winner = require('../lib/common-winner.js');


// Main winner determination function
describe('lib/common-winner | main', () => {
  test('should leave contest with no seats alone', () => {
    expect(winner({
      seats: undefined,
      other: 'prop'
    })).toEqual({
      other: 'prop'
    });
  });

  test('should leave contest with no candidates alone', () => {
    expect(winner({
      seats: 1,
      candidates: [],
      other: 'prop'
    })).toEqual({
      seats: 1,
      candidates: [],
      other: 'prop'
    });
  });

  test('should leave contest that is called', () => {
    expect(winner({
      seats: 1,
      candidates: [],
      called: true
    })).toEqual({
      seats: 1,
      candidates: [],
      called: true
    });
  });

  test('should calculate winner for basic, finalcontest', () => {
    expect(winner({
      final: true,
      seats: 1,
      candidates: [
        { candidate: {}, votes: 60 },
        { candidate: {}, votes: 40 }
      ]
    })).toEqual({
      final: true,
      seats: 1,
      totalVotes: 100,
      candidates: [
        { candidate: {}, votes: 60, percent: 60, winner: true },
        { candidate: {}, votes: 40, percent: 40, winner: false }
      ]
    });
  });

  test('should calculate winner for basic, final, primary contest', () => {
    expect(winner({
      primary: true,
      final: true,
      seats: 1,
      candidates: [
        { candidate: {}, votes: 60, party: 'A' },
        { candidate: {}, votes: 40, party: 'A' },
        { candidate: {}, votes: 60, party: 'B' },
        { candidate: {}, votes: 40, party: 'B' },
      ]
    })).toEqual({
      primary: true,
      final: true,
      seats: 1,
      totalVotes: 200,
      candidates: [
        { candidate: {}, votes: 60, party: 'A', percent: 30, winner: true },
        { candidate: {}, votes: 40, party: 'A', percent: 20, winner: false },
        { candidate: {}, votes: 60, party: 'B', percent: 30, winner: true },
        { candidate: {}, votes: 40, party: 'B', percent: 20, winner: false }
      ]
    });
  });

  test('should calculate winner for primary but nonpartisan contest', () => {
    expect(winner({
      primary: true,
      nonpartisan: true,
      final: true,
      seats: 1,
      candidates: [
        { candidate: {}, votes: 80, party: 'NP' },
        { candidate: {}, votes: 40, party: 'NP' },
        { candidate: {}, votes: 40, party: 'NP' },
        { candidate: {}, votes: 40, party: 'NP' },
      ]
    })).toEqual({
      nonpartisan: true,
      primary: true,
      final: true,
      seats: 1,
      totalVotes: 200,
      candidates: [
        { candidate: {}, votes: 80, party: 'NP', percent: 40, winner: true },
        { candidate: {}, votes: 40, party: 'NP', percent: 20, winner: false },
        { candidate: {}, votes: 40, party: 'NP', percent: 20, winner: false },
        { candidate: {}, votes: 40, party: 'NP', percent: 20, winner: false }
      ]
    });
  });
});


// parseWinner
describe('lib/common-winner | parseWinner', () => {
  test('should not change non-final contest', () => {
    expect(winner.parseWinner([
      { candidate: {} }, { candidate: {} }
    ], {})).toEqual([
      { candidate: {}, winner: false }, { candidate: {}, winner: false }
    ]);
  });

  test('should not change called contest', () => {
    expect(winner.parseWinner([
      { winner: true, votes: 10 }, { winner: false, votes: 100 }
    ], {
      called: true
    })).toEqual([
      { winner: true, votes: 10 }, { winner: false, votes: 100 }
    ]);
  });

  test('should change non-called, wrong winners', () => {
    expect(winner.parseWinner([
      { candidate: {}, winner: true, votes: 10 }, { candidate: {}, winner: false, votes: 100 }
    ], {
      final: true,
      seats: 1
    })).toEqual([
      { candidate: {}, winner: true, votes: 100 }, { candidate: {}, winner: false, votes: 10 }
    ]);
  });

  test('should handle multiple seats', () => {
    expect(winner.parseWinner([
      { candidate: {}, votes: 10 },
      { candidate: {}, votes: 100 },
      { candidate: {}, votes: 50 }
    ], {
      final: true,
      seats: 2
    })).toEqual([
      { candidate: {}, votes: 100, winner: true },
      { candidate: {}, votes: 50, winner: true },
      { candidate: {}, votes: 10, winner: false }
    ]);
  });

  test('should ignore write-ins', () => {
    expect(winner.parseWinner([
      { candidate: { writeIn: true }, votes: 100 }
    ], {
      final: true,
      seats: 2
    })).toEqual([
      { candidate: { writeIn: true }, votes: 100, winner: false }
    ]);

    expect(winner.parseWinner([
      { candidate: {}, votes: 10 },
      { candidate: { writeIn: true }, votes: 100 },
      { candidate: {}, votes: 50 }
    ], {
      final: true,
      seats: 2
    })).toEqual([
      { candidate: { writeIn: true }, votes: 100, winner: false },
      { candidate: {}, votes: 50, winner: true },
      { candidate: {}, votes: 10, winner: false }
    ]);
  });

  test('should choose winner for ranked choice > 50', () => {
    expect(winner.parseWinner([
      { candidate: {}, votes: 51, percent: 51 },
      { candidate: {}, votes: 49, percent: 49 },
    ], {
      final: true,
      seats: 1,
      ranked: true
    })).toEqual([
      { candidate: {}, votes: 51, percent: 51, winner: true },
      { candidate: {}, votes: 49, percent: 49, winner: false },
    ]);
  });

  test('should not choose winner for ranked choice < 50', () => {
    expect(winner.parseWinner([
      { candidate: {}, votes: 42, percent: 42 },
      { candidate: {}, votes: 40, percent: 40 },
      { candidate: {}, votes: 18, percent: 18 },
    ], {
      final: true,
      seats: 1,
      ranked: true
    })).toEqual([
      { candidate: {}, votes: 42, percent: 42, winner: false },
      { candidate: {}, votes: 40, percent: 40, winner: false },
      { candidate: {}, votes: 18, percent: 18, winner: false },
    ]);
  });

  test('should handle tie', () => {
    expect(winner.parseWinner([
      { candidate: {}, votes: 50, percent: 50 },
      { candidate: {}, votes: 50, percent: 50 }
    ], {
      final: true,
      seats: 1,
    })).toEqual([
      { candidate: {}, votes: 50, percent: 50, winner: true },
      { candidate: {}, votes: 50, percent: 50, winner: true }
    ]);
  });
});


// calculateVotes function
describe('lib/common-winner | calculateVotes', () => {
  let example1 = {
    totalVotes: 100,
    candidates: [
      { votes: 60 },
      { votes: 40 }
    ]
  };

  test('should not change totalVotes if not supplemented', () => {
    expect(winner.calculateVotes(_.extend({}, example1, {})).totalVotes).toBe(100);
  });

  test('should change totalVotes if candidate supplemented', () => {
    expect(winner.calculateVotes(_.extend({}, example1, {
      totalVotes: 9,
      candidates: [
        { votes: 60 },
        { votes: 40, supplemented: true }
      ]
    })).totalVotes).toBe(100);
  });

  test('should change totalVotes if supplemented', () => {
    expect(winner.calculateVotes(_.extend({}, example1, {
      totalVotes: 110,
      supplemented: true
    })).totalVotes).toBe(100);
  });

  test('should update percents', () => {
    expect(winner.calculateVotes(_.extend({}, example1, {})).candidates).toEqual([
      { votes: 60, percent: 60.00 },
      { votes: 40, percent: 40.00 }
    ]);
  });

  test('should round percents', () => {
    expect(winner.calculateVotes({
      candidates: [
        { votes: 67 },
        { votes: 34 }
      ]}).candidates).toEqual([
        { votes: 67, percent: 66.34 },
        { votes: 34, percent: 33.66 }
      ]);
  });
});
