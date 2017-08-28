/**
 * Publish files to S3
 */

// Depedencies
const url = require('url');
const s3 = require('s3');
const _ = require('lodash');
const moment = require('moment');
const Base = require('./base.js');
const debug = require('debug')('mn-elections-api:publish');

// Class for publishing
class Publish extends Base {
  constructor(election, options) {
    super(options);

    // Check for election
    if (!election) {
      throw new Error('election not provided.');
    }
    this.election = election;

    // Cache length in seconds
    this.cacheSeconds = options.cacheSeconds || 30;

    // Check for s3 path
    if (!options.s3Location) {
      throw new Error('s3Location option not provided.');
    }

    // Check parts
    try {
      this.s3Location = url.parse(options.s3Location);
      debug('Parsed s3 location:', this.s3Location);
    }
    catch (e) {
      throw e;
    }
    if (this.s3Location.protocol !== 's3:') {
      throw new Error('s3Location option provided does not use the s3:// protocol.');
    }

    // Setup s3 client
    this.s3Client = s3.createClient({
      maxAsyncS3: 20,
      s3RetryCount: 5,
      s3RetryDelay: 750,
      s3Options: {
        region: options.s3Region ? options.s3Region : 'us-east-1',
        // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
      },
    });
  }

  // Main publishing function
  publish(version = false) {
    return new Promise((resolve, reject) => {
      // Version means taht we put in a specific directory with
      // a timestamp
      let prefix = this.s3Location.pathname.replace(/^\/+/g, '') + '/' + this.election.id();
      prefix = version ? prefix + '/_versions/' + moment().unix() : prefix;

      // Throttle debugger
      let throttleDebug = _.throttle(debug, 2000, { leading: true });

      // OPtions for uploader
      let options = {
        localDir: this.exportPath,
        deleteRemoved: true,
        s3Params: {
          Bucket: this.s3Location.hostname,
          Prefix: prefix,
          ACL: 'public-read',
          CacheControl: 'public, max-age=' + this.cacheSeconds + ', must-revalidate',
          Expires: moment().add(this.cacheSeconds, 'seconds').toDate()
          // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
        }
      };

      let uploader = this.s3Client.uploadDir(options);
      uploader.on('error', reject);
      uploader.on('progress', function() {
        throttleDebug('s3 progress:', uploader.progressTotal ?
          uploader.progressAmount / uploader.progressTotal : 0);
      });
      uploader.on('end', function() {
        resolve();
      });
    });
  }
}


// Exports
module.exports = Publish;
