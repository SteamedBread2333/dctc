#!/usr/bin/env node
/**
 * Test runner for dctc compilers
 * Tests all three compilers: es, rollup, rolldown
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const log = (content) => console.log(chalk.green(content));
const logErr = (content) => console.log(chalk.red(content));
const logInfo = (content) => console.log(chalk.blue(content));

const testFiles = [
  { file: 'test.ts', name: 'TypeScript' },
  { file: 'test.tsx', name: 'TSX' },
];

const compilers = ['es', 'rollup', 'rolldown'];

async function runTest(testFile, compiler) {
  return new Promise((resolve, reject) => {
    const testFilePath = path.join(__dirname, testFile);
    const dctcPath = path.join(__dirname, '..', 'bin', 'index.js');
    
    logInfo(`\nTesting ${testFile} with ${compiler} compiler...`);
    
    const child = spawn('node', [dctcPath, '--compiler', compiler, testFilePath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✓ ${testFile} with ${compiler} compiler: PASSED`);
        resolve({ success: true, stdout, stderr });
      } else {
        logErr(`✗ ${testFile} with ${compiler} compiler: FAILED (exit code: ${code})`);
        if (stderr) {
          logErr(`Error: ${stderr}`);
        }
        resolve({ success: false, stdout, stderr, code });
      }
    });

    child.on('error', (error) => {
      logErr(`✗ ${testFile} with ${compiler} compiler: ERROR`);
      logErr(`Error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
  });
}

async function runAllTests() {
  log('\n========================================');
  log('Starting dctc Compiler Tests');
  log('========================================\n');

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testFile of testFiles) {
    for (const compiler of compilers) {
      const result = await runTest(testFile.file, compiler);
      results.push({
        file: testFile.file,
        compiler,
        ...result,
      });
      
      if (result.success) {
        passed++;
      } else {
        failed++;
      }
    }
  }

  log('\n========================================');
  log('Test Results Summary');
  log('========================================\n');

  results.forEach((result) => {
    if (result.success) {
      log(`✓ ${result.file} (${result.compiler}): PASSED`);
    } else {
      logErr(`✗ ${result.file} (${result.compiler}): FAILED`);
      if (result.stderr) {
        logErr(`  Error: ${result.stderr.substring(0, 200)}`);
      }
    }
  });

  log(`\nTotal: ${results.length} tests`);
  log(`Passed: ${passed}`);
  logErr(`Failed: ${failed}`);

  if (failed > 0) {
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
