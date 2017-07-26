/**
 * Test lib/results-parse.js
 */

// Implicit depedences
/* global describe, test, expect */

// To test
const parse = require('../lib/results-parse.js');

// Main function
describe('lib/results-parse | main', () => {

  test('basic row', () => {
    let row = 'MN;co-id;pre-id;off-id;OFFICE (Elect 3) (Area);dist-id;cand-id;First Last;;;PARTY;1;100;100;10;1000';
    expect(parse(row)).toEqual({
      stateID: 'MN',
      countyID: 'co-id',
      districtID: 'dist-id',
      precinctID: 'pre-id',
      candidateID: 'cand-id',

      contestID: 'id-MN-co-id-pre-id-dist-id-off-id',
      entryID: 'id-MN-co-id-pre-id-dist-id-off-id-cand-id',

      area: 'Area',
      office: 'Office',
      officeID: 'off-id',
      officeRaw: 'OFFICE (Elect 3) (Area)',
      question: false,
      ranked: false,
      rankedChoice: null,
      seats: 3,

      precincts: 1,
      totalPrecincts: 100,

      votes: 100,
      totalVotes: 1000,
      percent: 10,

      party: 'PARTY',
      incumbent: null,
      suffix: null,
      candidateRaw: 'First Last',
      candidate: { first: 'First', last: 'Last' },
    });
  });
});

// Raw parsing input function
describe('lib/results-parse | raw', () => {
  test('handles nil values', () => {
    expect(parse.raw(undefined)).toBe(null);
    expect(parse.raw(null)).toBe(null);
    expect(parse.raw(NaN)).toBe(null);
  });

  test('handles numbers values', () => {
    expect(parse.raw(1, 'int')).toBe(1);
    expect(parse.raw(1, 'float')).toBe(1.0);
    expect(parse.raw(10.3, 'int')).toBe(10);
    expect(parse.raw(10.3, 'float')).toBe(10.3);
    expect(parse.raw('s', 'float')).toBe(null);
    expect(parse.raw('s', 'int')).toBe(null);
  });

  test('handles strings', () => {
    expect(parse.raw('test')).toBe('test');
    expect(parse.raw('TEST')).toBe('TEST');
    expect(parse.raw(' TEST ')).toBe('TEST');
    expect(parse.raw('TEsT')).toBe('TEsT');
    expect(parse.raw('   ')).toBe('');
    expect(parse.raw('')).toBe(null);
  });

  test('handles others', () => {
    expect(parse.raw([1])).toHaveLength(1);
    expect(parse.raw({ this: 'that' })).toEqual({ this: 'that' });
    expect(parse.raw(false)).toBe(false);
    expect(parse.raw(true)).toBe(true);
  });
});

// MAke ID function
describe('lib/results-parse | makeID', () => {
  test('non-array, non-string, non-number values', () => {
    expect(parse.makeID(null)).toBe(null);
    expect(parse.makeID(undefined)).toBe(null);
    expect(parse.makeID(NaN)).toBe(null);
    expect(parse.makeID(true)).toBe(null);
    expect(parse.makeID({ a: 'b' })).toBe(null);
  });

  test('handles strings', () => {
    expect(parse.makeID('a')).toBe('a');
    expect(parse.makeID(' a ')).toBe('a');
    expect(parse.makeID('-a-')).toBe('a');
    expect(parse.makeID('a b c')).toBe('a-b-c');
    expect(parse.makeID('a B c')).toBe('a-b-c');
  });

  test('handles arrays', () => {
    expect(parse.makeID([])).toBe(null);
    expect(parse.makeID([' '])).toBe('|');
    expect(parse.makeID([' ', 'a', 'b'])).toBe('|-a-b');
    expect(parse.makeID([null, 'a', 'b'])).toBe('|-a-b');
    expect(parse.makeID([undefined, 'a', 'b'])).toBe('|-a-b');
    expect(parse.makeID(['  0 ', 'a', 'b'])).toBe('0-a-b');
    expect(parse.makeID(['  0 ', '  a  ', '   b'])).toBe('0-a-b');
    expect(parse.makeID(['a', null, 'c', null, null, 0])).toBe('a-|-c-|-|-0');
  });
});

