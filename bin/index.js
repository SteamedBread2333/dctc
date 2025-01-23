#!/usr/bin/env node
const fs = require('fs');
const { applyVersion, applyHelp, applyDctc } = require('../lib/actions');
const chalk = require("chalk");
const logErr = content => console.log(chalk.red(content));

function isVersion(param) {
  const lowerParam = param.toLowerCase();
  return lowerParam === "--version" || lowerParam === "-v"
}

function isHelp(param) {
  const lowerParam = param.toLowerCase();
  return lowerParam === "--help" || lowerParam === "-h"
}

function isFilePath(param) {
  try {
    if (!fs.existsSync(param)) {
      return false;
    }
    const stats = fs.statSync(param);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

function work(param) {
  if (isVersion(param)) {
    applyVersion();
  } else if (isHelp(param)) {
    applyHelp()
  } else if (isFilePath(param)) {
    applyDctc(param);
  } else {
    logErr('Please provide a file path as an argument');
    applyHelp()
    process.exit(1);
  }
}

const param = process.argv[2];

work(param)