/**
 * Test Base class
 */

// Implicit depedences
/* global describe, test, expect */

// To test
const Base = require('../lib/base.js');

// toJSON function
describe('lib/base | toJSON', () => {
  let base = (...args) => {
    let b = new Base();
    b.set(...args);
    return b.toJSON();
  };

  test('should produce cloned object', () => {
    expect(base('', { a: 'b' })).toEqual({ a: 'b' });
    expect(base('', { a: 'b', c: [1, 2] })).toEqual({ a: 'b', c: [1, 2] });
  });
});

// Get function
describe('lib/base | get', () => {
  let base = (...args) => {
    let b = new Base();
    return b.get(...args);
  };
  let shouldThrow = (...args) => {
    return () => {
      return base(...args);
    };
  };

  test('throw error for non string key', () => {
    expect(shouldThrow(1)).toThrow(/provided/);
    expect(shouldThrow(1.0)).toThrow(/provided/);
    expect(shouldThrow(true)).toThrow(/provided/);
    expect(shouldThrow({})).toThrow(/provided/);
    expect(shouldThrow([])).toThrow(/provided/);
    expect(shouldThrow(null)).toThrow(/provided/);
    expect(shouldThrow(undefined)).toThrow(/provided/);
  });

  test('get properties', () => {
    let b = new Base();
    b.set('', { a: 'b', c: { d: ['e', 'f', { g: 'i' }] } });

    expect(b.get('')).toEqual({ a: 'b', c: { d: ['e', 'f', { g: 'i' }] } });
    expect(b.get('a')).toBe('b');
    expect(b.get('c.d[2].g')).toBe('i');
  });
});

// Set function
describe('lib/base | set', () => {
  let base = (...args) => {
    let b = new Base();
    return b.set(...args);
  };
  let shouldThrow = (...args) => {
    return () => {
      return base(...args);
    };
  };

  test('throw error for non string key', () => {
    expect(shouldThrow(1)).toThrow(/provided/);
    expect(shouldThrow(1.0)).toThrow(/provided/);
    expect(shouldThrow(true)).toThrow(/provided/);
    expect(shouldThrow({})).toThrow(/provided/);
    expect(shouldThrow([])).toThrow(/provided/);
    expect(shouldThrow(null)).toThrow(/provided/);
    expect(shouldThrow(undefined)).toThrow(/provided/);
    expect(shouldThrow(undefined, {})).toThrow(/provided/);
    expect(shouldThrow(1, {})).toThrow(/provided/);
  });

  test('throw error for empty key, but non-object', () => {
    expect(shouldThrow('', 1)).toThrow(/provided/);
    expect(shouldThrow('', 1.0)).toThrow(/provided/);
    expect(shouldThrow('', true)).toThrow(/provided/);
    expect(shouldThrow('', [])).toThrow(/provided/);
    expect(shouldThrow('', null)).toThrow(/provided/);
    expect(shouldThrow('', undefined)).toThrow(/provided/);
  });

  test('set single property', () => {
    expect(base('k', 'v')).toEqual({ k: 'v' });
    expect(base('k[0]', 'v')).toEqual({ k: ['v'] });
    expect(base('k.j', 2)).toEqual({ k: { j: 2 } });
    expect(base('k', { a: 'b' })).toEqual({ k: { a: 'b' } });
  });

  test('set the whole thing', () => {
    expect(base('', { a: 'b' })).toEqual({ a: 'b' });
    expect(base('', { a: 'b', c: [1, 2] })).toEqual({ a: 'b', c: [1, 2] });
  });

  test('delete property', () => {
    let b = new Base();

    b.set('a', 2);
    expect(b.get('a')).toBe(2);

    b.set('a', undefined);
    expect(b.get('a')).toBeUndefined();
  });

  test('merging', () => {
    let b = new Base();

    let a = b.set('', { a: 'b' });
    expect(a).toEqual({ a: 'b' });

    a = b.set('', { b: 'c' });
    expect(a).toEqual({ a: 'b', b: 'c' });

    a = b.set('', { b: 'e' });
    expect(a).toEqual({ a: 'b', b: 'e' });

    a = b.set('', { b: 'c' });
    expect(a).toEqual({ a: 'b', b: 'c' });

    a = b.set('', { b: 'c' }, { merge: false });
    expect(a).toEqual({ b: 'c' });

    a = b.set('', { c: ['d'], d: { e: 'f' } });
    expect(a).toEqual({ b: 'c', c: ['d'], d: { e: 'f' } });

    a = b.set('d', { f: 'g' });
    expect(a).toEqual({ b: 'c', c: ['d'], d: { e: 'f', f: 'g' } });

    a = b.set('d', { g: 99 }, { merge: false });
    expect(a).toEqual({ b: 'c', c: ['d'], d: { g: 99 } });
  });

  test('merging with arrays', () => {
    let b = new Base();

    let a = b.set('', { a: [1, 2, 3, 4] });
    expect(a).toEqual({ a: [1, 2, 3, 4] });

    a = b.set('', { a: [5] });
    expect(a).toEqual({ a: [1, 2, 3, 4, 5] });

    a = b.set('', { a: [6] }, { arrayMethod: 'replace' });
    expect(a).toEqual({ a: [6] });

    a = b.set(
      '',
      { a: [6, 8, 8] },
      {
        arrayMethod: (a, b) => {
          return a === b;
        }
      }
    );
    expect(a).toEqual({ a: [6, 8] });
  });
});

