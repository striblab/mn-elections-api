/**
 * Contest class.
 */

// Depedencies
const _ = require('lodash');
const moment = require('moment');
const Candidate = require('./candidate.js');
const Base = require('./base.js');
const utility = require('./common.js');


// Main class
class Contest extends Base {
  // Constructor, takes in either an object to set directly, or a row to parse.
  constructor(input, properties = {}, options = {}) {
    super(options);

    // Setup data
    this.candidates = this.candidates || [];

    // Update properties, such as election-level values like primary
    if (_.isPlainObject(properties)) {
      this.set('', properties, { update: false, validate: false });
    }

    // Check type
    if (_.isString(input)) {
      this.setAll(this.parseSoS(input, properties));
    }
    else if (_.isPlainObject(input)) {
      this.setAll(input);
    }
    else if (input) {
      throw new Error('Input provided was not string or object.');
    }
  }

  // Update gets called on each set
  update() {
    this.set('id', this.id());
    this.updateDistricts();
    this.updateFinal();
    this.updateRanked();
    this.updateNonpartisan();
    this.updateSeats();
    this.updateUncontested();
  }

  // Validate data on a rolling basis, i.e. we may not have all the candidates
  // yet.  Gets automatically called on each set
  validate() {
    if (this.noValidate) {
      return;
    }

    // Check that election field is present
    if (!this.get('election')) {
      throw new Error('election field not present in contest ' + this.id());
    }
    // Check that type field is present
    if (!this.get('type')) {
      throw new Error('type field not present in contest ' + this.id());
    }
    // Check that district field is present
    if (!this.get('district')) {
      throw new Error('district field not present in contest ' + this.id());
    }
    // Check that contest field is present
    if (!this.get('contest')) {
      throw new Error('contest field not present in contest ' + this.id());
    }
    // Check that id field is present
    if (!this.get('id')) {
      throw new Error('id field not present in contest ' + this.id());
    }

    // Seats should be defined; it is by default, but in case somethign changed it
    if (!_.isNumber(this.get('seats')) || this.get('seats') < 1) {
      throw new Error('seats field not present or less than 1 in contest ' + this.id());
    }

    // Name should be defined
    if (!this.get('name')) {
      throw new Error('name field not present in contest ' + this.id());
    }

    // Has candidates
    if (!this.candidates || !this.candidates.length) {
      throw new Error('Candidates is empty ' + this.id());
    }
  }

  // Full validation
  validateAll() {
    if (this.noValidate) {
      return;
    }

    this.validate();

    // Ensure that there is not more than one write-in
    let w = _.filter(this.candidates, { writeIn: true });
    if (w && w.length > 1) {
      throw new Error('More than 1 write-in candidate in contest ' + this.id());
    }
    // Ensure that there is not only a write-in candidate
    if (w && w.length === this.candidates.length) {
      throw new Error('There is only a write-in candidate for contest ' + this.id());
    }
  }

  // Update districts
  updateDistricts() {
    // Only update if not there
    let districts = ['state', 'local', 'school', 'precinct', 'hospital', 'county',
      'countyCommissioner', 'water', 'stateHouse', 'stateSenate', 'congress'];
    _.each(districts, (d) => {
      if (this.get('type') === d && !this.get(d)) {
        this.set(d, this.get('district'));
      }
    });
  }

  // Uncontested
  updateUncontested() {
    // Assuming primary is not uncontested
    if (this.primary) {
      return;
    }

    // Uncontested if the number of non-write-in candidates
    // is equal to the number of seats available
    this.set('uncontested', _.filter(this.candidates, (c) => {
      return !c.get('writeIn');
    }).length === this.get('seats'));
  }

  // Update number of seats
  updateSeats() {
    // If its a primary and non-partisan, it is assumed that there
    // are twice as many seats available as number of candidates that
    // can be voted for.
    if (this.get('primary') && this.get('nonpartisan') && !this.get('question') && this.get('seatsRaw')) {
      this.set('seats', this.get('seatsRaw') * 2);
    }
  }

  // Non partisan
  updateNonpartisan() {
    // Non-partisan is any race that only has NP (no-party) and Write-ins
    this.set('nonpartisan', !_.find(this.candidates, (c) => {
      return c.get('party') && !c.get('party').match(/^(np|wi)$/i);
    }));
  }

  // Final
  updateFinal() {
    this.set('final', this.get('precincts') ? this.get('totalPrecincts') === this.get('precincts') : false);
  }

  // Ranked choice goodness
  updateRanked() {
    if (!this.get('ranked')) {
      return;
    }

    // Get total votes from 1st round
    let firstRound = _.filter(_.map(this.candidates, (c) => {
      return _.find(c.get('ranks'), { rankedChoice: 1 });
    }));
    if (firstRound && firstRound.length) {
      this.set('totalVotes', _.sumBy(firstRound, 'votes'));
    }

    // Get total votes for each round
    let rankedTotalVotes = {};
    this.candidates.forEach((c) => {
      c.ranks.forEach((r) => {
        rankedTotalVotes[r.rankedChoice] = rankedTotalVotes[r.rankedChoice] || 0;
        rankedTotalVotes[r.rankedChoice] = rankedTotalVotes[r.rankedChoice] + r.votes;
      });
    });
    this.set('rankedTotalVotes', rankedTotalVotes);

    // Note that SoS data does not provide the final counts for ranked choice,
    // and it assumed that that information comes in from supplemented
    // sources.
  }

