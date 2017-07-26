/**
 * Test lib.common.js
 */

// Implicit depedences
/* global describe, test, expect */

// To test
const common = require('../lib/common.js');

// StyleName function
describe('lib/common | styleName', () => {

  test('non-object values should return themselves', () => {
    expect(common.styleName(1)).toBe(1);
    expect(common.styleName(undefined)).toBe(undefined);
    expect(common.styleName(null)).toBe(null);
    expect(common.styleName(true)).toBe(true);
    expect(common.styleName(1.0)).toBe(1.0);
    expect(common.styleName([])).toEqual([]);
    expect(common.styleName([1])).toHaveLength(1);
  });

  test('object without relevant fields returns the same', () => {
    expect(common.styleName({
      is: 'not to be expected in name object'
    })).toEqual({
      is: 'not to be expected in name object'
    });
  });

  test('updates middle inital', () => {
    expect(common.styleName({ middle: 'M' })).toEqual({ middle: 'M.' });
    expect(common.styleName({ middle: 'M.' })).toEqual({ middle: 'M.' });
    expect(common.styleName({ middle: 'MMMM' })).toEqual({ middle: 'MMMM' });
    expect(common.styleName({ middle: '1' })).toEqual({ middle: '1' });
  });

  test('removes personal titles', () => {
    expect(common.styleName({ title: 'Mr.' })).toEqual({ title: '' });
    expect(common.styleName({ title: 'Mr' })).toEqual({ title: '' });
    expect(common.styleName({ title: 'Mrs.' })).toEqual({ title: '' });
    expect(common.styleName({ title: 'mrs' })).toEqual({ title: '' });
    expect(common.styleName({ title: 'miss' })).toEqual({ title: '' });
  });

  test('handles suffixes', () => {
    expect(common.styleName({ suffix: 'Jr.' })).toEqual({ suffix: 'Jr.' });
    expect(common.styleName({ suffix: 'Jr' })).toEqual({ suffix: 'Jr.' });
    // Should we automatically capitalize?
    expect(common.styleName({ suffix: 'sr.' })).toEqual({ suffix: 'sr.' });
    expect(common.styleName({ suffix: 'Sr' })).toEqual({ suffix: 'Sr.' });
    expect(common.styleName({ suffix: 'IV' })).toEqual({ suffix: 'IV' });
  });
});

// renderName function
describe('lib/common | renderName', () => {

  test('non-object values should return strings', () => {
    expect(common.renderName(1)).toBe('');
    expect(common.renderName(undefined)).toBe('');
    expect(common.renderName(null)).toBe('');
    expect(common.renderName(true)).toBe('');
    expect(common.renderName(1.0)).toBe('');
    expect(common.renderName([])).toBe('');
    expect(common.renderName([1])).toBe('');

    expect(common.renderName('test')).toBe('test');
    expect(common.renderName('TEST')).toBe('TEST');
  });

  test('handles write-ins', () => {
    expect(common.renderName({ writeIn: true })).toBe('Write-in');
  });

  test('handles question answers', () => {
    expect(common.renderName({ last: 'Yes' })).toBe('Yes');
    expect(common.renderName({ last: 'No' })).toBe('No');
  });

  test('handles full names', () => {
    expect(common.renderName({ last: 'Other' })).toBe('Other');
    expect(common.renderName({ first: 'First', last: 'Last' })).toBe('First Last');
    expect(common.renderName({ first: 'Leonard', last: 'Spaceman', title: 'Dr.' })).toBe('Dr. Leonard Spaceman');
    expect(common.renderName({ first: 'A', middle: 'B', last: 'C' })).toBe('A B C');
  });
});

// renderSortName function
describe('lib/common | renderSortName', () => {
  let heavy = 'zzzzz';

  test('string values should return themselves', () => {
    expect(common.renderSortName('test')).toBe('test');
    expect(common.renderSortName('TEST')).toBe('TEST');
  });

  test('non-object, non-string values should return heavy sort', () => {
    expect(common.renderSortName(1)).toBe(heavy);
    expect(common.renderSortName(undefined)).toBe(heavy);
    expect(common.renderSortName(null)).toBe(heavy);
    expect(common.renderSortName(true)).toBe(heavy);
    expect(common.renderSortName(1.0)).toBe(heavy);
    expect(common.renderSortName([])).toBe(heavy);
    expect(common.renderSortName([1])).toBe(heavy);
  });

  test('heavy sort write-ins', () => {
    expect(common.renderSortName({ writeIn: true })).toBe(heavy);
  });

  test('handles question answers', () => {
    expect(common.renderSortName({ last: 'Yes' })).toBe('Yes');
    expect(common.renderSortName({ last: 'No' })).toBe('No');
  });

  test('handles full names', () => {
    expect(common.renderSortName({ last: 'Other' })).toBe('Other');
    expect(common.renderSortName({ first: 'First', last: 'Last' })).toBe('Last First');
    expect(common.renderSortName({ first: 'Leonard', last: 'Spaceman', title: 'Dr.' })).toBe('Spaceman Leonard');
    expect(common.renderSortName({ first: 'A', middle: 'B', last: 'C' })).toBe('C A B');
  });
});
