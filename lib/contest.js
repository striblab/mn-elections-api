/**
 * Contest class.
 */

// Depedencies
const _ = require('lodash');
const moment = require('moment');
const Candidate = require('./candidate.js');
const Base = require('./base.js');
const utility = require('./utility.js');


// Main class
class Contest extends Base {
  // Constructor, takes in either an object to set directly, or a row to parse.
  constructor(input, properties = {}, options = {}, election) {
    super(options);

    // Setup data
    this.candidates = this.candidates || [];
    this.election = election;

    // Manual properties, such as type
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
    this.set('updated', moment().unix());
    this.updateNames();
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

    // Check type
    if (!this.types()[this.get('type')]) {
      throw new Error('Type not valid for contest ' + this.id());
    }
    // Check that election field is present
    if (!this.election) {
      throw new Error('Election object not present in contest ' + this.id());
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

  // Match with supplement data
  supplement(supplement) {
    // Checks
    if (!_.isObject(supplement)) {
      throw new Error('supplement provided is not an object.');
    }
    if ((!supplement.contests || !supplement.contests.length) &&
      (!supplement.candidates || !supplement.candidates.length)) {
      return false;
    }

    // Find contest match
    let e = _.find(supplement.contests, (c) => {
      return c.id === this.id();
    });
    if (e) {
      this.setGently('', e);
    }

    // Find candidates
    _.each(this.candidates, (candidate) => {
      let e = _.find(supplement.candidates, (c) => {
        return c.id === candidate.id();
      });
      if (e) {
        candidate.setGently('', e);
      }
    });
  }

  // Match contest to set of metadata
  matchMeta(meta) {
    _.each(meta, (m) => {
      // Question
      if (this.get('question') && m.get('set') === 'questions' &&
        this.id() === m.get('contestID')) {
        this.question = m;

        this.set('questionTitle', m.get('questionTitle'));
        this.set('questionText', m.get('questionText'));
      }
      // Districts. There can be multiple districts per contest.
      else if (m.get('set') === 'districts' &&
        this.districtMatchType() === m.get('type') &&
        this.districtMatch() === m.get('contestMatch')) {
        this.districts = this.districts || [];
        this.districts.push(m);
      }
    });

    // Update area with districts
    if (this.districts && this.districts.length) {
      this.set('areaRaw', this.get('area'));
      let o = this.get('areaRaw');
      let n = _.uniq(_.filter(_.map(this.districts, (d) => {
        return d.get('name');
      }))).join(', ');

      // If the old area is different, then put together
      if (!n) {
        this.set('area', o);
      }
      else if (!o || ~n.toLowerCase().indexOf(o.toLowerCase())) {
        this.set('area', n);
      }
      else {
        this.set('area', n + ' (' + o + ')');
      }
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

    // If called, make sure there is a winner, as called should be a
    // manual process.
    if (this.get('called') && !_.find(this.candidates, (c) => {
      return c.get('winner');
    })) {
      throw new Error('Contest is called but not winner was provided ' + this.id());
    }
  }

  // Winner, determine winners.  Always ensure that a writeIn does not win.
  updateWinners() {
    // Ensure candidates are sorted
    this.candidates = this.candidatesSort();

    // We don't automatically determine winners for called contests.
    if (this.get('called')) {
      return;
    }

    // Uncontested and not-final (primary by party as well)
    if (this.get('uncontested') && !this.get('final')) {
      // TODO: Determine policy
    }

    // We don't automatically determine winners for non-final contests.
    if (!this.get('final')) {
      return;
    }

    // If primary then break into separate parties
    if (this.election.get('primary')) {
      // Note: In theory there should be no partisan parties (NP)
      this.candidates = _.flatten(_.map(_.groupBy(this.candidates, (c) => {
        return c.get('party');
      }), (candidates) => {
        return this.candidatesWinner(candidates);
      }));
    }
    else {
      this.candidates = this.candidatesWinner();
    }

    // Ensure candidates are sorted
    this.candidates = this.candidatesSort();
  }

  // Mark winners for a specific set of candidates
  candidatesWinner(candidates) {
    candidates = candidates || this.candidates;

    // We don't automatically determine winners for called contests.
    if (this.get('called') || !this.get('final')) {
      return;
    }

    // Determine winners
    candidates = _.map(this.candidatesSort(candidates), (c, ci) => {
      // For ranked choice voting.
      // The SoS data is only the number of votes in each place,
      // This makes it impossible to know the winner, as all ballots
      // are needed for that.  Except if someone has more than 50%.
      // (If more than 1 seat, we can't say either)
      let first = _.find(c.get('ranks'), { rankedChoice: 1 });
      if (this.get('ranked') && !c.get('writeIn') &&
        this.get('seats') === 1 && ci === 0 && first && first.percent > 50) {
        c.set('winner', true);
      }
      // Otherwise, if not ranked, and final, mark the seats
      else if (!this.get('ranked') && !c.get('writeIn') && ci < this.get('seats')) {
        c.set('winner', true);
      }
      else {
        c.set('winner', false);
      }

      return c;
    });

    // But there could be ties or very close.  Get a list of all winning votes, and if a
    // loser has close, mark contest.
    let losers = _.reject(candidates, (c) => { return c.get('winner') || c.get('writeIn'); });
    if (losers && losers.length) {
      let leastWinningVotes = _.min(_.map(_.filter(candidates, (c) => {
        return c.get('winner');
      }), (c) => {
        return c.get('votes');
      }));
      let totalVotes = _.sumBy(candidates, (c) => {
        return c.get('votes');
      });

      if (leastWinningVotes && totalVotes) {
        // Check losers
        _.each(losers, (c) => {
          // This logic is not exact for the statute, but more conservative
          // https://www.revisor.mn.gov/statutes/?id=204C.35
          if (totalVotes <= 400 && Math.abs((c.get('votes') - leastWinningVotes) / totalVotes) < (10 / 400)) {
            this.set('close', true);
          }
          else if (Math.abs((c.get('votes') - leastWinningVotes) / totalVotes) < 0.005) {
            this.set('close', true);
          }
        });
      }
    }

    return candidates;
  }

  // Sort the candidates first by party if primary, then by number
  // of canididate votes, then by ranked votes, then name
  candidatesSort(candidates) {
    candidates = candidates || this.candidates;
    candidates = _.orderBy(candidates, [
      (c) => { return this.election.get('primary') ? c.sortParty() : undefined; },
      (c) => { return c.get('winner') ? 'AAAAAA' : 'zzzzzz'; },
      (c) => { return c.get('votes'); },
      (c) => {
        let ranks = c.get('ranks');
        let first = ranks ? _.find(ranks, { rankedChoice: 1 }) : undefined;
        if (first && !c.get('votes')) {
          return first.votes;
        }
        return c.get('votes');
      },
      (c) => { return c.sortName(); }
    ], ['asc', 'asc', 'desc', 'desc', 'asc']);

    return candidates;
  }

  // Update names
  updateNames() {
    // Area changes
    let area = this.get('area');
    if (area) {
      area = area.replace(/(^|[^a-zA-Z0-9])(st|saint|st\.)\s/i, '$1St. ');
      area = area.replace(/(^|[^a-zA-Z0-9])(isd)\s/i, '$1ISD ');
      area = area.replace(/\s+/g, ' ');
      this.set('area', area.trim());
    }

    // Contest name changes
    let name = this.get('name');
    if (name) {
      name = utility.titleCase(name.toLowerCase());
      name = name.replace(/u\.s\.\s/gi, 'U.S. ');
      name = name.replace(/\s+/g, ' ');
      this.set('name', name.trim());
    }
  }

  // Update districts
  updateDistricts() {
    // Only update if not there
    let districts = ['state', 'local', 'school', 'precinct', 'hospital', 'county',
      'countyCommissioner', 'water', 'stateHouse', 'stateSenate', 'congress'];
    _.each(districts, (d) => {
      if (_.camelCase(this.get('type')) === d && !this.get(d)) {
        this.set(d, this.get('district'));
      }
    });
  }

  // Uncontested
  updateUncontested() {
    // Assuming primary is not uncontested
    if (this.election.get('primary')) {
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
    if (this.election.get('primary') && this.get('nonpartisan') && !this.get('question') && this.get('seatsRaw')) {
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
    return utility.makeID([this.election.get('id'), contest.type,
      contest.district ? contest.district.toLowerCase() : contest.district,
      contest.contest]);
  }

  // Make candidate ID
  candidateID(candidate, contest) {
    contest = contest || this._props;
    return utility.makeID([this.election.get('id'), contest.type,
      contest.district ? contest.district.toLowerCase() : contest.district,
      contest.contest,
      candidate.get ? candidate.get('candidate') : candidate.candidate]);
  }

  // Make district match ID
  districtMatch() {
    return this.get('type') === 'county-commissioner' ?
      utility.makeID([this.election.get('id'), 'county', this.get('county')]) :
      utility.makeID([this.election.get('id'), this.get('type'), this.get('district')]);
  }

  // Make district match type
  districtMatchType() {
    return this.get('type') === 'county-commissioner' ?
      'county' :
      this.get('type');
  }

  // Default properties
  defaults() {
    return {
      ranked: false,
      seats: 1,
      uncontested: false,
      called: false,
      final: false,
      nonpartisan: false,
      question: false,
      supplemented: false,
      close: false,
      updated: moment().unix()
    };
  }

  // To JSON
  toJSON() {
    let p = JSON.parse(JSON.stringify(this._props));

    // Candidates
    p.candidates = _.map(this.candidates, (c) => {
      return c.toJSON();
    });

    // Subset of election parts
    p.election = {
      id: this.election.get('id'),
      primary: this.election.get('primary'),
      special: this.election.get('special')
    };
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
      party: this.parseSoSParty(utility.raw(parts[10])),
      precincts: utility.raw(parts[11], 'int'),
      totalPrecincts: utility.raw(parts[12], 'int'),
      votes: utility.raw(parts[13], 'int'),
      percent: utility.raw(parts[14], 'float'),
      totalVotes: utility.raw(parts[15], 'int')
    };

    // County commissioner is kind of unique, in that the district
    // is specific to the county, even though it gets lumped in
    // with county results.
    if (properties.type === 'county' && d.nameRaw.match(/commissioner/i)) {
      properties.type = d.type = 'county-commissioner';
    }

    // Pad if needed
    let t = this.types()[properties.type];
    if (t && t.districtPad) {
      d.district = utility.padLeft(d.district, t.districtPad);
    }

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

    // Combination districts
    if (properties.type === 'county-commissioner') {
      d.district = d.county + '-' + d.district;
    }

    // SoS assigns a different office/contest ID for
    // each choice, so update to the same one
    if (d.ranked) {
      d.contest = d.contest.replace(/.$/, '1');
    }

    // If a state-wide race, set district to something more
    // meaningful
    if (~['mn-president', 'amendment', 'state', 'judicial', 'us-senate'].indexOf(properties.type)) {
      d.district = 'MN';
      d.area = 'Minnesota';
    }

    // Set contest level values
    let contest = _.pick(d, ['state', 'county', 'precinct', 'type',
      'contest', 'district', 'precincts', 'totalPrecincts',
      'name', 'nameRaw', 'area', 'seatsRaw', 'seats', 'question', 'ranked']);

    // Compile candidate
    candidate = _.extend(candidate, _.pick(d, ['candidate', 'candidateNameRaw', 'votes', 'percent', 'party']));
    candidate.id = this.candidateID(candidate, _.extend({}, properties, contest));

    // Ranked choice
    if (d.ranked) {
      delete candidate.votes;
      delete candidate.percent;
      candidate.ranks = [_.pick(d, 'rankedChoice', 'votes', 'percent')];
    }

    contest.candidates = [candidate];
    return contest;
  }

  // About types
  types() {
    return {
      state: { districtPad: 2 },
      local: { districtPad: 5 },
      school: { districtPad: 4 },
      precinct: { districtPad: 4 },
      hospital: { },
      county: { districtPad: 2 },
      'county-commissioner': { districtPad: 2 },
      'soil-water': { districtPad: 4 },
      'state-house': { districtPad: 3 },
      'state-senate': { districtPad: 2 },
      'us-house': { },
      'us-senate': { },
      judicial: { },
      'judicial-district': { },
      amendment: { },
      'mn-president': { },
    };
  }
}

// Export
module.exports = Contest;
