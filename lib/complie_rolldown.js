/**
 * Compile a given file to CommonJS format using Rolldown.
 * This function takes a file path, compiles it to CommonJS format,
 * and returns the compiled code.
 * @param {string} filePath - The path to the file to be compiled.
 * @returns {Promise<string>} - The compiled code.
 * @author pipi
 */
const fs = require('fs'); // Import the file system module
const path = require('path'); // Import the path module
const chalk = require("chalk");
const { rolldown } = require('rolldown');
const logErr = content => console.log(chalk.red(content)); // Function to log error messages in red color

module.exports = async function (filePath) {
  // Ensure the file exists
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${JSON.stringify(filePath)}`);
    process.exit(1);
  }

  // Get the absolute path of the file
  const absoluteFilePath = path.resolve(filePath);

  try {
    // Create a rolldown build
    const build = await rolldown({
      input: absoluteFilePath,
      external: ['react', 'react-dom'],
      resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
      platform: 'node',
    });

    // Generate output without writing to file
    const output = await build.generate({
      format: 'cjs',
    });

    // Get the compiled code from output
    const code = output.output[0].code;
    
    return code;
  } catch (error) {
    logErr('Build failed:');
    console.error(error);
    throw error;
  }
}
