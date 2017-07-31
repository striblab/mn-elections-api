# MN Elections API

Compiling manual results and results from the MN Secretary of State to make a static "API" that lives on S3.

## Basics

Data comes in from a few places.

1. MN Secretary of State, specifically via their FTP site.
1. Manual entered data from an [Airtable](https://airtable.com/) database.
    * Allows for customizing information about results coming in from SoS.
    * For contests that are not provided by SoS, for example the finals for ranked-choice voting.

After getting compiled and processed, the results and other data get split up into files and published to S3.

## Usage

### Creating API

(coming soon, should be something like:)

`mn-elections fetch results && mn-elections publish results`

Environment variables:

* `SOS_FTP_USER`
* `SOS_FTP_PASS`
* `AIRTABLE_API_KEY`
* `AIRTABLE_BASE_ID`

### Using API

(coming soon)

For specs on common objects in the API, see the `spec/` folder.

## Glossary

* `contest`: A race or ballot question.
* `candidate`: A candidate in a contest.  This can refer to *yes* and *no* for ballot questions.
* `results`: Refers to the results by candidate for each contest.
* `supplement`: Manually entered data by the newsroom that overrides data that comes from the Secretary of State or other automatic sources.
* `meta`: The meta data that is provided about contests, candidates, and districts from the Secretary of State.
* `geo`: Data and processes that connect contests to geographical data.

## Development

1. Install [NodeJS](https://nodejs.org/en/).
1. Install dependencies: `npm install`
1. (optional) Use `DEBUG=mn-elections-api:*` with commands to get additional debugging information.

## Testing

To run the tests: `npm test`
