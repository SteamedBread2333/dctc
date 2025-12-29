#!/usr/bin/env node
/**
 * Save compilation output for all compilers
 * Saves the compiled code to test/output/ directory
 */
const complie_es = require('../lib/complie_es');
const complie_rollup = require('../lib/complie_rollup');
const complie_rolldown = require('../lib/complie_rolldown');
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

const compilers = {
  es: complie_es,
  rollup: complie_rollup,
  rolldown: complie_rolldown,
};

const outputDir = path.join(__dirname, 'output');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function saveCompilerOutput(testFile, compiler) {
  const testFilePath = path.join(__dirname, testFile);
  const compilerFn = compilers[compiler];
  
  if (!compilerFn) {
    logErr(`Unknown compiler: ${compiler}`);
    return { success: false, error: `Unknown compiler: ${compiler}` };
  }

  try {
    logInfo(`\nCompiling ${testFile} with ${compiler} compiler...`);
    
    const code = await compilerFn(testFilePath);
    
    // Save to file
    const baseName = path.basename(testFile, path.extname(testFile));
    const ext = path.extname(testFile);
    const outputFileName = `${baseName}${ext}.${compiler}.js`;
    const outputPath = path.join(outputDir, outputFileName);
    fs.writeFileSync(outputPath, code, 'utf-8');
    
    log(`✓ Saved: ${outputPath}`);
    log(`  Code length: ${code.length} characters`);
    
    return { success: true, outputPath, codeLength: code.length };
  } catch (error) {
    logErr(`✗ Failed to compile ${testFile} with ${compiler}:`);
    logErr(`  ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function saveAllOutputs() {
  log('\n========================================');
  log('Saving Compiler Outputs');
  log('========================================\n');
  log(`Output directory: ${outputDir}\n`);

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testFile of testFiles) {
    for (const compiler of Object.keys(compilers)) {
      const result = await saveCompilerOutput(testFile.file, compiler);
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
  log('Summary');
  log('========================================\n');

  results.forEach((result) => {
    if (result.success) {
      log(`✓ ${result.file} (${result.compiler}): Saved to ${path.relative(process.cwd(), result.outputPath)}`);
    } else {
      logErr(`✗ ${result.file} (${result.compiler}): Failed`);
    }
  });

  log(`\nTotal: ${results.length} compilations`);
  log(`Passed: ${passed}`);
  if (failed > 0) {
    logErr(`Failed: ${failed}`);
  }

  log(`\nAll compiled outputs saved to: ${outputDir}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    log('\nAll compilations successful! ✓');
    process.exit(0);
  }
}

saveAllOutputs().catch((error) => {
  logErr(`\nError: ${error.message}`);
  process.exit(1);
});
