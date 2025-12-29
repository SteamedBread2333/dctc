#!/usr/bin/env node
/**
 * Performance benchmark for dctc compilers.
 *
 * For each compiler:
 * - Compile once (to get realistic compile latency)
 * - Execute the compiled output 10,000 times in a fresh vm context per iteration
 *
 * Output: minimal report (compile ms, exec total/avg, ops/s).
 */
const path = require("path");
const vm = require("vm");
const chalk = require("chalk");

// Make output deterministic/concise: swallow all incidental stdout/stderr noise from compilers,
// and print only the benchmark report via the real stdout writer.
const __realStdoutWrite = process.stdout.write.bind(process.stdout);
const __realStderrWrite = process.stderr.write.bind(process.stderr);
process.stdout.write = () => true;
process.stderr.write = () => true;

function outLine(s = "") {
  __realStdoutWrite(String(s) + "\n");
}

const complie_es = require("../lib/complie_es");
const complie_swc = require("../lib/complie_swc");
const complie_rollup = require("../lib/complie_rollup");
const complie_rolldown = require("../lib/complie_rolldown");

function parseIterations(argv) {
  const idx = argv.indexOf("--iterations");
  if (idx !== -1 && idx + 1 < argv.length) {
    const n = Number(argv[idx + 1]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 10000;
}

const ITERATIONS = parseIterations(process.argv);

const logTitle = (s) => outLine(chalk.bold.cyan(s));
const log = (s) => outLine(chalk.green(s));
const logInfo = (s) => outLine(chalk.blue(s));
const logErr = (s) => outLine(chalk.red(s));

function nowMs() {
  // hrtime for stable durations
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

async function withMutedOutput(fn) {
  const stdoutWrite = process.stdout.write;
  const stderrWrite = process.stderr.write;
  const consoleWarn = console.warn;
  const consoleError = console.error;
  process.stdout.write = () => true;
  process.stderr.write = () => true;
  console.warn = () => {};
  console.error = () => {};
  try {
    return await fn();
  } finally {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
    console.warn = consoleWarn;
    console.error = consoleError;
  }
}

function makeContext(filePath) {
  return {
    module: { exports: {} },
    exports: {},
    console,
    process,
    require,
    queueMicrotask,
    React: require("react"),
    ReactDOM: require("react-dom"),
    __filename: filePath,
    __dirname: path.dirname(filePath),
  };
}

async function benchOne(name, compileFn, entryFile) {
  const compileStart = nowMs();
  const code = await withMutedOutput(() => compileFn(entryFile));
  const compileMs = nowMs() - compileStart;

  // Wrap in an IIFE so repeated execution in the same vm context doesn't redeclare top-level const/let.
  const wrapped = `(function(){\n${code}\n})();`;
  const script = new vm.Script(wrapped);

  // Warmup: 10 runs (not counted)
  for (let i = 0; i < 10; i++) {
    script.runInNewContext(makeContext(entryFile));
  }

  const execStart = nowMs();
  for (let i = 0; i < ITERATIONS; i++) {
    script.runInNewContext(makeContext(entryFile));
  }
  const execMs = nowMs() - execStart;

  const avgMs = execMs / ITERATIONS;
  const opsPerSec = ITERATIONS / (execMs / 1000);

  return {
    name,
    compileMs,
    execMs,
    avgMs,
    opsPerSec,
  };
}

async function main() {
  const entryFile = path.resolve(__dirname, "generate-html.bench.tsx");

  const compilers = [
    { name: "es", fn: complie_es },
    { name: "swc", fn: complie_swc },
    { name: "rollup", fn: complie_rollup },
    { name: "rolldown", fn: complie_rolldown },
  ];

  logTitle("\n========================================");
  logTitle("dctc Performance Benchmark");
  logTitle("========================================\n");
  logInfo(`Entry: ${entryFile}`);
  logInfo(`Iterations (execute): ${ITERATIONS}\n`);

  const results = [];

  for (const c of compilers) {
    logInfo(`Benchmarking ${c.name}...`);
    try {
      const r = await benchOne(c.name, c.fn, entryFile);
      results.push(r);
      log(`  ✓ ${c.name}: compile ${r.compileMs.toFixed(1)}ms, exec ${r.execMs.toFixed(1)}ms`);
    } catch (e) {
      results.push({ name: c.name, error: e && (e.stack || e.message || String(e)) });
      logErr(`  ✗ ${c.name}: FAILED`);
    }
  }

  // Report
  logTitle("\n========================================");
  logTitle("Report (lower is better)");
  logTitle("========================================\n");

  const ok = results.filter((r) => !r.error);
  const failed = results.filter((r) => r.error);

  // Sort by exec time
  ok.sort((a, b) => a.execMs - b.execMs);

  for (const r of ok) {
    outLine(
      `${chalk.bold(r.name)}  ` +
        `compile=${r.compileMs.toFixed(1)}ms  ` +
        `exec_total=${r.execMs.toFixed(1)}ms  ` +
        `exec_avg=${r.avgMs.toFixed(4)}ms  ` +
        `ops=${r.opsPerSec.toFixed(1)}/s`
    );
  }

  if (failed.length) {
    logTitle("\nFailures");
    for (const r of failed) {
      logErr(`- ${r.name}: ${String(r.error).slice(0, 300)}`);
    }
  }

  if (ok.length) {
    const fastest = ok[0];
    log(`\nFastest execution: ${fastest.name}`);
  }
}

main().catch((e) => {
  __realStderrWrite(String(e && (e.stack || e.message || e)) + "\n");
  process.exit(1);
});

