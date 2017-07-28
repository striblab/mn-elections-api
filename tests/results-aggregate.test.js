/**
 * Test lib/results-aggregate.js
 */

// Implicit depedences
/* global describe, test, expect */

// To test
const aggregate = require('../lib/results-aggregate.js');

// Main function
describe('lib/results-aggregate | main', () => {

  // Basic grouping
  test('should group contests', () => {
    let t = aggregate([
      {
        contestID: 'a',
        candidate: {}
      },
      {
        contestID: 'a',
        candidate: {}
      }
    ]);
    // Fake time and get rid of undefined
    t[0].updated = 1;
    t = JSON.parse(JSON.stringify(t));

    expect(t).toEqual([{
      contestID: 'a',
      updated: 1,
      called: false,
      uncontested: false,
      nonpartisan: true,
      candidates: [
        { candidate: {} },
        { candidate: {} }
      ]
    }]);
  });
});
