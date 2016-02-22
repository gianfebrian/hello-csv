'use strict';

const debug = require('debug')('hello');

const Promise = require('bluebird');

const readFile = Promise.promisify(require('fs').readFile);
const parse = Promise.promisify(require('csv-parse'));

const helper = require('./helper');
const sendSms = helper.sendSms;
const logToS3 = helper.logToS3;
const lineTransformer = helper.lineTransformer;
const sendSmsWithLogger = helper.sendSmsWithLogger(debug);
const sendSmsWithLoggerAsync = Promise.promisify(sendSmsWithLogger(sendSms, logToS3));

function parseWithPromise() {

  function transformEachLine(parsed) {
    return Promise.map(parsed, (line, index, length) => {
      if (index > 0) {
        line = lineTransformer(line);

        debug(`sending data index: ${index - 1}`);
        return sendSmsWithLoggerAsync(line)
          .catch((err) => {
            return err;
          })
      }
      return;
    })
    .catch((err) => {
      return err;
    });
  };

  return readFile(__dirname + '/sample.csv')
    .then(parse)
    .then(transformEachLine)
    .then((results) => {
      debug('done parsing');
    })
    .catch((err) => {
      debug(`done parsing with ${err.message}`);
    });
}

parseWithPromise();
