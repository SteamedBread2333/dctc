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

function isCompilerOption(param) {
  const lowerParam = param.toLowerCase();
  return lowerParam === "--compiler" || lowerParam === "-c"
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

function work() {
  const args = process.argv.slice(2);
  let compiler = 'es'; // default compiler
  let filePath = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (isVersion(arg)) {
      applyVersion();
      return;
    } else if (isHelp(arg)) {
      applyHelp();
      return;
    } else if (isCompilerOption(arg)) {
      // Get compiler value from next argument
      if (i + 1 < args.length) {
        compiler = args[i + 1].toLowerCase();
        i++; // Skip next argument as it's the compiler value
      } else {
        logErr('Please provide a compiler name after --compiler/-c');
        applyHelp();
        process.exit(1);
      }
    } else if (isFilePath(arg)) {
      filePath = arg;
    }
  }

  if (filePath) {
    applyDctc(filePath, compiler);
  } else {
    logErr('Please provide a file path as an argument');
    applyHelp();
    process.exit(1);
  }
}

work()