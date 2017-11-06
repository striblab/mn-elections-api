/**
 * Test Candidate class
 */

// Implicit depedences
/* global describe, test, expect */

// Utility
const _ = require('lodash');

// To test
const Contest = require('../lib/contest.js');

// Mocks
const mockE = (o = {}) => {
  return {
    get: t => o[t]
  };
};

// Get function
describe('lib/contest | constructor', () => {
  let contest = (...args) => {
    return new Contest(...args);
  };
  let shouldThrow = (...args) => {
    return () => {
      return contest(...args);
    };
  };

  test('throw error for bad input', () => {
    expect(shouldThrow(1, undefined, { noValidate: true }, mockE())).toThrow(
      /provided/
    );
    expect(shouldThrow(1.0, undefined, { noValidate: true }, mockE())).toThrow(
      /provided/
    );
    expect(shouldThrow(true, undefined, { noValidate: true }, mockE())).toThrow(
      /provided/
    );
    expect(shouldThrow([], undefined, { noValidate: true }, mockE())).toThrow(
      /provided/
    );
  });

  test('defaults set', () => {
    expect(
      contest(undefined, undefined, { noValidate: true }, mockE()).get(
        'uncontested'
      )
    ).toBe(false);
    expect(
      contest(undefined, undefined, { noValidate: true }, mockE()).get('seats')
    ).toBe(1);
  });

  test('properties set', () => {
    expect(
      contest(undefined, { a: 'b' }, { noValidate: true }, mockE()).get('a')
    ).toBe('b');
  });

  test('input set via object', () => {
    expect(
      contest({ a: 'b' }, undefined, { noValidate: true }, mockE()).get('a')
    ).toBe('b');
  });
});

// setAll function
describe('lib/contest | setAll', () => {
  let contest = (...args) => {
    let c = new Contest(undefined, undefined, { noValidate: true }, mockE());
    c.setAll(...args);
    return c;
  };
  let shouldThrow = (...args) => {
    return () => {
      return contest(...args);
    };
  };

  test('throw error for bad input', () => {
    expect(shouldThrow(1)).toThrow(/provided/);
    expect(shouldThrow(1.0)).toThrow(/provided/);
    expect(shouldThrow(true)).toThrow(/provided/);
    expect(shouldThrow([])).toThrow(/provided/);
  });

  test('should set candidates', () => {
    expect(
      contest({ a: 'b', candidates: [{ id: 't', c: 'd' }] }).get('a')
    ).toBe('b');
    expect(
      contest({ a: 'b', candidates: [{ id: 't', c: 'd' }] })
        .candidateGet('t')
        .get('c')
    ).toBe('d');
  });
});

// toJSON function
describe('lib/contest | toJSON', () => {
  let contest = (...args) => {
    let c = new Contest(undefined, undefined, { noValidate: true }, mockE());
    c.setAll(...args);
    return c.toJSON();
  };

  test('should export object', () => {
    expect(
      contest({ a: 'b', candidates: [{ id: 't', c: 'd' }] }).candidates
    ).toHaveLength(1);
  });
});

// toJSON function
describe('lib/contest | candidateSet', () => {
  test('add candidates', () => {
    let candidate1 = { id: 'a' };
    let candidate1a = { id: 'a', b: 'c' };
    let candidate2 = { id: 'b' };

    let c = new Contest(
      { a: 'b', candidates: [candidate1] },
      undefined,
      { noValidate: true },
      mockE()
    );
    expect(c.candidates).toHaveLength(1);

    c.candidateSet(candidate1a);
    expect(c.candidates).toHaveLength(1);
    expect(c.candidates[0].get('b')).toBe('c');

    c.candidateSet(candidate2);
    expect(c.candidates).toHaveLength(2);
  });

  test('add ranked choice candidates', () => {
    let candidate1 = { id: 'a', ranks: [{ votes: 10, rankedChoice: 1 }] };
    let candidate1a = {
      id: 'a',
      b: 'c',
      ranks: [{ votes: 10, rankedChoice: 2 }]
    };
    let candidate2 = { id: 'b' };

    let c = new Contest(
      { a: 'b', candidates: [candidate1] },
      undefined,
      { noValidate: true },
      mockE()
    );
    expect(c.candidates).toHaveLength(1);

    c.candidateSet(candidate1a);
    expect(c.candidates).toHaveLength(1);
    expect(c.candidates[0].get('ranks')).toHaveLength(2);

    c.candidateSet(candidate2);
    expect(c.candidates).toHaveLength(2);
  });
});

