/**
 * This function takes code as input and executes it in a new context,
 * @param {string} code - The code to be executed.
 * @author pipi
 * @returns {void}
 */
const vm = require("vm"); // Import the virtual machine module
const path = require("path"); // Import the path module
const chalk = require("chalk");
const logErr = content => console.log(chalk.red(content));

module.exports = function (code, filePath) {
  try {
    const script = new vm.Script(code);
    const context = {
      module: {
        exports: module.exports,
      },
      exports: module.exports,
      console,
      process,
      require,
      queueMicrotask,
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