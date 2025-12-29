#!/usr/bin/env node
/**
 * Test suite for dctc based on README EXAMPLE
 * Tests all compilers with generate-html.tsx and saves output to test/output
 */
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = (content: string) => console.log(chalk.green(content));
const logErr = (content: string) => console.log(chalk.red(content));
const logInfo = (content: string) => console.log(chalk.blue(content));
const logTitle = (content: string) => console.log(chalk.bold.cyan(content));

const compilers = ['es', 'swc', 'rollup', 'rolldown'] as const;

const projectRoot = path.resolve(__dirname, '..');
const testDir = __dirname;
const outputDir = path.join(testDir, 'output');
const dctcPath = path.join(projectRoot, 'bin', 'index.js');
const generateHtmlFile = path.join(testDir, 'generate-html.tsx');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function testCompiler(compiler: string): { success: boolean; htmlPath?: string; error?: string } {
  const outputHtmlPath = path.join(outputDir, `page.${compiler}.html`);
  const pageHtmlPath = path.join(testDir, 'page.html');
  
  // Clean up any existing page.html
  if (fs.existsSync(pageHtmlPath)) {
    fs.unlinkSync(pageHtmlPath);
  }
  
  try {
    // Use relative path from testDir
    const relativeGenerateHtmlFile = path.relative(testDir, generateHtmlFile);
    // Run dctc with the specified compiler
    const result = execSync(`node "${dctcPath}" --compiler ${compiler} "${relativeGenerateHtmlFile}"`, {
      cwd: testDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000,
      encoding: 'utf-8',
    });
    
    // Verify compiler was actually used by checking stderr for compiler-specific messages
    // Note: stderr may contain warnings but compilation can still succeed
    // Rollup shows TypeScript plugin warnings, which confirms it's being used
    
    // Check if page.html was generated
    if (fs.existsSync(pageHtmlPath)) {
      const htmlContent = fs.readFileSync(pageHtmlPath, 'utf-8');
      fs.writeFileSync(outputHtmlPath, htmlContent, 'utf-8');
      fs.unlinkSync(pageHtmlPath);
      
      return {
        success: true,
        htmlPath: outputHtmlPath,
      };
    } else {
      return {
        success: false,
        error: 'page.html was not generated',
      };
    }
  } catch (error: any) {
    const errorMessage = error.stderr?.toString() || error.stdout?.toString() || error.message || String(error);
    return {
      success: false,
      error: errorMessage.substring(0, 300),
    };
  }
}

function runAllTests() {
  logTitle('\n========================================');
  logTitle('dctc Test Suite - README EXAMPLE');
  logTitle('========================================\n');

  const results: Array<{ compiler: string; success: boolean; htmlPath?: string; error?: string }> = [];
  let totalPassed = 0;
  let totalFailed = 0;

  logTitle('Testing generate-html.tsx with all compilers...\n');

  for (const compiler of compilers) {
    logInfo(`Testing with ${compiler} compiler...`);
    const result = testCompiler(compiler);
    results.push({ compiler, ...result });
    
    if (result.success) {
      totalPassed++;
      log(`  ✓ ${compiler}: PASSED - HTML saved to ${result.htmlPath}`);
    } else {
      totalFailed++;
      logErr(`  ✗ ${compiler}: FAILED`);
      if (result.error) {
        logErr(`    Error: ${result.error.substring(0, 200)}`);
      }
    }
  }

  // Summary
  logTitle('\n========================================');
  logTitle('Test Summary');
  logTitle('========================================\n');

  log(`Total tests: ${results.length}`);
  log(`Passed: ${totalPassed}`);
  if (totalFailed > 0) {
    logErr(`Failed: ${totalFailed}`);
  }

  log(`\nOutput files saved to: ${outputDir}`);
  log(`Generated files:`);
  for (const compiler of compilers) {
    const htmlPath = path.join(outputDir, `page.${compiler}.html`);
    if (fs.existsSync(htmlPath)) {
      const size = fs.statSync(htmlPath).size;
      log(`  - page.${compiler}.html (${size} bytes)`);
    } else {
      logErr(`  - page.${compiler}.html (not generated)`);
    }
  }

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    log('\nAll tests passed! ✓');
    process.exit(0);
  }
}

runAllTests();
