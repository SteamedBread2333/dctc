#!/usr/bin/env node
/**
 * Verify compilation output for all compilers
 * Checks that the compiled code is valid CommonJS
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

async function verifyCompilerOutput(testFile, compiler) {
  return new Promise((resolve) => {
    const testFilePath = path.join(__dirname, testFile);
    const dctcPath = path.join(__dirname, '..', 'bin', 'index.js');
    
    logInfo(`\nVerifying ${testFile} with ${compiler} compiler...`);
    
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
      if (code === 0 && stdout.trim()) {
        log(`✓ ${testFile} (${compiler}): Output verified - "${stdout.trim()}"`);
        resolve({ success: true, output: stdout.trim() });
      } else if (code === 0) {
        log(`✓ ${testFile} (${compiler}): Executed successfully (no output)`);
        resolve({ success: true, output: '' });
      } else {
        logErr(`✗ ${testFile} (${compiler}): Verification failed`);
        if (stderr) {
          logErr(`  Error: ${stderr.substring(0, 200)}`);
        }
        resolve({ success: false, stderr });
      }
    });

    child.on('error', (error) => {
      logErr(`✗ ${testFile} (${compiler}): Error`);
      logErr(`  ${error.message}`);
      resolve({ success: false, error: error.message });
    });
  });
}

async function runVerification() {
  log('\n========================================');
  log('Verifying Compiler Outputs');
  log('========================================\n');

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testFile of testFiles) {
    for (const compiler of compilers) {
      const result = await verifyCompilerOutput(testFile.file, compiler);
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
  log('Verification Summary');
  log('========================================\n');

  log(`Total: ${results.length} verifications`);
  log(`Passed: ${passed}`);
  if (failed > 0) {
    logErr(`Failed: ${failed}`);
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    log('\nAll verifications passed! ✓');
    process.exit(0);
  }
}

runVerification().catch((error) => {
  logErr(`\nVerification error: ${error.message}`);
  process.exit(1);
});
