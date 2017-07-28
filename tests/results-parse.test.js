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
      seats: 3,

      precincts: 1,
      totalPrecincts: 100,

      votes: 100,
      totalVotes: 1000,
      percent: 10,

      party: 'PARTY',
      candidateRaw: 'First Last',
      candidate: { first: 'First', last: 'Last' },
    });
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
    expect(parse.parseOffice(1)).toBe(undefined);
    expect(parse.parseOffice(1.0)).toBe(undefined);
    expect(parse.parseOffice(null)).toBe(undefined);
    expect(parse.parseOffice(undefined)).toBe(undefined);
    expect(parse.parseOffice([])).toBe(undefined);
    expect(parse.parseOffice({})).toBe(undefined);
    expect(parse.parseOffice(() => 1)).toBe(undefined);
  });

  test('handles regular office', () => {
    expect(parse.parseOffice('office for something')).toEqual({
      office: 'Office for Something',
      seats: 1,
      question: false,
      ranked: false,
    });
  });

  test('handles area', () => {
    expect(parse.parseOffice('office for something (Area 54)')).toEqual({
      office: 'Office for Something',
      area: 'Area 54',
      seats: 1,
      question: false,
      ranked: false,
    });
  });

  test('handles question (and area)', () => {
    expect(parse.parseOffice('Question 100 (Area #1)')).toEqual({
      office: 'Question 100',
      area: 'Area #1',
      seats: 1,
      question: true,
      ranked: false,
    });
  });

  test('handles ranked choice', () => {
    expect(parse.parseOffice('office for something First choice')).toEqual({
      office: 'Office for Something',
      seats: 1,
      question: false,
      ranked: true,
      rankedChoice: 1
    });
  });

  test('handles seats', () => {
    expect(parse.parseOffice('office for $$ (Elect 3)')).toEqual({
      office: 'Office for $$',
      seats: 3,
      question: false,
      ranked: false,
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
