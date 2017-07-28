/**
 * Test lib/common.js
 */

// Implicit depedences
/* global describe, test, expect */

// To test
const common = require('../lib/common.js');

// Raw parsing input function
describe('lib/common | raw', () => {
  test('handles nil values', () => {
    expect(common.raw(undefined)).toBe(undefined);
    expect(common.raw(null)).toBe(undefined);
    expect(common.raw(NaN)).toBe(undefined);
  });

  test('handles numbers values', () => {
    expect(common.raw(1, 'int')).toBe(1);
    expect(common.raw(1, 'float')).toBe(1.0);
    expect(common.raw(10.3, 'int')).toBe(10);
    expect(common.raw(10.3, 'float')).toBe(10.3);
    expect(common.raw('s', 'float')).toBe(undefined);
    expect(common.raw('s', 'int')).toBe(undefined);
  });

  test('handles strings', () => {
    expect(common.raw('test')).toBe('test');
    expect(common.raw('TEST')).toBe('TEST');
    expect(common.raw(' TEST ')).toBe('TEST');
    expect(common.raw('TEsT')).toBe('TEsT');
    expect(common.raw('   ')).toBe('');
    expect(common.raw('')).toBe(undefined);
  });

  test('handles others', () => {
    expect(common.raw([1])).toHaveLength(1);
    expect(common.raw({ this: 'that' })).toEqual({ this: 'that' });
    expect(common.raw(false)).toBe(false);
    expect(common.raw(true)).toBe(true);
  });
});

// Make ID function
describe('lib/common | makeID', () => {
  test('non-array, non-string, non-number values', () => {
    expect(common.makeID(null)).toBe(undefined);
    expect(common.makeID(undefined)).toBe(undefined);
    expect(common.makeID(NaN)).toBe(undefined);
    expect(common.makeID(true)).toBe(undefined);
    expect(common.makeID({ a: 'b' })).toBe(undefined);
  });

  test('handles strings', () => {
    expect(common.makeID('a')).toBe('a');
    expect(common.makeID(' a ')).toBe('a');
    expect(common.makeID('-a-')).toBe('a');
    expect(common.makeID('a b c')).toBe('a-b-c');
    expect(common.makeID('a B c')).toBe('a-b-c');
  });

  test('handles arrays', () => {
    expect(common.makeID([])).toBe(undefined);
    expect(common.makeID([' '])).toBe('|');
    expect(common.makeID([' ', 'a', 'b'])).toBe('|-a-b');
    expect(common.makeID([null, 'a', 'b'])).toBe('|-a-b');
    expect(common.makeID([undefined, 'a', 'b'])).toBe('|-a-b');
    expect(common.makeID(['  0 ', 'a', 'b'])).toBe('0-a-b');
    expect(common.makeID(['  0 ', '  a  ', '   b'])).toBe('0-a-b');
    expect(common.makeID(['a', null, 'c', null, null, 0])).toBe('a-|-c-|-|-0');
  });
});

// styleArea
describe('lib/common | styleArea', () => {

  test('non-string values should return themselves', () => {
    expect(common.styleArea(1)).toBe(1);
    expect(common.styleArea(undefined)).toBe(undefined);
    expect(common.styleArea(null)).toBe(null);
    expect(common.styleArea(true)).toBe(true);
    expect(common.styleArea(1.0)).toBe(1.0);
    expect(common.styleArea([])).toEqual([]);
    expect(common.styleArea([1])).toHaveLength(1);
  });

  test('should handle st.', () => {
    expect(common.styleArea(' st paul ')).toBe(' St. paul ');
    expect(common.styleArea('-st paul ')).toBe('-St. paul ');
    expect(common.styleArea('f st paul ')).toBe('f St. paul ');
    expect(common.styleArea('st paul')).toBe('St. paul');
    expect(common.styleArea('saint paul')).toBe('St. paul');
    expect(common.styleArea('st. paul')).toBe('St. paul');
  });
});

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
    expect(common.styleName({ title: 'Mr.' })).toEqual({ });
    expect(common.styleName({ title: 'Mr' })).toEqual({ });
    expect(common.styleName({ title: 'Mrs.' })).toEqual({ });
    expect(common.styleName({ title: 'mrs' })).toEqual({ });
    expect(common.styleName({ title: 'miss' })).toEqual({ });
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

  test('handles no relevant fields', () => {
    expect(common.renderSortName({ not: 'used' })).toBe(heavy);
  });
});
