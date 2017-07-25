# MN Elections API

Compiling manual results and results from the MN Secretary of State to make a static "API" that lives on S3.

## Basics

Data comes in from a few places.

1. MN Secretary of State, specifically via their FTP site.
1. Manual entered data from an [Airtable](https://airtable.com/) database.
    * Allows for customizing information about results coming in from SoS.
    * For contests that are not provided by SoS, for example the finals for ranked-choice voting.

Results get collected and processed and exported to the `export/` folder.

Publishing to S3

## Usage

(coming soon, should be something like:)

`mn-elections fetch results && mn-elections publish results`

## Development

1. Install [NodeJS](https://nodejs.org/en/).
1. Install dependencies: `npm install`
1. (optional) Use `DEBUG=mn-elections-api:*` with commands to get additional debugging information.

## Testing

(coming soon)
