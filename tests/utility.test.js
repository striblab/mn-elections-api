/**
 * Test lib/utility.js
 */

// Implicit depedences
/* global describe, test, expect */

// To test
const utility = require('../lib/utility.js');

// Raw parsing input function
describe('lib/utility | raw', () => {
  test('handles nil values', () => {
    expect(utility.raw(undefined)).toBe(undefined);
    expect(utility.raw(null)).toBe(undefined);
    expect(utility.raw(NaN)).toBe(undefined);
  });

  test('handles numbers values', () => {
    expect(utility.raw(1, 'int')).toBe(1);
    expect(utility.raw(1, 'float')).toBe(1.0);
    expect(utility.raw(10.3, 'int')).toBe(10);
    expect(utility.raw(10.3, 'float')).toBe(10.3);
    expect(utility.raw('s', 'float')).toBe(undefined);
    expect(utility.raw('s', 'int')).toBe(undefined);
  });

  test('handles strings', () => {
    expect(utility.raw('test')).toBe('test');
    expect(utility.raw('TEST')).toBe('TEST');
    expect(utility.raw(' TEST ')).toBe('TEST');
    expect(utility.raw('TEsT')).toBe('TEsT');
    expect(utility.raw('   ')).toBe('');
    expect(utility.raw('')).toBe(undefined);
  });

  test('handles others', () => {
    expect(utility.raw([1])).toHaveLength(1);
    expect(utility.raw({ this: 'that' })).toEqual({ this: 'that' });
    expect(utility.raw(false)).toBe(false);
    expect(utility.raw(true)).toBe(true);
  });
});

// Make ID function
describe('lib/utility | makeID', () => {
  test('non-array, non-string, non-number values', () => {
    expect(utility.makeID(null)).toBe(undefined);
    expect(utility.makeID(undefined)).toBe(undefined);
    expect(utility.makeID(NaN)).toBe(undefined);
    expect(utility.makeID(true)).toBe(undefined);
    expect(utility.makeID({ a: 'b' })).toBe(undefined);
  });

  test('handles strings', () => {
    expect(utility.makeID('a')).toBe('a');
    expect(utility.makeID(' a ')).toBe('a');
    expect(utility.makeID('-a-')).toBe('a');
    expect(utility.makeID('a b c')).toBe('a-b-c');
    expect(utility.makeID('a B c')).toBe('a-b-c');
  });

  test('handles arrays', () => {
    expect(utility.makeID([])).toBe(undefined);
    expect(utility.makeID([' '])).toBe('|');
    expect(utility.makeID([' ', 'a', 'b'])).toBe('|-a-b');
    expect(utility.makeID([null, 'a', 'b'])).toBe('|-a-b');
    expect(utility.makeID([undefined, 'a', 'b'])).toBe('|-a-b');
    expect(utility.makeID(['  0 ', 'a', 'b'])).toBe('0-a-b');
    expect(utility.makeID(['  0 ', '  a  ', '   b'])).toBe('0-a-b');
    expect(utility.makeID(['a', null, 'c', null, null, 0])).toBe('a-|-c-|-|-0');
    expect(utility.makeID(['camelCase', 'a', 'CAMELCASE'])).toBe('camel-case-a-camelcase');
  });
});
