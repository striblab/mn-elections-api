The following describes the fields for a Contest object.

```js
// Candidate object
{
  // The type of contest, specifically the level of government, this
  // comes from the election.json config.  This should be a defined set
  // of options.
  type: 'state',

  // The unique contest ID across all contests
  contestID: 'xxxxx',

  // State ID, this should almost certainly be MN
  stateID: 'MN',

  // The ID of the county for the contest.  this should be the 1-87 county
  // ID that the state uses, not the FIPS code.  This should not apply
  // to contest that are larger than a county.
  countyID: '16',

  // The ID of the district for the contest. The district being relative
  // to the contest itself
  districtID: '1234',

  // The precinct ID.  This should only be used for results by precinct
  precinctID: '0012003123',

  // The ID of the office.  This is unique across ??
  officeID: '9001',

  // The name of the office
  office: 'Mayor',

  // The descriptive name of the area of the contest.
  area: 'Minneapolis',

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

  // Unix timestamp of last updated
  updated: 12345982374
}
```
