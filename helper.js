'use strict';

const debug = require('debug')('hello-helper');
const AWS = require('mock-aws-s3');

AWS.config.basePath = __dirname + '/buckets';

const s3 = AWS.S3({ params: { Bucket: 'example' } });

function surprise(name) {
  if (Math.floor(Math.random() * 100) + 1 <= 50) {
    return new Error(`w00t!!! ${name} error`);
  }
}

// Simulates sending sms
exports.sendSms = (data, callback) => {
  setTimeout(() => {
    debug(`sending out sms: ${JSON.stringify(data)}`);
    callback(surprise('sending-sms'), {
      status: 200,
      message: 'OK',
    });
  }, 200);
};

// Simulates logging to s3
exports.logToS3 = (data, callback) => {
  setTimeout(() => {
    debug(`putting data to S3: ${JSON.stringify(data)}`);
    s3.putObject({
      Key: `row/line-${new Date().valueOf()}.json`,
      Body: JSON.stringify(data),
    }, (err) => {
      callback(err ? err : surprise('log-to-s3'), { data, logged: true });
    });
  });
};

// Service injection
exports.sendSmsWithLogger = (debug) => {
  debug = debug || console.log;
  return (sendSms, logger) => {
    return (data, callback) => {
      // Could be be any sending service including the one provided in helper
      sendSms(data, (err, sendingStatus) => {
        if (!err) {
          // When success immediate callback sending
          return callback(err, sendingStatus);
        }
        debug(err.message);
        let dataToLog = { sendingStatus, data };
        // Could be any logging service including the one provided in helper
        // When error, callback logging, let the caller knows it's being logged.
        logger(dataToLog, (err, loggingStatus) => {
          if (err) {
            debug(err.message);
          }
          return callback(err, loggingStatus);
        });
      });
    }
  }
};

exports.lineParser = (data, delimiter) => {
  // Set default delimiter to comma
  delimiter = (delimiter || ',');

  // Pattern to parse rows and fields
  let pattern = new RegExp((
    // Find field and row delimiter
    '(\\' + delimiter + '|\\r?\\n|\\r|^)' +
    // When the field contains any quote
    '(?:\"([^"]*(?:""[^"]*)*)"|' +
    // Ordinary field value
    '([^"\\' + delimiter + '\\r\\n]*))'), 'gi');

  // Prepare array to hold transformed fields
  let results = [];

  // Search matches expression
  let matches;
  while (matches = pattern.exec(data)) {
    let matchDelimiter = matches[1];
    
    if (matchDelimiter.length && (matchDelimiter != delimiter)) {
      continue;
    }

    let matchedValue;
    if (matches[2]) {
      matchedValue = matches[2].replace(new RegExp('""', 'g'), '"');
    } else {
      matchedValue = matches[3];
    }
    results.push(matchedValue);
  }
  return results;
}

// Concat first and last name and transform it into full name
exports.lineTransformer = (line) => {
  // Concat first and last name
  let fullName = `${line[0]} ${line[1]}`;
  // Merge first and last name into single field full name
  line.splice(0, 2, fullName);
  return line;
};
