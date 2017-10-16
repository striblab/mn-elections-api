/**
 * Candidate class.
 */

// Depedencies
const _ = require('lodash');
const Base = require('./base.js');

// Main class
class Candidate extends Base {
  // Constructor
  constructor(input, contest) {
    super(input);

    // Check type
    if (input && !_.isPlainObject(input)) {
      throw new Error('Input provided to Candidate was not object.');
    }
    // Circular depdency if we include the contest module
    if (!contest || !_.isObject(contest)) {
      throw new Error('Contest provided was not an object.');
    }

    // Connect
    this.contest = contest;

    // Update
    this.set('', input || {});
  }

  // On set
  update() {
    this.updateNames();
    this.updateRanks();
  }

  // Update ranks
  validate() {
    // Get current ranks
    let ranks = this.get('ranks');

    // Check for ranks if ranked choice
    if (this.contest.get('ranked') && (!ranks || !ranks.length)) {
      throw new Error(
        'Contest marked as ranked choice, but candidate does not have ranks. ' +
          this.contest.get('contestID') +
          ' | ' +
          this.get('entryID')
      );
    }
  }

  // Get override for computed/overriden
  get(key) {
    let e = super.get(key);

    if (!e && key === 'display') {
      return this.displayName(true);
    }
    else if (!e && key === 'sort') {
      return this.sortName(true);
    }

    return e;
  }

  // Update names
  updateNames() {
    this.set(
      'middle',
      this.get('middle')
        ? this.get('middle').replace(/^([a-z])$/i, '$1.')
        : undefined
    );
    this.set(
      'suffix',
      this.get('suffix')
        ? this.get('suffix').replace(/(jr|sr)\.?/i, '$1.')
        : undefined
    );
    this.set(
      'title',
      this.get('title')
        ? this.get('title').replace(/(mrs|miss|ms|mr)\.?/i, '')
        : undefined
    );
  }

  // Keep ranks in order
  updateRanks() {
    if (this.get('ranks')) {
      this.set('ranks', _.sortBy(this.get('ranks'), 'rankedChoice'));
    }
  }

  // Create display name
  displayName(viaGet = false) {
    // Display property overrides
    if (!viaGet && this.get('display')) {
      return this.get('display');
    }
    else if (this.get('writeIn')) {
      // Write-in
      return 'Write-in';
    }

    return _.filter([
      this.get('title'),
      this.get('prefix'),
      this.get('first'),
      this.get('middle'),
      this.get('nick') ? '"' + this.get('nick') + '"' : null,
      this.get('last'),
      this.get('suffix')
    ]).join(' ');
  }

  // Create sort name
  sortName(viaGet = false) {
    let heavy = 'zzzzz';

    // Override if sort property provided
    if (!viaGet && this.get('sort')) {
      return this.get('sort');
    }
    else if (this.get('writeIn')) {
      // Write in shoudl be last
      return heavy;
    }
    else if (!this.get('last') && !this.get('first') && !this.get('middle')) {
      // If there are name parts, return heavy
      return heavy;
    }
    else if (this.contest.get('question') && this.get('last') === 'No') {
      // If question, No should be last
      return heavy;
    }

    return _.filter([
      this.get('last'),
      this.get('first'),
      this.get('middle')
    ]).join(' ');
  }

  // Sort by party value, prioritize major parties.
  sortParty() {
    return this.get('party').match(/^(dfl|d|r)$/i)
      ? 'AAAAAA' + this.get('party')
      : this.get('party');
  }

  // Make candidate ID
  id(contest, candidate) {
    contest = contest || this.contest;
    candidate = candidate || this;
    return contest.candidateID(candidate);
  }

  // Defaults
  defaults() {
    return {
      writeIn: false,
      supplemented: false,
      winner: false
    };
  }
}

// Export
module.exports = Candidate;
