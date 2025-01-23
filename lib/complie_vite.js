/**
 * Compile a given file to CommonJS format using Vite.
 * This function takes a file path, compiles it to CommonJS format,
 * and runs the compiled code in the current Node.js context.
 * @param {string} filePath - The path to the file to be compiled.
 * @returns {string} code - The compiled code.
 * @author pipi
 */
const { build } = require('vite'); // Import the build function from Vite
const fs = require('fs'); // Import the file system module
const path = require('path'); // Import the path module
const chalk = require("chalk");
const logErr = content => console.log(chalk.red(content));

const { defineConfig } = require('vite');

module.exports = async function (filePath) {
  // Ensure the file exists
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    process.exit(1);
  }

  // Get the absolute path of the file
  const absoluteFilePath = path.resolve(filePath);

  // Configure Vite build options
  const viteConfig = defineConfig({
    overrides: {
      fs: 'browserify-fs', // 替换 `fs` 模块
      path: 'path-browserify', // 替换 `path` 模块
      // 其他需要替换的模块
    },
    build: {
      target: 'node18', // Compile for Node.js environment
      format: 'cjs', // Output format as CommonJS
      lib: {
        entry: absoluteFilePath, // Specify the entry file
        formats: ['cjs'], // Specify the output format
      },
      outDir: 'dist-dctc',
      rollupOptions: {
        output: {
          entryFileNames: 'bundle.js',
        },
      },
    },
  });

  try {
    // Use Vite to build the file
    const bundle = await build(viteConfig);

    // Get the compiled file content
    const output = bundle[0].output[0];
    if (!output) {
      logErr('No output file generated');
      process.exit(1);
    }

    return output.code;
  } catch (error) {
    logErr('Compilation failed:', error);
    process.exit(1);
  }
}