  // Update the whole contest properties with possible candidates array
  setAll(data = {}, options) {
    if (!_.isPlainObject(data)) {
      throw new Error('Non-object provided to update.');
    }
    if (data.candidates) {
      this.candidatesSet(data.candidates);
      delete data.candidates;
    }

    this.set('', data, options);
  }

  // Set candidate
  candidateSet(candidate) {
    if (_.isPlainObject(candidate)) {
      candidate = new Candidate(candidate, this);
    }
    if (!(candidate instanceof Candidate)) {
      throw new Error('Candidate provided to candidateSet is not an instance of Candidate.');
    }
    if (!candidate.get('id')) {
      throw new Error('Candidate provided to candidateSet does not have an id.');
    }

    // Check if already present.
    let existing = this.candidateGetIndex(candidate.get('id'));
    if (~existing) {
      this.candidates[existing].set('', candidate.toJSON());
    }
    else {
      this.candidates.push(candidate);
    }
  }

  // Set multiple candidates
  candidatesSet(candidates) {
    if (!_.isArray(candidates)) {
      throw new Error('Non-array provided to candidateSet: ' + candidates);
    }

    _.each(candidates, (c) => {
      this.candidateSet(c);
    });
  }

  // Get candidate
  candidateGet(entry) {
    return _.find(this.candidates, (c) => {
      return entry === c.get('id');
    });
  }

  // Get candidate index
  candidateGetIndex(entry) {
    return _.findIndex(this.candidates, (c) => {
      return entry === c.get('id');
    });
  }

  // Get all candidates
  candidatesGet() {
    return this.candidates;
  }

  // Make contest ID
  id(contest) {
    contest = contest || this._props;
    return utility.makeID([contest.election, contest.type, contest.district,
      contest.contest]);
  }

  // Make entry ID
  candidateID(candidate, contest) {
    contest = contest || this._props;
    return utility.makeID([contest.election, contest.type, contest.district,
      contest.contest, candidate.candidate]);
  }

  // Default properties
  defaults() {
    return {
      primary: false,
      ranked: false,
      seats: 1,
      uncontested: false,
      called: false,
      final: false,
      nonpartisan: false,
      question: false,
      supplemented: false,
      updated: moment().unix()
    };
  }

  // To JSON
  toJSON() {
    let p = JSON.parse(JSON.stringify(this._props));
    p.candidates = _.map(this.candidates, (c) => {
      return c.toJSON();
    });
    return p;
  }

  // Parse row from Secretary of State
  parseSoS(input, properties = {}) {
    if (!_.isString(input)) {
      throw new Error('Non-string provided to parseSoS');
    }
    if (!_.isPlainObject(properties)) {
      throw new Error('Non-object provided to properties in parseSoS');
    }

    // This is a ;-delimited row
    let parts = input.split(';');

    // Put together parts
    let d = {
      state: utility.raw(parts[0]),
      county: utility.padLeft(utility.raw(parts[1]), 2),
      precinct: utility.padLeft(utility.raw(parts[2]), 4),
      contest: utility.padLeft(utility.raw(parts[3]), 4),
      nameRaw: utility.raw(parts[4]),
      district: utility.raw(parts[5]),
      candidate: utility.padLeft(utility.raw(parts[6]), 4),
      candidateNameRaw: utility.raw(parts[7]),
      suffix: utility.raw(parts[8]),
      incumbent: utility.raw(parts[9]),
      party: utility.raw(parts[10]),
      precincts: utility.raw(parts[11], 'int'),
      totalPrecincts: utility.raw(parts[12], 'int'),
      votes: utility.raw(parts[13], 'int'),
      percent: utility.raw(parts[14], 'float'),
      totalVotes: utility.raw(parts[15], 'int')
    };

    // Parse candidate name
    let candidate = this.parseCandidate(d.candidateNameRaw);

    // Parse/format contest.
    let o = this.parseSoSContest(d.nameRaw);
    if (o) {
      d.name = o.name;
      d.area = o.area;
      d.seatsRaw = o.seats;
      d.seats = o.seats;
      d.question = o.question;
      d.ranked = o.ranked;
      d.rankedChoice = o.rankedChoice;
    }

    // SoS assigns a different office/contest ID for
    // each choice, so update to the same one
    if (d.ranked) {
      d.contest = d.contest.replace(/.$/, '1');
    }

    // If a state-wide race, set district to something more
    // meaningful
    if (~['mn-president', 'amendment', 'state'].indexOf(properties.type)) {
      d.dsitrctID = 'MN';
    }

    // Set contest level values
    let contest = _.pick(d, ['state', 'county', 'precinct',
      'contest', 'district', 'precincts', 'totalPrecincts',
      'name', 'nameRaw', 'area', 'seatsRaw', 'seats', 'question', 'ranked']);

    // Compile candidate
    candidate = _.extend(candidate, _.pick(d, ['candidate', 'candidateNameRaw', 'votes', 'percent', 'party']));
    candidate.id = this.candidateID(candidate, _.extend({}, properties, contest));

    // Ranked choice
    if (d.ranked) {
      candidate.ranks = [_.pick('rankedChoice', 'votes', 'percent')];
    }

    contest.candidates = [candidate];
    return contest;
  }
}

// Export
module.exports = Contest;