// Validation function
describe('lib/contest | validation', () => {
  test('should throw on invalid', () => {
    expect(() => {
      let c = new Contest({ a: 'b' }, {}, {}, mockE());
      return c;
    }).toThrow(/.*/i);
  });

  test('should not throw on valid', () => {
    expect(() => {
      let c = new Contest(
        {
          district: 'abc',
          contest: '123',
          name: 'Test contest',
          candidates: [{ id: '123', lastName: 'name' }]
        },
        { type: 'county' },
        {},
        mockE({ id: 1234 })
      );
      return c;
    }).not.toThrow(/.*/i);
  });
});

// Use some real input
describe('lib/contest | real input', () => {
  test('county commissioner, nonpartisan', () => {
    let input = [
      'MN;02;;0393;County Commissioner District 3;03;9001;Robyn West;;;NP;20;20;1557;58.56;2659',
      'MN;02;;0393;County Commissioner District 3;03;9002;Nyle Zikmund;;;NP;20;20;901;33.88;2659',
      'MN;02;;0393;County Commissioner District 3;03;9003;Michael Harasyn;;;NP;20;20;201;7.56;2659'
    ];
    let props = {
      type: 'county-commissioner'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(input[0], props, {}, e);
    }).not.toThrow(/.*/i);

    let c1 = new Contest(input[0], props, {}, e);
    let c2 = new Contest(input[1], props, {}, e);
    expect(c1.id()).toBe(c2.id());

    c1.setAll(c2.toJSON());
    expect(c1.get('final')).toBe(true);
    expect(c1.get('nonpartisan')).toBe(true);
    expect(c1.get('question')).toBe(false);
    expect(c1.get('seats')).toBe(1);
    expect(c1.candidates).toHaveLength(2);

    let c3 = new Contest(input[2], props, {}, e);
    expect(c1.id()).toBe(c3.id());
    c1.setAll(c3.toJSON());
    expect(c1.get('final')).toBe(true);
    expect(c1.get('nonpartisan')).toBe(true);
    expect(c1.get('question')).toBe(false);
    expect(c1.get('seats')).toBe(1);
    expect(c1.candidates).toHaveLength(3);
  });

  test('ranked choice, first round winner', () => {
    let input = [
      'MN;;;2401;Board of Estimate and Taxation First Choice (Minneapolis);43000;9001;DOUGLAS SEMBLA;;;NP;119;119;2299;4.72;48749',
      'MN;;;2401;Board of Estimate and Taxation First Choice (Minneapolis);43000;9002;DAVID B WHEELER;;;NP;119;119;16347;33.53;48749',
      'MN;;;2401;Board of Estimate and Taxation First Choice (Minneapolis);43000;9003;DAVID PASCOE;;;NP;119;119;5791;11.88;48749',
      'MN;;;2401;Board of Estimate and Taxation First Choice (Minneapolis);43000;9004;CAROL J. BECKER;;;NP;119;119;50898;51.02;48749',
      'MN;;;2401;Board of Estimate and Taxation First Choice (Minneapolis);43000;9901;WRITE-IN**;;;WI;119;119;414;0.85;48749',
      'MN;;;2402;Board of Estimate and Taxation Second Choice (Minneapolis);43000;9001;DOUGLAS SEMBLA;;;NP;119;119;3749;10.60;35363',
      'MN;;;2402;Board of Estimate and Taxation Second Choice (Minneapolis);43000;9002;DAVID B WHEELER;;;NP;119;119;12559;35.51;35363',
      'MN;;;2402;Board of Estimate and Taxation Second Choice (Minneapolis);43000;9003;DAVID PASCOE;;;NP;119;119;4927;13.93;35363',
      'MN;;;2402;Board of Estimate and Taxation Second Choice (Minneapolis);43000;9004;CAROL J. BECKER;;;NP;119;119;13805;39.04;35363',
      'MN;;;2402;Board of Estimate and Taxation Second Choice (Minneapolis);43000;9901;WRITE-IN**;;;WI;119;119;323;0.91;35363',
      'MN;;;2403;Board of Estimate and Taxation Third Choice (Minneapolis);43000;9001;DOUGLAS SEMBLA;;;NP;119;119;5399;25.28;21354',
      'MN;;;2403;Board of Estimate and Taxation Third Choice (Minneapolis);43000;9002;DAVID B WHEELER;;;NP;119;119;4464;20.90;21354',
      'MN;;;2403;Board of Estimate and Taxation Third Choice (Minneapolis);43000;9003;DAVID PASCOE;;;NP;119;119;8137;38.11;21354',
      'MN;;;2403;Board of Estimate and Taxation Third Choice (Minneapolis);43000;9004;CAROL J. BECKER;;;NP;119;119;2904;13.60;21354',
      'MN;;;2403;Board of Estimate and Taxation Third Choice (Minneapolis);43000;9901;WRITE-IN**;;;WI;119;119;450;2.11;21354'
    ];
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    // Put together
    let c = new Contest(input[0], props, {}, e);
    input.forEach((i, ii) => {
      if (ii > 0) {
        let c2 = new Contest(i, props, {}, e);
        expect(c2.id()).toBe(c.id());
        c.setAll(c2.toJSON());
      }
    });

    // Check some basics
    expect(c.get('final')).toBe(true);
    expect(c.get('nonpartisan')).toBe(true);
    expect(c.get('question')).toBe(false);
    expect(c.get('seats')).toBe(1);
    expect(c.candidates).toHaveLength(5);

    c.updateWinners();
    expect(c.candidates[0].get('winner')).toBe(true);
    expect(c.candidates[1].get('winner')).toBe(false);
  });

  test('primary', () => {
    let input = [
      'MN;;;0108;U.S. Representative District 5;5;0301;Frank Nelson Drake;;;R;236;236;4177;100.00;4177',
      'MN;;;0108;U.S. Representative District 5;5;0401;Keith Ellison;;;DFL;236;236;40380;91.72;44024',
      'MN;;;0108;U.S. Representative District 5;5;0402;Gregg A. Iverson;;;DFL;236;236;1887;4.29;44024',
      'MN;;;0108;U.S. Representative District 5;5;0403;Lee Bauer;;;DFL;236;236;1757;3.99;44024'
    ];
    let props = {
      type: 'us-house'
    };
    let e = mockE({
      id: 'TEST',
      primary: true
    });

    // Put together
    let c = new Contest(input[0], props, {}, e);
    input.forEach((i, ii) => {
      if (ii > 0) {
        let c2 = new Contest(i, props, {}, e);
        expect(c2.id()).toBe(c.id());
        c.setAll(c2.toJSON());
      }
    });

    // Check some basics
    expect(c.election.get('primary')).toBe(true);
    expect(c.get('final')).toBe(true);
    expect(c.get('nonpartisan')).toBe(false);
    expect(c.get('question')).toBe(false);
    expect(c.get('seats')).toBe(1);
    expect(c.candidates).toHaveLength(4);

    c.updateWinners();
    expect(c.candidates[0].get('winner')).toBe(true);
    expect(c.candidates[3].get('winner')).toBe(true);
    expect(c.get('close')).toBe(false);
  });

  test('very close final race', () => {
    let input = [
      'MN;;;1010;Council Member (Benson) (Elect 2);05212;9001;DENNIS MINOR;;;NP;2;2;190;12.31;1543',
      'MN;;;1010;Council Member (Benson) (Elect 2);05212;9002;LARRY SMITH;;;NP;2;2;123;7.97;1543',
      'MN;;;1010;Council Member (Benson) (Elect 2);05212;9003;JONATHON POGGE-WEAVER;;;NP;2;2;359;23.27;1543',
      'MN;;;1010;Council Member (Benson) (Elect 2);05212;9004;TERRI COLLINS;;;NP;2;2;479;31.04;1543',
      'MN;;;1010;Council Member (Benson) (Elect 2);05212;9005;DONALD KRUMWIEDE;;;NP;2;2;94;6.09;1543',
      'MN;;;1010;Council Member (Benson) (Elect 2);05212;9006;MIKE FUGLEBERG;;;NP;2;2;352;23.25;1543',
      'MN;;;1010;Council Member (Benson) (Elect 2);05212;9901;WRITE-IN**;;;WI;2;2;2;0.13;1543'
    ];
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: 'TEST',
      primary: false
    });

    // Put together
    let c = new Contest(input[0], props, {}, e);
    input.forEach((i, ii) => {
      if (ii > 0) {
        let c2 = new Contest(i, props, {}, e);
        expect(c2.id()).toBe(c.id());
        c.setAll(c2.toJSON());
      }
    });

    // Check some basics
    expect(c.get('final')).toBe(true);
    expect(c.get('nonpartisan')).toBe(true);
    expect(c.get('question')).toBe(false);
    expect(c.get('seats')).toBe(2);
    expect(c.candidates).toHaveLength(7);

    c.updateWinners();
    expect(c.candidates[0].get('winner')).toBe(true);
    expect(c.candidates[1].get('winner')).toBe(true);
    expect(c.get('close')).toBe(true);
  });
});

