'use strict';

const debug = require('debug')('hello');

const async = require('async');

const fs = require('fs');
const parse = require('csv-parse');

const helper = require('./helper');
const sendSms = helper.sendSms;
const logToS3 = helper.logToS3;
const lineTransformer = helper.lineTransformer;
const sendSmsWithLogger = helper.sendSmsWithLogger(debug)(sendSms, logToS3);

function parseWithAsync() {
  function transformEachLine(parsedCsv, callback) {
    async.forEachOf(parsedCsv, (line, index, eachCallback) => {
      if (index > 0) {
        line = lineTransformer(line);
        sendSmsWithLogger(line, eachCallback);
      }
    }, callback);
  }

  async.waterfall([
    async.apply(fs.readFile, __dirname + '/sample.csv'),
    parse,
    transformEachLine,
  ], (err, results) => {
    debug('first log error callback (default behaviour of asyncjs)');
  });
}

parseWithAsync();
