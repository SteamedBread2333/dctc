/**
 * Compile a given file to CommonJS format using Rollup.
 * This function takes a file path, compiles it to CommonJS format,
 * and returns the compiled code.
 * @param {string} filePath - The path to the file to be compiled.
 * @returns {Promise<string>} - The compiled code.
 * @author pipi
 */
const fs = require('fs'); // Import the file system module
const path = require('path'); // Import the path module
const chalk = require("chalk");
const rollup = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const logErr = content => console.log(chalk.red(content)); // Function to log error messages in red color

// Custom plugin to ensure correct file resolution
function resolveTsFiles() {
  return {
    name: 'resolve-ts-files',
    resolveId(source, importer) {
      // Only handle relative imports
      if (!importer || !source.startsWith('.')) {
        return null;
      }
      
      const resolveDir = importer ? path.dirname(importer) : process.cwd();
      const resolvedPath = path.resolve(resolveDir, source);
      
      // Check for .tsx first, then .ts
      if (fs.existsSync(resolvedPath + '.tsx')) {
        return resolvedPath + '.tsx';
      } else if (fs.existsSync(resolvedPath + '.ts')) {
        return resolvedPath + '.ts';
      }
      
      return null;
    },
  };
}

// Custom plugin to ensure entry file is correctly resolved
function ensureEntryFile(entryFile) {
  const normalizedEntryFile = path.resolve(entryFile);
  
  return {
    name: 'ensure-entry-file',
    buildStart(options) {
      // Verify the entry file exists and is correct
      if (!fs.existsSync(entryFile)) {
        throw new Error(`Entry file does not exist: ${entryFile}`);
      }
    },
    resolveId(id, importer) {
      // Handle entry file resolution with highest priority
      // This runs before other plugins to ensure correct file is used
      const normalizedId = path.resolve(id);
      
      // If this is the entry file (exact match), return it
      if (normalizedId === normalizedEntryFile) {
        return entryFile;
      }
      
      // If id matches entry file without extension, return the actual entry file
      // This prevents rollup from trying .ts when we want .tsx
      const idWithoutExt = normalizedId.replace(/\.(tsx?|jsx?)$/, '');
      const entryWithoutExt = normalizedEntryFile.replace(/\.(tsx?|jsx?)$/, '');
      if (idWithoutExt === entryWithoutExt && idWithoutExt !== normalizedId) {
        // Only return entry file if id doesn't have extension but entry does
        return entryFile;
      }
      
      return null;
    },
  };
}

module.exports = async function (filePath) {
  // Ensure the file exists
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${JSON.stringify(filePath)}`);
    process.exit(1);
  }

  // Get the absolute path of the file
  const absoluteFilePath = path.resolve(filePath);

  try {
    // Create a rollup bundle
    const bundle = await rollup.rollup({
      input: absoluteFilePath,
      plugins: [
        // Custom plugin to intercept and fix entry file resolution
        {
          name: 'fix-entry-file',
          resolveId(id) {
            // If this is the entry file, ensure it's returned as-is
            const normalizedId = path.resolve(id);
            const normalizedEntry = path.resolve(absoluteFilePath);
            
            // Exact match
            if (normalizedId === normalizedEntry) {
              return absoluteFilePath;
            }
            
            // Match without extension (rollup might try this)
            const idWithoutExt = normalizedId.replace(/\.(tsx?|jsx?)$/, '');
            const entryWithoutExt = normalizedEntry.replace(/\.(tsx?|jsx?)$/, '');
            if (idWithoutExt === entryWithoutExt && idWithoutExt !== normalizedEntry) {
              // If rollup is trying to resolve without extension, return the actual entry file
              return absoluteFilePath;
            }
            
            return null;
          },
        },
        // Ensure entry file is resolved correctly before TypeScript plugin
        ensureEntryFile(absoluteFilePath),
        // TypeScript plugin must come before nodeResolve to handle TS/TSX files
        typescript({
          tsconfig: false,
          compilerOptions: {
            target: 'es2015',
            module: 'esnext',
            moduleResolution: 'node',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            allowSyntheticDefaultImports: true,
            jsx: 'react',
            lib: ['ESNext', 'DOM'],
            resolveJsonModule: true,
          },
          include: [absoluteFilePath, '**/*.ts', '**/*.tsx'],
          // Explicitly exclude files that might be incorrectly resolved
          exclude: [],
        }),
        resolveTsFiles(),
        nodeResolve({
          preferBuiltins: false,
          extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
        }),
        commonjs(),
      ],
      external: ['react', 'react-dom'],
    });

    // Generate the output
    const { output } = await bundle.generate({
      format: 'cjs',
      exports: 'auto',
    });

    // Get the compiled code
    const code = output[0].code;
    
    // Close the bundle
    await bundle.close();
    
    return code;
  } catch (error) {
    logErr('Build failed:');
    console.error(error);
    throw error;
  }
}
