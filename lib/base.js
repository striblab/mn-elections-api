/**
 * Base class for other classes.
 */

// Depedencies
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const _ = require('lodash');
const parseName = require('parse-full-name').parseFullName;

// Main Base class
class Base {
  constructor(options = {}) {
    this._props = {};

    // Options
    this.options = options;
    this.noValidate = _.isBoolean(options.noValidate)
      ? options.noValidate
      : false;
    this.exportPath = _.isString(options.exportPath)
      ? options.exportPath
      : path.join(__dirname, '..', 'mn-elections-output');

    // Defaults
    if (_.isFunction(this.defaults)) {
      this._props = this.defaults();
    }
  }

  // Save export
  export(data, ...paths) {
    let dir = [...paths];
    let file = dir.pop();

    mkdirp.sync(path.join(...[this.exportPath, ...dir]));
    fs.writeFileSync(
      path.join(...[this.exportPath, ...dir, file]),
      _.isString(data)
        ? data
        : _.isObject(data) && data.toJSON
          ? JSON.stringify(data.toJSON())
          : JSON.stringify(data)
    );
  }

  // Get file
  import(...paths) {
    let f = path.join(...[this.exportPath, ...paths]);
    if (!fs.existsSync(f)) {
      return false;
    }
    else {
      return JSON.parse(fs.readFileSync(f, 'utf-8'));
    }
  }

  // Set property, merge if object
  set(key, value, options = {}) {
    options = _.defaults(options, {
      merge: true,
      arrayMethod: 'concat',
      update: true,
      validate: true
    });

    if (!_.isString(key)) {
      throw new Error('Key not provided as string.');
    }
    if (key === '' && !_.isPlainObject(value)) {
      throw new Error('Empty key provided but value is not object.');
    }

    // Check merge
    if (options.merge && _.isPlainObject(value)) {
      value = _.mergeWith(_.cloneDeep(this.get(key)), value, (dest, source) => {
        // Just concatenate
        if (_.isArray(dest) && options.arrayMethod === 'concat') {
          return dest.concat(source);
        }
        else if (_.isArray(dest) && _.isFunction(options.arrayMethod)) {
          // Union by function
          return _.unionWith(source, dest, options.arrayMethod);
        }
        else if (_.isArray(dest) && options.arrayMethod === 'replace') {
          // Replace
          return source;
        }
      });
    }

    // If no key is provided, assume its the whole thing
    if (!key && _.isPlainObject(value)) {
      this._props = _.cloneDeep(value);
    }
    else {
      _.set(this._props, key, value);
    }

    // If update function exists
    if (_.isFunction(this.update) && !this._updating && options.update) {
      this.noUpdate(this.update);
    }

    // Validate
    if (
      _.isFunction(this.validate) &&
      !this._updating &&
      options.validate &&
      !this.noValidate
    ) {
      this.validate();
    }

    return this._props;
  }

  // Set, but don't set any empty values
  setGently(key, value, options = {}) {
    // If empty value, then don't do anything
    if (value === '' || _.isNil(value)) {
      return this._props;
    }
    else if (_.isPlainObject(value)) {
      _.each(value, (v, k) => {
        if (value === '' || _.isNil(value)) {
          delete value[k];
        }
      });
    }

    return this.set(key, value, options);
  }

  // Get property
  get(key) {
    if (!_.isString(key)) {
      throw new Error('Key not provided as string.');
    }
    return key ? _.get(this._props, key) : this._props;
  }

  // To JSON
  toJSON() {
    return JSON.parse(JSON.stringify(this._props));
  }

  // Wrapper to ensure no updates happen.
  // TODO: Handle async
  noUpdate(updates) {
    this._updating = true;
    _.bind(updates, this)();
    this._updating = false;
  }

  // Handle caught error
  passError(e) {
    if (e) {
      throw e;
    }
  }

