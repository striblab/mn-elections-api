The following describes the fields for a Contest object.

```js
// Candidate object
{
  // The unique contest ID across all contests and elections.  It will
  // be a combination of election, type, districtID, and officeID
  id: '20170102-state-11A-22222',

  // The type of contest, specifically the level of government, this
  // comes from the election.json config.  This should be a defined set
  // of options.
  type: 'state',

  // Attached data
  election: { ... },
  candidates: [ ... ],

  // The ID of the district for the contest. The district being relative
  // to the contest type
  district: '1234',

  // The contest ID.  This is not unique across contests, but should be
  // unique across types in an election.
  contest: '9001',

  // The name of the contest.  This is not necessarily unique, but
  // when combined with area, should provided a fairly good description
  // of the contest.
  name: 'Mayor',

  // The descriptive name of the area of the contest.
  area: 'Minneapolis',

  // Other district codes that may be attached for reference, and determined
  // from district and type
  state: 'MN',
  local: 'FIPS123',
  school: '00123',
  precinct: '00012348234',
  hospital: '1234',
  countyCommissioner: '123232',
  water: '279',
  stateHouse: '12A',
  stateSenate: '12',
  congress: '1',
  // County should be the MN county codes 1-87, where 88 is state-wide
  // race
  county: '17',

  // If the results are sub-divided
  // TODO

  // Number of seats to be chosen.  For a primary, this is 1, but refers
  // to 1 for each party.
  seats: 1,

  // Whether this race is uncontested or not
  uncontested: false,

  // Whether this race has been called
  called: false,

  // Whether this race has had all its precincts reported
  final: false,

  // Whether this race is non-partisan or not, specifically, this is
  // true if no candidates have a designated party
  nonpartisan: false,

  // Whether this contest is a question
  question: false,

  // The title of the question.  This should only apply if the contest is a
  // question.
  questionTitle: 'Example bond question',

  // The text of the question.  This should only apply if the contest is a
  // question.
  questionText: 'Should we do this or do that?',

  // Whether the contest is ranked-choice
  ranked: false,

  // The maximum number of choices to rank.  This may not be 100% accurate
  // since the SoS may not provide all of them
  maxChoice: 3,

  // Precincts that have reported in
  precincts: 10,

  // The total number of precincts for the contest
  totalPrecincts: 100,

  // The total number of votes that so far
  totalVotes: 1000,

  // Whether the contest is a tie or so close that a recount may happen
  close: flase,

  // Unix timestamp of last updated
  updated: 12345982374,

  // Any note that will display with the contest
  note: 'Something important about this contest',
}
```