// Parse candidate function
describe('lib/results-parse | parseCandidate', () => {
  let message = 'Input not a string';

  test('non-string returns error object', () => {
    expect(parse.parseCandidate(1)).toEqual({ error: [message] });
    expect(parse.parseCandidate(1.0)).toEqual({ error: [message] });
    expect(parse.parseCandidate(true)).toEqual({ error: [message] });
    expect(parse.parseCandidate({})).toEqual({ error: [message] });
    expect(parse.parseCandidate([])).toEqual({ error: [message] });
    expect(parse.parseCandidate(null)).toEqual({ error: [message] });
    expect(parse.parseCandidate(undefined)).toEqual({ error: [message] });
  });

  test('handles write-in', () => {
    expect(parse.parseCandidate('WRITE-IN')).toEqual({ writeIn: true });
    expect(parse.parseCandidate('WRITE IN')).toEqual({ writeIn: true });
    expect(parse.parseCandidate('WRITEIN')).toEqual({ writeIn: true });
    expect(parse.parseCandidate('WRITE-IN**')).toEqual({ writeIn: true });
    expect(parse.parseCandidate('**write---in**')).toEqual({ writeIn: true });
  });

  test('handles names', () => {
    // Gets run through styleName
    expect(parse.parseCandidate('MR. HANDY')).toEqual({ last: 'Handy' });
    expect(parse.parseCandidate('MR HANDY')).toEqual({ last: 'Handy' });
    expect(parse.parseCandidate('MR HANDY JR')).toEqual({ last: 'Handy', suffix: 'Jr.' });
    expect(parse.parseCandidate('Star Tribune')).toEqual({ last: 'Tribune', first: 'Star' });
    expect(parse.parseCandidate('Fir B Lass')).toEqual({ last: 'Lass', first: 'Fir', middle: 'B.' });
    expect(parse.parseCandidate('Nicky "Nikster" Nickson')).toEqual({ last: 'Nickson', first: 'Nicky', nick: 'Nikster' });
  });
});

// Parse office function
describe('lib/results-parse | parseOffice', () => {

  test('non-string returns null', () => {
    expect(parse.parseOffice(1)).toBe(null);
    expect(parse.parseOffice(1.0)).toBe(null);
    expect(parse.parseOffice(null)).toBe(null);
    expect(parse.parseOffice(undefined)).toBe(null);
    expect(parse.parseOffice([])).toBe(null);
    expect(parse.parseOffice({})).toBe(null);
    expect(parse.parseOffice(() => 1)).toBe(null);
  });

  test('handles regular office', () => {
    expect(parse.parseOffice('office for something')).toEqual({
      office: 'Office for Something',
      area: null,
      seats: 1,
      question: false,
      ranked: false,
      rankedChoice: null
    });
  });

  test('handles area', () => {
    expect(parse.parseOffice('office for something (Area 54)')).toEqual({
      office: 'Office for Something',
      area: 'Area 54',
      seats: 1,
      question: false,
      ranked: false,
      rankedChoice: null
    });
  });

  test('handles question (and area)', () => {
    expect(parse.parseOffice('Question 100 (Area #1)')).toEqual({
      office: 'Question 100',
      area: 'Area #1',
      seats: 1,
      question: true,
      ranked: false,
      rankedChoice: null
    });
  });

  test('handles ranked choice', () => {
    expect(parse.parseOffice('office for something First choice')).toEqual({
      office: 'Office for Something',
      area: null,
      seats: 1,
      question: false,
      ranked: true,
      rankedChoice: 1
    });
  });

  test('handles seats', () => {
    expect(parse.parseOffice('office for $$ (Elect 3)')).toEqual({
      office: 'Office for $$',
      area: null,
      seats: 3,
      question: false,
      ranked: false,
      rankedChoice: null
    });
  });

  test('handles seats, ranked choice, and area', () => {
    expect(parse.parseOffice('ANOTHER OFFICE Fourth Choice (Area) (Elect 33)')).toEqual({
      office: 'Another Office',
      area: 'Area',
      seats: 33,
      question: false,
      ranked: true,
      rankedChoice: 4
    });

    expect(parse.parseOffice('ANOTHER OFFICE Fourth Choice (Elect 33) (Area)')).toEqual({
      office: 'Another Office',
      area: 'Area',
      seats: 33,
      question: false,
      ranked: true,
      rankedChoice: 4
    });
  });
});
