The following describes the fields for an Election object.

```js
// Election object
{
  // The ID of the election in form 'YYYYMMDD'
  id: '20170101',

  // Object describing connection information for the Secretary of State
  sos: {
    // Host address
    host: "ftp.sos.state.mn.us",

    // Directory where the results and meta data are. Should not have a
    // trailing slash
    dir: "20131105_MG",

    // This should come from the SOS_FTP_USER environment variable
    user: "user",

    // This should come from the SOS_FTP_PASS environment variable
    pass: "pass",
  },

  // Whether this election is a primary election or not.
  primary: false,

  // Whether this election is a special election or not. Does not
  // currently effect processing.
  special: false,

  // Results is an array describing each result file to process.
  results: [
    {
      // The name of the file on the FTP server
      file: "local.txt",

      // The type of results it is, this will help with the processing.
      // This should be one of the following:
      //
      // state, local, school, precinct, hospital, county,
      // county-commissioner, soil-water, state-house, state-senate,
      // us-house, us-senate, amendment, mn-president,
      // judicial, judicial-district
      type: "local"
    },
    ...
  ],

  // Meta should be a keyed object for different sets of meta
  // data
  meta: {
    // Districts is an array describing files that contain meta data
    // on districts.  These are helpful in determining more specifically
    // where a contest is
    districts: [
      {
        // The name of the file on the FTP server
        file: "MunTbl.txt",

        // The type describes the set of districts and should correspond
        // to a type of "results" above
        type: "local"
      },
      ...
    ],

    // Questions contain the default text for a question or amendment
    questions: [
      {
        // The name of the file on the FTP server
        file: "BallotQuestions.txt",

        // This is not currently used.
        type: "question"
      },
      ...

    ]
  },

  // If there is no relevant meta data for this election, specifically
  // set noMeta to true,
  noMeta: false,

  // Supplement describes if and where supplemental data about an election
  // is.  Supplemental data is manaully created data such as called contests.
  supplement: {
    // The type of data source. Currently, only "airtable" is supported.
    type: "airtable",

    // The ID of the data source.  Note that this is found when navigating
    // the [Airtable API](https://airtable.com/api)
    id: "apphaNpEdQoYCeh0S"
  },

  // Object to define sets of contests for specific endpoints.  The endpoint
  // will be results/set-"key".json
  //
  // The set can be an array of contest IDs, or an object describing how to
  // filter contests, with MongoDB syntax via the sift library
  // https://www.npmjs.com/package/sift
  sets: {
    dashboard: [
      '20170808-xxxxxxx',
      '20170808-yyyyyyy'
    ],
    custom: {
      title: "Custom set",
      where: {
        type: "school",
        area: { $in: [ "Custom 1", "Custom 2" ]}
      }
    }
  },

  // Any extra notes about the election
  notes: "Some notes here"
}
```