// Some more specifics for update winners
describe('lib/contest | updateWinners', () => {
  test('simple, no winner, not final', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      candidates: [
        { id: 'a', last: 'A', votes: 10 },
        { id: 'b', last: 'B', votes: 10 }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();
    expect(c.candidates[0].get('winner')).toBe(false);
    expect(c.candidates[1].get('winner')).toBe(false);
    expect(c.get('close')).toBe(false);
  });

  test('simple, winner, final', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      totalPrecincts: 10,
      precincts: 10,
      candidates: [
        { id: 'a', last: 'A', votes: 60 },
        { id: 'b', last: 'B', votes: 40 }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();

    expect(c.get('final')).toBe(true);
    expect(c.get('uncontested')).toBe(false);
    expect(c.get('totalVotes')).toBe(100);
    expect(c.get('close')).toBe(false);

    expect(c.candidates[0].get('winner')).toBe(true);
    expect(c.candidates[1].get('winner')).toBe(false);
  });

  test('simple, winner, final, close', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      totalPrecincts: 10,
      precincts: 10,
      candidates: [
        { id: 'a', last: 'A', votes: 501 },
        { id: 'b', last: 'B', votes: 499 }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();

    expect(c.get('final')).toBe(true);
    expect(c.get('uncontested')).toBe(false);
    expect(c.get('totalVotes')).toBe(1000);
    expect(c.get('close')).toBe(true);

    expect(c.candidates[0].get('winner')).toBe(true);
    expect(c.candidates[1].get('winner')).toBe(false);
  });

  test('simple, winner, final, close (< 400)', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      totalPrecincts: 10,
      precincts: 10,
      candidates: [
        { id: 'a', last: 'A', votes: 51 },
        { id: 'b', last: 'B', votes: 49 }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();

    expect(c.get('final')).toBe(true);
    expect(c.get('uncontested')).toBe(false);
    expect(c.get('totalVotes')).toBe(100);
    expect(c.get('close')).toBe(true);

    expect(c.candidates[0].get('winner')).toBe(true);
    expect(c.candidates[1].get('winner')).toBe(false);
  });

  test('multiple seats, final, winner', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      totalPrecincts: 10,
      precincts: 10,
      seats: 2,
      candidates: [
        { id: 'a', last: 'A', votes: 100 },
        { id: 'b', last: 'B', votes: 60 },
        { id: 'c', last: 'C', votes: 40 }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();

    expect(c.get('final')).toBe(true);
    expect(c.get('uncontested')).toBe(false);
    expect(c.get('totalVotes')).toBe(200);
    expect(c.get('close')).toBe(false);

    expect(c.candidates[0].get('winner')).toBe(true);
    expect(c.candidates[1].get('winner')).toBe(true);
    expect(c.candidates[2].get('winner')).toBe(false);
  });

  test('simple, write-in winner', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      totalPrecincts: 10,
      precincts: 10,
      candidates: [
        { id: 'a', writeIn: true, votes: 60 },
        { id: 'b', last: 'B', votes: 40 }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();

    expect(c.get('final')).toBe(true);
    expect(c.get('uncontested')).toBe(true);
    expect(c.get('totalVotes')).toBe(100);
    expect(c.get('close')).toBe(false);

    expect(c.candidates[0].get('winner')).toBe(false);
    expect(c.candidates[1].get('winner')).toBe(false);
  });

  test('ranked, winner, first-round', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      totalPrecincts: 10,
      precincts: 10,
      ranked: true,
      candidates: [
        {
          id: 'a',
          last: 'A',
          ranks: [{ rankedChoice: 1, votes: 200, percent: 66.67 }]
        },
        {
          id: 'b',
          last: 'B',
          ranks: [{ rankedChoice: 1, votes: 60, percent: 20 }]
        },
        {
          id: 'c',
          last: 'C',
          ranks: [{ rankedChoice: 1, votes: 40, precent: 13.33 }]
        }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();

    expect(c.get('final')).toBe(true);
    expect(c.get('uncontested')).toBe(false);
    expect(c.get('totalVotes')).toBe(300);
    expect(c.get('close')).toBe(false);

    expect(c.candidates[0].get('winner')).toBe(true);
    expect(c.candidates[1].get('winner')).toBe(false);
    expect(c.candidates[2].get('winner')).toBe(false);
  });

  test('ranked, final, no-winner, first-round', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      totalPrecincts: 10,
      precincts: 10,
      ranked: true,
      candidates: [
        {
          id: 'a',
          last: 'A',
          ranks: [{ rankedChoice: 1, votes: 33, percent: 33 }]
        },
        {
          id: 'b',
          last: 'B',
          ranks: [{ rankedChoice: 1, votes: 33, percent: 33 }]
        },
        {
          id: 'c',
          last: 'C',
          ranks: [{ rankedChoice: 1, votes: 33, precent: 33 }]
        }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();

    expect(c.get('final')).toBe(true);
    expect(c.get('uncontested')).toBe(false);
    expect(c.get('totalVotes')).toBe(99);
    expect(c.get('close')).toBe(false);

    expect(c.candidates[0].get('winner')).toBe(false);
    expect(c.candidates[1].get('winner')).toBe(false);
    expect(c.candidates[2].get('winner')).toBe(false);
  });

  test('ranked, final, counted', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      totalPrecincts: 10,
      precincts: 10,
      ranked: true,
      candidates: [
        {
          id: 'a',
          last: 'A',
          votes: 20,
          ranks: [{ rankedChoice: 1, votes: 100, percent: 33 }]
        },
        {
          id: 'b',
          last: 'B',
          votes: 20,
          ranks: [{ rankedChoice: 1, votes: 60, percent: 33 }]
        },
        {
          id: 'c',
          last: 'C',
          votes: 160,
          ranks: [{ rankedChoice: 1, votes: 40, precent: 33 }]
        }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();

    expect(c.get('final')).toBe(true);
    expect(c.get('uncontested')).toBe(false);
    expect(c.get('totalVotes')).toBe(200);
    expect(c.get('close')).toBe(false);

    // Resorts
    expect(_.find(c.candidates, a => a.get('last') === 'C').get('winner')).toBe(
      true
    );
    expect(_.find(c.candidates, a => a.get('last') === 'A').get('winner')).toBe(
      false
    );
    expect(_.find(c.candidates, a => a.get('last') === 'B').get('winner')).toBe(
      false
    );
  });

  test('ranked, final, first-round, no-winner, over 50', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      totalPrecincts: 10,
      precincts: 10,
      ranked: true,
      candidates: [
        {
          id: 'a',
          last: 'A',
          ranks: [{ rankedChoice: 1, votes: 10010, percent: 50.05 }]
        },
        {
          id: 'b',
          last: 'B',
          ranks: [{ rankedChoice: 1, votes: 9985, percent: 49.93 }]
        },
        {
          id: 'c',
          last: 'C',
          ranks: [{ rankedChoice: 1, votes: 5, precent: 0.03 }]
        }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();

    expect(c.get('final')).toBe(true);
    expect(c.get('uncontested')).toBe(false);
    expect(c.get('totalVotes')).toBe(20000);
    expect(c.get('close')).toBe(false);

    expect(c.candidates[0].get('winner')).toBe(false);
    expect(c.candidates[1].get('winner')).toBe(false);
    expect(c.candidates[2].get('winner')).toBe(false);
  });

  test('ranked, final, first-round, winner, close', () => {
    let contest = {
      id: '1',
      district: '11',
      contest: '111',
      name: 'Contest 1',
      totalPrecincts: 10,
      precincts: 10,
      ranked: true,
      candidates: [
        {
          id: 'a',
          last: 'A',
          ranks: [{ rankedChoice: 1, votes: 10060, percent: 50.3 }]
        },
        {
          id: 'b',
          last: 'B',
          ranks: [{ rankedChoice: 1, votes: 9880, percent: 49.4 }]
        },
        {
          id: 'c',
          last: 'C',
          ranks: [{ rankedChoice: 1, votes: 60, precent: 0.3 }]
        }
      ]
    };
    let props = {
      type: 'local'
    };
    let e = mockE({
      id: '1234',
      primary: false
    });

    expect(() => {
      return new Contest(_.cloneDeep(contest), props, {}, e);
    }).not.toThrow(/.*/i);

    let c = new Contest(_.cloneDeep(contest), props, {}, e);
    c.updateWinners();

    expect(c.get('final')).toBe(true);
    expect(c.get('uncontested')).toBe(false);
    expect(c.get('totalVotes')).toBe(20000);
    expect(c.get('close')).toBe(true);

    expect(c.candidates[0].get('winner')).toBe(true);
    expect(c.candidates[1].get('winner')).toBe(false);
    expect(c.candidates[2].get('winner')).toBe(false);
  });
});
