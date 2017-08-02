The following describes the fields for a candidate object.  A `contest` should have an array of Candidate objects in the `candidates` field.

```js
// Candidate object
{
  // The unique ID across all contests/elections
  id: 'xxxxx',

  // The ID that is unique to this contest
  candidate: 'xxxxx',

  // Name parts
  title: 'Dr.',
  first: 'Leo',
  middle: 'H.',
  // Note that for a question, the Yes and No will be defined in last
  last: 'Spaceman',
  suffix: 'III',
  nick: 'Major Tom',

  // writeIn is used to mark candidate as all the write-in results,
  // and other fields here will not be displayed
  writeIn: false

  // The name that will be displayed.  This overrides any calculated name
  // made from the candidate object.  This should usually only come from supplemented
  // data.
  display: 'Dr. Spaceman',

  // The sort name that will be used.  This overrides any calculated sort name
  // made from the candidate object.  This should usuallyonly come from supplemented
  // data.
  sort: 'zzzz',

  // Whether the candidate is the incumbent
  incumbent: true,

  // Party code
  party: 'DFL',

  // Votes received in this contest and context.  For ranked-choice, this is the fully-counted
  // final votes received for this candidate.
  votes: 100,

  // Percent of all votes as a number between 0 and 100, and rounded to
  // two decimal places.  This is relative to the context, i.e. if it is a
  // partisan primary, this will be percent of votes of just the party.
  // Or for results by precinct, this will be relative to the precinct.
  // For ranked-choice, this is the fully-counted final percent received for this candidate.
  percent: 10.12,

  // For ranked-choice, this array contains the first round rank totals
  ranks: [
    {
      // The ranked choice that this refers to, such as 1st choice, 2nd, 3rd,
      rankedChoice: 1,
      // Number of votes received for this ranked choice
      votes: 50,
      // Percent of votes relative to the choice
      percent: 12.34
    }
  ],

  // Note will show up in display under the candidates name
  note: 'Something important about this candidate'
}
```
