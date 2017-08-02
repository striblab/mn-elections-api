/**
 * Test Base class
 */

// Implicit depedences
/* global describe, test, expect */

// To test
const Contest = require('../lib/contest.js');


// Get function
describe('lib/contest | constructor', () => {
  let contest = (...args) => {
    return new Contest(...args);
  };
  let shouldThrow = (...args) => {
    return () => { return contest(...args); };
  };

  test('throw error for bad input', () => {
    expect(shouldThrow(1, undefined, { noValidate: true })).toThrow(/provided/);
    expect(shouldThrow(1.0, undefined, { noValidate: true })).toThrow(/provided/);
    expect(shouldThrow(true, undefined, { noValidate: true })).toThrow(/provided/);
    expect(shouldThrow([], undefined, { noValidate: true })).toThrow(/provided/);
  });

  test('defaults set', () => {
    expect(contest(undefined, undefined, { noValidate: true }).get('uncontested')).toBe(false);
    expect(contest(undefined, undefined, { noValidate: true }).get('seats')).toBe(1);
  });

  test('properties set', () => {
    expect(contest(undefined, { primary: true }, { noValidate: true }).get('primary')).toBe(true);
    expect(contest(undefined, { a: 'b' }, { noValidate: true }).get('a')).toBe('b');
  });

  test('input set via object', () => {
    expect(contest({ a: 'b' }, undefined, { noValidate: true }).get('a')).toBe('b');
  });
});

// setAll function
describe('lib/contest | setAll', () => {
  let contest = (...args) => {
    let c = new Contest(undefined, undefined, { noValidate: true });
    c.setAll(...args);
    return c;
  };
  let shouldThrow = (...args) => {
    return () => { return contest(...args); };
  };

  test('throw error for bad input', () => {
    expect(shouldThrow(1)).toThrow(/provided/);
    expect(shouldThrow(1.0)).toThrow(/provided/);
    expect(shouldThrow(true)).toThrow(/provided/);
    expect(shouldThrow([])).toThrow(/provided/);
  });

  test('should set candidates', () => {
    expect(contest({ a: 'b', candidates: [{ id: 't', c: 'd' }] }).get('a')).toBe('b');
    expect(contest({ a: 'b', candidates: [{ id: 't', c: 'd' }] }).candidateGet('t').get('c')).toBe('d');
  });
});

// toJSON function
describe('lib/contest | toJSON', () => {
  let contest = (...args) => {
    let c = new Contest(undefined, undefined, { noValidate: true });
    c.setAll(...args);
    return c.toJSON();
  };

  test('should export object', () => {
    expect(contest({ a: 'b', candidates: [{ id: 't', c: 'd' }] }).candidates)
      .toHaveLength(1);
  });
});

// toJSON function
describe('lib/contest | candidateSet', () => {
  test('add candidates', () => {
    let candidate1 = { id: 'a' };
    let candidate1a = { id: 'a', b: 'c' };
    let candidate2 = { id: 'b' };

    let c = new Contest({ a: 'b', candidates: [ candidate1 ]}, undefined, { noValidate: true });
    expect(c.candidates).toHaveLength(1);

    c.candidateSet(candidate1a);
    expect(c.candidates).toHaveLength(1);
    expect(c.candidates[0].get('b')).toBe('c');

    c.candidateSet(candidate2);
    expect(c.candidates).toHaveLength(2);
  });

  test('add ranked choice candidates', () => {
    let candidate1 = { id: 'a', ranks: [{ votes: 10, rankedChoice: 1 }]};
    let candidate1a = { id: 'a', b: 'c', ranks: [{ votes: 10, rankedChoice: 2 }]};
    let candidate2 = { id: 'b' };

    let c = new Contest({ a: 'b', candidates: [ candidate1 ]}, undefined, { noValidate: true });
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
      let c = new Contest({ a: 'b' });
      return c;
    }).toThrow(/field not present/i);
  });

  test('should not throw on valid', () => {
    expect(() => {
      let c = new Contest({
        election: 1234,
        type: 'test',
        district: 'abc',
        contest: '123',
        name: 'Test contest',
        candidates: [
          { id: '123', lastName: 'name' }
        ]
      });
      return c;
    }).not.toThrow(/field not present/i);
  });
});

// Use some real input
describe('lib/contest | real input', () => {

  test('county commissioner', () => {
    let input = [
      'MN;02;;0393;County Commissioner District 3;03;9001;Robyn West;;;NP;20;20;1557;58.56;2659',
      'MN;02;;0393;County Commissioner District 3;03;9002;Nyle Zikmund;;;NP;20;20;901;33.88;2659',
      'MN;02;;0393;County Commissioner District 3;03;9003;Michael Harasyn;;;NP;20;20;201;7.56;2659'
    ];
    let props = {
      election: 'TEST',
      type: 'countyCommissioner'
    };

    expect(() => {
      return new Contest(input[0], props);
    }).not.toThrow(/.*/i);

    let c1 = new Contest(input[0], props);
    let c2 = new Contest(input[1], props);
    expect(c1.id()).toBe(c2.id());

    c1.setAll(c2.toJSON());
    expect(c1.get('final')).toBe(true);
    expect(c1.get('nonpartisan')).toBe(true);
    expect(c1.get('question')).toBe(false);
    expect(c1.get('seats')).toBe(1);
    expect(c1.candidates).toHaveLength(2);

    let c3 = new Contest(input[2], props);
    expect(c1.id()).toBe(c3.id());
    c1.setAll(c3.toJSON());
    expect(c1.get('final')).toBe(true);
    expect(c1.get('nonpartisan')).toBe(true);
    expect(c1.get('question')).toBe(false);
    expect(c1.get('seats')).toBe(1);
    expect(c1.candidates).toHaveLength(3);
  });
});
