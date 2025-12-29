#!/usr/bin/env node
/**
 * Test the README example with all compilers
 * Generates HTML files using different compilers
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const log = (content) => console.log(chalk.green(content));
const logErr = (content) => console.log(chalk.red(content));
const logInfo = (content) => console.log(chalk.blue(content));

const compilers = ['es', 'rollup', 'rolldown'];
const testDir = __dirname;
const outputDir = path.join(testDir, 'output');
const generateHtmlFile = path.join(testDir, 'generate-html.tsx');
const dctcPath = path.join(testDir, '..', 'bin', 'index.js');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function runExample(compiler) {
  return new Promise((resolve) => {
    logInfo(`\nTesting example with ${compiler} compiler...`);
    
    // Create a temporary page.html path in output directory
    const outputHtmlPath = path.join(outputDir, `page.${compiler}.html`);
    
    // Change to test directory
    const child = spawn('node', [dctcPath, '--compiler', compiler, generateHtmlFile], {
      cwd: testDir,
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
      // Check if page.html was generated
      const pageHtmlPath = path.join(testDir, 'page.html');
      
      if (code === 0 && fs.existsSync(pageHtmlPath)) {
        // Move the generated HTML to output directory with compiler name
        const htmlContent = fs.readFileSync(pageHtmlPath, 'utf-8');
        fs.writeFileSync(outputHtmlPath, htmlContent, 'utf-8');
        fs.unlinkSync(pageHtmlPath); // Remove original file
        
        log(`✓ ${compiler}: Generated ${path.basename(outputHtmlPath)}`);
        log(`  HTML length: ${htmlContent.length} characters`);
        resolve({ success: true, htmlPath: outputHtmlPath, htmlContent });
      } else {
        logErr(`✗ ${compiler}: Failed`);
        if (stderr) {
          logErr(`  Error: ${stderr.substring(0, 200)}`);
        }
        resolve({ success: false, stderr });
      }
    });

    child.on('error', (error) => {
      logErr(`✗ ${compiler}: Error`);
      logErr(`  ${error.message}`);
      resolve({ success: false, error: error.message });
    });
  });
}

async function runAllExamples() {
  log('\n========================================');
  log('Testing README Example with All Compilers');
  log('========================================\n');

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const compiler of compilers) {
    const result = await runExample(compiler);
    results.push({
      compiler,
      ...result,
    });
    
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
  }

  log('\n========================================');
  log('Results Summary');
  log('========================================\n');

  results.forEach((result) => {
    if (result.success) {
      log(`✓ ${result.compiler}: ${path.basename(result.htmlPath)}`);
    } else {
      logErr(`✗ ${result.compiler}: Failed`);
    }
  });

  log(`\nTotal: ${results.length} tests`);
  log(`Passed: ${passed}`);
  if (failed > 0) {
    logErr(`Failed: ${failed}`);
  }

  log(`\nAll HTML files saved to: ${outputDir}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    log('\nAll examples completed successfully! ✓');
    process.exit(0);
  }
}

runAllExamples().catch((error) => {
  logErr(`\nTest error: ${error.message}`);
  process.exit(1);
});
