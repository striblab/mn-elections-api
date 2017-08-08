/**
 * Test Candidate class
 */

// Implicit depedences
/* global describe, test, expect */

// To test
const Candidate = require('../lib/candidate.js');


// Constructor function
describe('lib/candidate | constructor', () => {
  let candidate = (...args) => {
    return new Candidate(...args);
  };
  let shouldThrow = (...args) => {
    return () => { return candidate(...args); };
  };

  test('throw error for bad input', () => {
    expect(shouldThrow(1)).toThrow(/provided/);
    expect(shouldThrow(1.0)).toThrow(/provided/);
    expect(shouldThrow(true)).toThrow(/provided/);
    expect(shouldThrow([])).toThrow(/provided/);
    expect(shouldThrow({}, null)).toThrow(/provided/);
  });
});
