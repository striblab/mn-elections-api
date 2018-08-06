# MN Elections API

Compiling manual results and results from the MN Secretary of State to make a static "API" that lives on S3.

## Basics

Data comes in from a few places.

1.  MN Secretary of State, specifically via their FTP site.
1.  Manual entered data from an [Airtable](https://airtable.com/) database.
    - Allows for customizing information about results coming in from SoS.
    - For contests that are not provided by SoS, for example the finals for ranked-choice voting.

After getting compiled and processed, the results and other data get split up into files and published to S3.

## Creating the API

### Install

- Install with `npm install`
- To get the command available globally, use `npm link`

### Command line usage

This package exposes `mn-elections` command line utility.

```
Usage:
  mn-elections <cmd> [args]

Commands:
  list     List available elections.
  results  Get results for an election.
  setup    Setup supplement datasource (Airtable).
  verify   Verify results from SoS with independent counts.
  publish  Publish results to S3.

Options:
  --debug, -d   Turn on debugging.
  --config, -c  Location of JSON describing elections.  Defaults to
                elections.json provided here.
  --help        Show help
```

Common options:

- `--election`: Most, but not all commands, require the election to be defined with this option, which should be the election ID, which is the date of the election, like `20131105`.
- `--debug`: This does not currently work. This should turn on debugging.
- `--config`: Path to where the `elections.json` is. By default it is the one provided in this package, which should be good enough for most cases. To make your own config, see the `spec/ELECTION.md` specification.
- `--use-cache`: Use cache files for meta and supplement data.
- `--test`: Add random test data for contests that don't have any votes.
- `--help`: Specific help can be provided for each sub-command.

#### `list` command

This lists and describes all elections defined in the `elections.json` (or whatever JSON is provided). This is helpful as it will give you the election ID that is needed for most operations.

#### `results` command

This gets the results from the SoS and supplemental sources if defined in the election JSON. Basic usage is something like the following:

```
mn-elections results -e 20131105
```

By default it will save the results under the `./mn-elections-output/20131105/` folder. The `--output` option can change the directory. Note that the `mn-elections` command will automatically append the election ID, such as `20131105`, to the path.

#### `publish` command

Publish results to S3. Basic usage is something like:

```
mn-elections -e 20131105 -s s3://bucket-name/path/to/elections
```

This will put the results to the bucket `bucket-name` at path `path/to/elections/20131105`.

The `--output` option can be used to specific where the local results are stored (see `results` command). The `--version` flag will put the results in a timestamp path, for example: `path/to/elections/20131105/_versions/UNIX_TIMESTAMP`.

**NOTE:** The publish command will delete things on S3. This is good because we dont' want old or inaccurate data to be avilable through the "API". But, this means that if you do `--version` then a non-version publish, the version data will be deleted. This means, you should put the versioned data in a different place.

#### `setup` command

`setup` will setup the supplemental source, i.e. the Airtable, with the contests from the election. Unfortunately it is necessary to setup the tables and columns in the Airtable Base manually.

_TODO: Provide documentation on how to setup the Airtable. Currently, I just duplicated the existing one._

Basic usage is something like the following:

```
mn-elections setup -e 20131105
```

Since this runs the results command above, the `--output` option can be set.

#### `verify` command

This command looks at the Secretary of State files provided in the `results` array in the elections JSON and does a similar, but independent and fast count of contests and candidates and can optionally update the elections JSON with those numbers. These numbers are used as simple verification when the `results` command runs.

Use the `--update` option to update the elections JSON.

### Environment variables:

- `SOS_FTP_USER`: The FTP username to access to Secretary of State FTP site.
- `SOS_FTP_PASS`: The FTP password to access to Secretary of State FTP site.
- `AIRTABLE_API_KEY`: The API key for Airtable, which is where supplemental data is stored.

## Supplement

Note that Airtable does not have an API to create tables/fields, so one has to manually created for a supplement source.

Overall, the fields correspond to the data specifications in `spec/`, but there is some key logic to be aware of:

- No data from supplement will be imported if the `Publish` field is not checked.
- Percents will be calculated if `Votes` are provided.
- Mark a contest as `Final` if a winner is to be calculated. This field is primarily used for ranked-choiced contests that don't have final count data.
- Mark a contest as `Called` if the contest is called by staff, and ONLY if a `Winner` has been marked. If no winner is provided, this will purposefully break the import process. Overall, a contest should not be marked as `Final` and `Called`.

## Glossary

- `contest`: A race or ballot question.
- `candidate`: A candidate in a contest. This can refer to _yes_ and _no_ for ballot questions.
- `results`: Refers to the results by candidate for each contest.
- `supplement`: Manually entered data by the newsroom that overrides data that comes from the Secretary of State or other automatic sources.
- `meta`: The meta data that is provided about contests, candidates, and districts from the Secretary of State.
- `geo`: Data and processes that connect contests to geographical data.

## Development

1.  Install [NodeJS](https://nodejs.org/en/).
1.  Install dependencies: `npm install`
1.  (optional) Use `DEBUG=mn-elections-api:*` with commands to get additional debugging information.

## Testing

To run the tests: `npm test`
