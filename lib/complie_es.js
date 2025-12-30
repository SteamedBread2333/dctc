/**
 * Compile a given file to CommonJS format using esbuild.
 * This function takes a file path, compiles it to CommonJS format,
 * and returns the compiled code.
 * @param {string} filePath - The path to the file to be compiled.
 * @returns {Promise<string>} - The compiled code.
 * @author pipi
 */
const fs = require('fs'); // Import the file system module
const path = require('path'); // Import the path module
const chalk = require("chalk");
const esbuild = require('esbuild');
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
    // Use esbuild to compile the file
    const result = await esbuild.build({
      entryPoints: [absoluteFilePath], // Specify the entry file
      format: 'cjs', // Output format as CommonJS
      target: 'es2015', // Target runtime environment
      bundle: true, // Bundle all dependencies
      platform: 'node', // Target platform
      loader: {
        '.ts': 'ts', // Treat .ts files as TypeScript
        '.tsx': 'tsx', // Treat .tsx files as TypeScript JSX
        '.js': 'js', // Treat .js files as JavaScript
        '.jsx': 'jsx', // Treat .jsx files as JavaScript JSX
      },
      define: {
        'process.env.NODE_ENV': '"development"', // Define environment variables
      },
      plugins: [
        {
          name: 'resolve-ts-dependencies',
          setup(build) {
            build.onResolve({ filter: /\.tsx?$/ }, async (args) => {
              const resolvedPath = path.resolve(args.resolveDir, args.path);
              if (fs.existsSync(resolvedPath + '.ts')) {
                return { path: resolvedPath + '.ts' };
              } else if (fs.existsSync(resolvedPath + '.tsx')) {
                return { path: resolvedPath + '.tsx' };
              } else {
                return null;
              }
            });
          },
        },
        {
          name: 'import-meta-shim',
          setup(build) {
            build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
              const contents = await fs.promises.readFile(args.path, 'utf8');
              const transformed = contents.replace(
                /import\.meta\.url/g,
                'require("url").pathToFileURL(__filename).href'
              );
              return { 
                contents: transformed, 
                loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' 
              };
            });
          },
        },
      ],
      tsconfigRaw: {
        compilerOptions: {
                target: 'es2015', // Target JavaScript version
          module: 'CommonJS', // Module system
          strict: true, // Enable strict mode
          moduleResolution: 'node', // Module resolution strategy
          esModuleInterop: true, // Enable ES module interop
          skipLibCheck: true, // Skip type library checks
          allowSyntheticDefaultImports: true, // Allow synthetic default imports
          sourceMap: true, // Generate source maps
          resolveJsonModule: true, // Allow importing JSON files
          lib: ['ESNext', 'DOM'], // Specify library files
          jsx: 'react', // JSX support
        },
        exclude: ['node_modules'], // Exclude directories
      },
      write: false, // Prevent writing output files
      external: ['react', 'react-dom'], // Exclude external dependencies
    });

    // Get the compiled code
    const code = result.outputFiles[0].text;
    return code;
  } catch (error) {
    logErr('Build failed:');
    console.error(error);
    throw error;
  }
}