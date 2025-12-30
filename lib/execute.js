/**
 * This function takes code as input and executes it in a new context,
 * @param {string} code - The code to be executed.
 * @author pipi
 * @returns {void}
 */
const vm = require("vm"); // Import the virtual machine module
const path = require("path"); // Import the path module
const chalk = require("chalk");
const logErr = (...args) => {
  const msg = args
    .map((a) => {
      if (!a) return String(a);
      if (a instanceof Error) return a.stack || a.message || String(a);
      if (typeof a === "string") return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");
  // use stderr so it still shows up even if stdout is muted by user code
  console.error(chalk.red(msg));
};

module.exports = function (code, filePath) {
  try {
    // vm.Script does not support shebang lines (e.g. "#!/usr/bin/env node").
    // Strip them even if they appear inside bundled output (e.g. module bodies).
    const normalizedCode =
      typeof code === "string" ? code.replace(/^[ \t]*#!.*\r?\n/gm, "") : code;
    const script = new vm.Script(normalizedCode);
    const context = {
      module: {
        exports: module.exports,
      },
      exports: module.exports,
      console,
      process,
      require,
      queueMicrotask,
      Buffer,
      // timers (commonly expected by deps in Node)
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      setImmediate,
      clearImmediate,
      React: require('react'),
      ReactDOM: require('react-dom'),
      __filename: filePath,
      __dirname: path.dirname(filePath),
    };

    // run in new context
    script.runInNewContext(context);
  } catch (error) {
    logErr('Execute failed:', error);
    process.exit(1);
  }
}