  // Parse candidate into parts
  parseCandidate(input) {
    if (!_.isString(input)) {
      throw new Error('Non-string provided to parseCandidate: ' + input);
    }
    if (input.match(/write(-| )*in.*/i)) {
      return { writeIn: true };
    }

    // Clean parsing
    function cleanNameParsed(parsed) {
      // Clean up errors
      if (parsed.error && parsed.error.length === 0) {
        delete parsed.error;
      }

      // Cleanup empty
      _.each(parsed, (v, k) => {
        if (!v) {
          delete parsed[k];
        }
      });

      return parsed;
    }

    // Handle running mate
    if (input.match(/ and /)) {
      let parts = input.split(' and ');
      let p = cleanNameParsed(parseName(parts[0]));
      p.runningMate = cleanNameParsed(parseName(parts[1]));

      return p;
    }

    // TODO: Cleanup with regards to Star Tribune styles
    return cleanNameParsed(parseName(input));
  }

  // Parse party code.  Note that there are "N P" party codes that
  // (maybe) refer to non-partisan races where the candidate
  // declares a party, but the PartyTbl.txt file uses that code
  // over and over so, there's ability to match.
  parseSoSParty(input) {
    return _.isString(input)
      ? input.replace(/\s+/, '').toUpperCase()
      : undefined;
  }

  // Parse contest name that comes from SoS
  parseSoSContest(input) {
    if (!_.isString(input)) {
      throw new Error('Non-string provided to parseOffice: ' + input);
    }

    // Ranked choice translations
    let choiceTranslations = {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
      sixth: 6,
      seventh: 7,
      eighth: 8,
      nineth: 9,
      tenth: 10,
      final: 100
    };

    // Get main parts
    let m = input.match(/(^[^(]+?)\s*(\([^(]*\))?\s*(\([^(]*\))?$/i);

    // Get parts that are not in parenthese and determine ranked choice
    // and compile office name.
    let parts = m[1]
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ');
    let ranked = !!parts[parts.length - 1].trim().match(/choice/i);
    let name = ranked ? parts.slice(0, -2).join(' ') : parts.join(' ');

    // Look to see if there is an elected part (this could be more efficient)
    let area = undefined;
    let seats = 1;
    if (m[2] && m[2].match(/elect ([0-9]+)/i)) {
      seats = parseInt(m[2].match(/elect ([0-9]+)/i)[1], 10);
      area = m[3];
    }
    else if (m[3] && m[3].match(/elect ([0-9]+)/i)) {
      seats = parseInt(m[3].match(/elect ([0-9]+)/i)[1], 10);
      area = m[2];
    }
    else {
      area = m[2] || m[3] || null;
    }

    // Sub area (i.e. ward 2)
    let subArea = undefined;
    _.find(
      [
        /\s((ward|district)\s[0-9]+)(\s|$)/i,
        /\s((ward|district)\s[a-z])(\s|$)/i,
        /\s[a-z]+\s(district\s[0-9])(\s|$)/i,
        /\s[a-z]+\s(district\s[a-z])(\s|$)/i
      ],
      toMatch => {
        let m = name.match(toMatch);
        if (m) {
          subArea = m[0].trim();
          name = name.replace(m[0], '');

          // Only match first
          return true;
        }
      }
    );

    // Seat name (i.e. Council Member at Large A, School Question 1)
    let seatName = undefined;
    _.find([/\s([a-d]+|[0-9]+)$/i], toMatch => {
      let m = name.match(toMatch);
      if (m) {
        seatName = m[0].trim();
        name = name.replace(new RegExp(`${m[0]}$`), '');
        return true;
      }
    });

    // Special contest
    let special = name.match(/special\selection\sfor/i) ? true : undefined;

    return {
      name: name,
      area: area ? area.replace('(', '').replace(')', '') : undefined,
      subArea: subArea,
      seatName: seatName,
      seats: seats,
      seatsRaw: seats,
      special: special,
      question: !!input.match(/.*question.*/i),
      ranked: ranked,
      rankedChoice: ranked
        ? choiceTranslations[parts[parts.length - 2].toLowerCase()]
        : undefined
    };
  }
}

module.exports = Base;
