#!/usr/bin/env node
/**
 * Run all tests for dctc
 * This script runs all test suites in sequence
 */
const { spawn } = require('child_process');
const path = require('path');
const chalk = require('chalk');

const log = (content) => console.log(chalk.green(content));
const logErr = (content) => console.log(chalk.red(content));
const logInfo = (content) => console.log(chalk.blue(content));
const logTitle = (content) => console.log(chalk.bold.cyan(content));

const testScripts = [
  { name: 'Basic Functionality Tests', script: 'test-runner.js' },
  { name: 'Output Verification Tests', script: 'verify-output.js' },
  { name: 'Compilation Output Tests', script: 'save-output.js' },
  { name: 'README Example Tests', script: 'test-example.js' },
];

async function runTestScript(scriptName) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, scriptName);
    
    const child = spawn('node', [scriptPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      resolve({ success: code === 0, code });
    });

    child.on('error', (error) => {
      logErr(`Error running ${scriptName}: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
  });
}

async function runAllTests() {
  logTitle('\n========================================');
  logTitle('Running All Tests for dctc');
  logTitle('========================================\n');

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of testScripts) {
    logTitle(`\n[${test.name}]`);
    log(`Running: ${test.script}\n`);
    
    const result = await runTestScript(test.script);
    results.push({
      name: test.name,
      script: test.script,
      ...result,
    });
    
    if (result.success) {
      passed++;
      log(`\n✓ ${test.name}: PASSED\n`);
    } else {
      failed++;
      logErr(`\n✗ ${test.name}: FAILED (exit code: ${result.code})\n`);
    }
  }

  logTitle('\n========================================');
  logTitle('Test Summary');
  logTitle('========================================\n');

  results.forEach((result) => {
    if (result.success) {
      log(`✓ ${result.name}`);
    } else {
      logErr(`✗ ${result.name}`);
    }
  });

  log(`\nTotal: ${results.length} test suites`);
  log(`Passed: ${passed}`);
  if (failed > 0) {
    logErr(`Failed: ${failed}`);
  }

  if (failed > 0) {
    logErr('\nSome tests failed! ✗');
    process.exit(1);
  } else {
    log('\nAll tests passed! ✓');
    process.exit(0);
  }
}

runAllTests().catch((error) => {
  logErr(`\nTest runner error: ${error.message}`);
  process.exit(1);
});