// Set gentle
describe('lib/base | setGently', () => {
  let base = (...args) => {
    let b = new Base();
    return b.setGently(...args);
  };

  test('set regular', () => {
    expect(base('k', 'v')).toEqual({ k: 'v' });
    expect(base('k[0]', 'v')).toEqual({ k: ['v'] });
    expect(base('k.j', 2)).toEqual({ k: { j: 2 } });
    expect(base('k', { a: 'b' })).toEqual({ k: { a: 'b' } });
  });

  test('gentle set single property', () => {
    let b = new Base();
    b.set('k', 'v');

    expect(b.setGently('k', '')).toEqual({ k: 'v' });
    expect(b.setGently('k', undefined)).toEqual({ k: 'v' });
    expect(b.setGently('k', null)).toEqual({ k: 'v' });

    expect(b.setGently('k', 1)).toEqual({ k: 1 });
    expect(b.setGently('k', 1.0)).toEqual({ k: 1.0 });
  });

  test('gentle set objects', () => {
    let b = new Base();
    b.set('a.b', 'c');

    expect(b.setGently('', { a: undefined })).toEqual({ a: { b: 'c' } });
  });
});

// Parse candidate function
describe('lib/base | parseCandidate', () => {
  let base = new Base();

  test('non-string throws error', () => {
    expect(() => {
      base.parseCandidate(1);
    }).toThrow(/provided/);
    expect(() => {
      base.parseCandidate(1.0);
    }).toThrow(/provided/);
    expect(() => {
      base.parseCandidate(true);
    }).toThrow(/provided/);
    expect(() => {
      base.parseCandidate({});
    }).toThrow(/provided/);
    expect(() => {
      base.parseCandidate([]);
    }).toThrow(/provided/);
    expect(() => {
      base.parseCandidate(null);
    }).toThrow(/provided/);
    expect(() => {
      base.parseCandidate(undefined);
    }).toThrow(/provided/);
  });

  test('handles write-in', () => {
    expect(base.parseCandidate('WRITE-IN')).toEqual({ writeIn: true });
    expect(base.parseCandidate('WRITE IN')).toEqual({ writeIn: true });
    expect(base.parseCandidate('WRITEIN')).toEqual({ writeIn: true });
    expect(base.parseCandidate('WRITE-IN**')).toEqual({ writeIn: true });
    expect(base.parseCandidate('**write---in**')).toEqual({ writeIn: true });
  });

  test('handles names', () => {
    // Gets run through styleName
    expect(base.parseCandidate('MR. HANDY')).toEqual({
      last: 'Handy',
      title: 'Mr.'
    });
    expect(base.parseCandidate('MR HANDY')).toEqual({
      last: 'Handy',
      title: 'Mr'
    });
    expect(base.parseCandidate('MR HANDY JR')).toEqual({
      last: 'Handy',
      suffix: 'Jr',
      title: 'Mr'
    });
    expect(base.parseCandidate('Star Tribune')).toEqual({
      last: 'Tribune',
      first: 'Star'
    });
    expect(base.parseCandidate('Fir B Lass')).toEqual({
      last: 'Lass',
      first: 'Fir',
      middle: 'B'
    });
    expect(base.parseCandidate('Nicky "Nikster" Nickson')).toEqual({
      last: 'Nickson',
      first: 'Nicky',
      nick: 'Nikster'
    });
  });
});

// Parse office function
describe('lib/base | parseSoSContest', () => {
  let base = new Base();

  test('non-string returns null', () => {
    expect(() => {
      base.parseSoSContest(1);
    }).toThrow(/provided/);
    expect(() => {
      base.parseSoSContest(1.0);
    }).toThrow(/provided/);
    expect(() => {
      base.parseSoSContest(true);
    }).toThrow(/provided/);
    expect(() => {
      base.parseSoSContest({});
    }).toThrow(/provided/);
    expect(() => {
      base.parseSoSContest([]);
    }).toThrow(/provided/);
    expect(() => {
      base.parseSoSContest(null);
    }).toThrow(/provided/);
    expect(() => {
      base.parseSoSContest(undefined);
    }).toThrow(/provided/);
  });

  test('handles regular office', () => {
    expect(base.parseSoSContest('office for something')).toEqual({
      name: 'office for something',
      seats: 1,
      question: false,
      ranked: false
    });
  });

  test('handles area', () => {
    expect(base.parseSoSContest('office for something (Area 54)')).toEqual({
      name: 'office for something',
      area: 'Area 54',
      seats: 1,
      question: false,
      ranked: false
    });
  });

  test('handles question (and area)', () => {
    expect(base.parseSoSContest('Question 100 (Area #1)')).toEqual({
      name: 'Question 100',
      area: 'Area #1',
      seats: 1,
      question: true,
      ranked: false
    });

    expect(base.parseSoSContest('CITY QUESTION 100 (Area #1)')).toEqual({
      name: 'CITY QUESTION 100',
      area: 'Area #1',
      seats: 1,
      question: true,
      ranked: false
    });
  });

  test('handles ranked choice', () => {
    expect(base.parseSoSContest('office for something First choice')).toEqual({
      name: 'office for something',
      seats: 1,
      question: false,
      ranked: true,
      rankedChoice: 1
    });
  });

  test('handles seats', () => {
    expect(base.parseSoSContest('office for $$ (Elect 3)')).toEqual({
      name: 'office for $$',
      seats: 3,
      question: false,
      ranked: false
    });
  });

  test('handles seats, ranked choice, and area', () => {
    expect(
      base.parseSoSContest('ANOTHER OFFICE Fourth Choice (Area) (Elect 33)')
    ).toEqual({
      name: 'ANOTHER OFFICE',
      area: 'Area',
      seats: 33,
      question: false,
      ranked: true,
      rankedChoice: 4
    });

    expect(
      base.parseSoSContest('ANOTHER OFFICE Fourth Choice (Elect 33) (Area)')
    ).toEqual({
      name: 'ANOTHER OFFICE',
      area: 'Area',
      seats: 33,
      question: false,
      ranked: true,
      rankedChoice: 4
    });
  });
});
