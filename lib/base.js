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
    this.noValidate = _.isBoolean(options.noValidate) ? options.noValidate : false;
    this.exportPath = _.isString(options.exportPath) ? options.exportPath : path.join(__dirname, '..', 'export');

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
    fs.writeFileSync(path.join(...[this.exportPath, ...dir, file]),
      _.isString(data) ? data :
      _.isPlainObject(data) && data.toJSON ? JSON.stringify(data.toJSON()) :
      JSON.stringify(data));
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
        // Union by function
        else if (_.isArray(dest) && _.isFunction(options.arrayMethod)) {
          return _.unionWith(source, dest, options.arrayMethod);
        }
        // Replace
        else if (_.isArray(dest) && options.arrayMethod === 'replace') {
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
    if (_.isFunction(this.validate) && !this._updating && options.validate && !this.noValidate) {
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
      throw new Object('Key not provided as string.');
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

    // Parse
    let p = parseName(input);

    // TODO: Cleanup with regards to Star Tribune styles

    // Clean up errors
    if (p.error && p.error.length === 0) {
      delete p.error;
    }

    // Cleanup empty
    _.each(p, (v, k) => {
      if (!v) {
        delete p[k];
      }
    });

    return p;
  }

  // Parse contest name that comes from SoS
  parseSoSContest(input) {
    if (!_.isString(input)) {
      throw new Error('Non-string provided to parseOffice: ' + input);
    }

    // Ranked choice translations
    let choiceTranslations = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'nineth': 9, 'tenth': 10, 'final': 100 };

    // Get main parts
    let m = input.match(/(^[^\(]+?)\s*(\([^\(]*\))?\s*(\([^\(]*\))?$/i);

    // Get parts that are not in parenthese and determine ranked choice
    // and compile office name.
    let parts = m[1].trim().replace(/\s+/g, ' ').split(' ');
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

    return {
      name: name,
      area: area ? area.replace('(', '').replace(')', '') : undefined,
      seats: seats,
      question: !!input.match(/.*question.*/i),
      ranked: ranked,
      rankedChoice: ranked ? choiceTranslations[parts[parts.length - 2].toLowerCase()] : undefined
    };
  }
}


module.exports = Base;
