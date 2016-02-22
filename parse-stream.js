'use strict';

const debug = require('debug')('hello');

const async = require('async');

const fs = require('fs');
const readline = require('readline');

const helper = require('./helper');
const sendSms = helper.sendSms;
const logToS3 = helper.logToS3;
const lineTransformer = helper.lineTransformer;
const lineParser = helper.lineParser;
const sendSmsWithLogger = helper.sendSmsWithLogger(debug)(sendSms, logToS3);

function parseWithStream() {
  let fileStream = fs.createReadStream(__dirname + '/sample.csv');
  let linesRead = readline.createInterface({
    input: fileStream,
  });

  function parseStream(callback) {
    let lines = [];
    linesRead.on('line', (line) => {
      lines.push(lineParser(line));
    }).on('close', () => {
      callback(null, lines);
    });
  }

  function transformEachLine(parsedCsv, callback) {
    async.forEachOf(parsedCsv, (line, index, eachCallback) => {
      if (index > 0) {
        line = lineTransformer(line);
        sendSmsWithLogger(line, eachCallback);
      }
    }, callback);
  }

  async.waterfall([
    parseStream,
    transformEachLine,
  ], (err, results) => {
    debug('first log error callback (default behaviour of asyncjs)');
  });
}

parseWithStream();
