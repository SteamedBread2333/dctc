/**
 * Compile a given file to CommonJS format using SWC.
 * This compiler bundles local (relative) TS/TSX/JS/JSX/JSON modules into a single CJS string
 * so it can be executed via vm the same way as other compilers in this repo.
 *
 * Notes:
 * - Non-relative imports (e.g. react, react-dom/server, node built-ins) remain as runtime requires.
 * - Relative imports are resolved and bundled, with a tiny module loader injected.
 *
 * @param {string} filePath - The path to the file to be compiled.
 * @returns {Promise<string>} - The compiled (bundled) code.
 * @author pipi
 */
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const swc = require("@swc/core");

const logErr = (content) => console.log(chalk.red(content));

const LOCAL_EXTS = [".ts", ".tsx", ".js", ".jsx", ".json"];

/**
 * Determine whether an import/require specifier should be treated as "local".
 *
 * In this compiler, only local specifiers are bundled into the output:
 * - Relative paths like "./x" or "../x"
 * - Absolute file paths like "/Users/.../x"
 *
 * Everything else (e.g. "react", "react-dom/server", "fs") is considered external and will be
 * resolved at runtime via Node's `require`.
 *
 * @param {string} spec - The module specifier as written in source code.
 * @returns {boolean} True if the specifier is local and should be bundled.
 */
function isLocalSpecifier(spec) {
  return typeof spec === "string" && (spec.startsWith(".") || spec.startsWith("/"));
}

/**
 * Best-effort file existence check.
 *
 * We wrap `fs.existsSync` + `fs.statSync` to avoid throwing (e.g. permission issues, broken symlinks)
 * and to ensure the path is a regular file.
 *
 * @param {string} p - Path to check.
 * @returns {boolean} True if the path exists and is a file.
 */
function fileExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Best-effort directory existence check.
 *
 * @param {string} p - Path to check.
 * @returns {boolean} True if the path exists and is a directory.
 */
function dirExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolve a module path by trying common extensions and `index.*` fallbacks.
 *
 * This mimics typical TS/Node resolution for local imports:
 * - If `basePath` is an existing file, return it as-is.
 * - Otherwise, try appending known extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`.
 * - If `basePath` is a directory, try `basePath/index.<ext>` in the same extension order.
 *
 * @param {string} basePath - Absolute path without extension (or a candidate path).
 * @returns {string|null} The resolved file path, or null if not found.
 */
function resolveWithExt(basePath) {
  if (fileExists(basePath)) return basePath;

  for (const ext of LOCAL_EXTS) {
    const candidate = basePath + ext;
    if (fileExists(candidate)) return candidate;
  }

  if (dirExists(basePath)) {
    for (const ext of LOCAL_EXTS) {
      const candidate = path.join(basePath, "index" + ext);
      if (fileExists(candidate)) return candidate;
    }
  }

  return null;
}

/**
 * Resolve a local specifier (relative or absolute) into an absolute file path.
 *
 * @param {string} fromFile - Absolute path of the importing file.
 * @param {string} spec - Import specifier found in `fromFile` (must be local).
 * @returns {string} Absolute path to the resolved target file.
 * @throws {Error} If the target cannot be resolved.
 */
function resolveLocal(fromFile, spec) {
  const baseDir = path.dirname(fromFile);
  const abs = spec.startsWith("/") ? path.resolve(spec) : path.resolve(baseDir, spec);
  const resolved = resolveWithExt(abs);
  if (!resolved) {
    throw new Error(`Cannot resolve import '${spec}' from '${fromFile}'`);
  }
  return resolved;
}

/**
 * Normalize a file path to a stable, absolute module id used as the bundle key.
 *
 * Using absolute, normalized paths as ids:
 * - avoids duplicates (e.g. `a/../b` vs `b`)
 * - makes dependency maps deterministic
 *
 * @param {string} p - Any file path.
 * @returns {string} Normalized absolute path.
 */
function normalizeId(p) {
  // Keep absolute path as module id for stable caching/resolution.
  return path.resolve(p);
}

/**
 * Replace `import.meta.url` with a CommonJS-compatible equivalent.
 *
 * The execution environment for dctc is CommonJS in a VM context. `import.meta` does not exist
 * there, so we rewrite it to:
 *   require("url").pathToFileURL(__filename).href
 *
 * This matches the behavior of the existing esbuild compiler in this repo.
 *
 * @param {string} source - Original source code.
 * @returns {string} Transformed source code.
 */
function patchImportMetaUrl(source) {
  // Keep parity with esbuild compiler behavior in this repo.
  return source.replace(/import\.meta\.url/g, 'require("url").pathToFileURL(__filename).href');
}

/**
 * Collect module specifiers from a SWC AST.
 *
 * We intentionally only collect:
 * - ESM imports: `import ... from "x"`
 * - Re-exports: `export ... from "x"` / `export * from "x"`
 * - CommonJS requires with string literal arguments: `require("x")`
 *
 * Dynamic or non-literal requires are NOT collected (e.g. `require(name)`), because we cannot
 * reliably bundle those.
 *
 * @param {object} ast - AST returned by `swc.parse`.
 * @returns {string[]} Deduplicated list of specifier strings.
 */
function collectSpecifiersFromAst(ast) {
  const specs = new Set();

  const visit = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const n of node) visit(n);
      return;
    }
    if (typeof node !== "object") return;

    // import ... from "x"
    if (node.type === "ImportDeclaration" && node.source && typeof node.source.value === "string") {
      specs.add(node.source.value);
    }

    // export ... from "x"
    if (
      (node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") &&
      node.source &&
      typeof node.source.value === "string"
    ) {
      specs.add(node.source.value);
    }

    // require("x")
    if (
      node.type === "CallExpression" &&
      node.callee &&
      node.callee.type === "Identifier" &&
      node.callee.value === "require" &&
      Array.isArray(node.arguments) &&
      node.arguments.length === 1
    ) {
      const arg = node.arguments[0];
      // SWC AST uses ExprOrSpread; string literal is { expression: { type: 'StringLiteral', value: '...' } }
      const expr = arg && (arg.expression || arg);
      if (expr && expr.type === "StringLiteral" && typeof expr.value === "string") {
        specs.add(expr.value);
      }
    }

    for (const key of Object.keys(node)) {
      if (key === "span") continue;
      visit(node[key]);
    }
  };

  visit(ast);
  return Array.from(specs);
}

/**
 * Parse a file and extract local dependency specifiers.
 *
 * This function uses SWC to parse the source into an AST, collects all static module specifiers,
 * and then filters down to only local specifiers (relative or absolute paths) that we intend to bundle.
 *
 * @param {string} absPath - Absolute file path (used to choose parser options).
 * @param {string} source - File contents (possibly preprocessed).
 * @returns {Promise<string[]>} Local specifiers only (e.g. ["./src", "../util"]).
 */
async function parseForImports(absPath, source) {
  const ext = path.extname(absPath).toLowerCase();
  const isTs = ext === ".ts" || ext === ".tsx";
  const isTsx = ext === ".tsx";
  const isJsx = ext === ".jsx";

  const ast = await swc.parse(source, {
    syntax: isTs ? "typescript" : "ecmascript",
    tsx: isTsx,
    jsx: isJsx,
    decorators: false,
    dynamicImport: true,
  });

  return collectSpecifiersFromAst(ast).filter(isLocalSpecifier);
}

/**
 * Transform a single module to CommonJS using SWC.
 *
 * Important configuration choices:
 * - React JSX transform uses "classic" runtime => outputs `React.createElement(...)`.
 *   This matches dctc's VM context which injects a `React` global.
 * - Module output is CommonJS to align with the VM execution strategy.
 *
 * @param {string} absPath - Absolute file path (passed to SWC for better diagnostics).
 * @param {string} source - File contents (possibly preprocessed).
 * @returns {Promise<string>} Transformed JavaScript code in CJS format.
 */
async function transformToCjs(absPath, source) {
  const ext = path.extname(absPath).toLowerCase();
  const isTs = ext === ".ts" || ext === ".tsx";
  const isTsx = ext === ".tsx";
  const isJsx = ext === ".jsx";

  const out = await swc.transform(source, {
    filename: absPath,
    sourceMaps: false,
    jsc: {
      target: "es2015",
      externalHelpers: false,
      parser: {
        syntax: isTs ? "typescript" : "ecmascript",
        tsx: isTsx,
        jsx: isJsx,
        decorators: false,
        dynamicImport: true,
      },
      transform: {
        react: {
          runtime: "classic",
          pragma: "React.createElement",
          pragmaFrag: "React.Fragment",
          throwIfNamespace: true,
          useBuiltins: false,
        },
      },
    },
    module: {
      type: "commonjs",
      strict: true,
      strictMode: true,
      lazy: false,
      noInterop: false,
    },
  });

  return out.code || "";
}

/**
 * Escape a string so it can be embedded inside a double-quoted JavaScript string literal
 * in the generated bundle code.
 *
 * @param {unknown} str - Any value convertible to string.
 * @returns {string} Escaped string.
 */
function escapeForJsString(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Escape a string so it can be safely embedded as a literal inside a RegExp pattern.
 *
 * This ensures that all regular-expression metacharacters (including backslashes)
 * are treated as normal characters.
 *
 * @param {unknown} str - Any value convertible to string.
 * @returns {string} Escaped string for use in a RegExp pattern.
 */
function escapeForRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rewrite local `require(...)` calls inside transformed CJS code to route through the bundle loader.
 *
 * After SWC transforms ESM imports to CJS, local imports typically become `require("./x")`.
 * In a single-string VM bundle, `require("./x")` would be resolved relative to runtime state and
 * would bypass our in-bundle module table.
 *
 * So we replace:
 *   require("./x")  -> __dctc_require("<absolute-module-id>")
 *
 * Only specifiers present in `requireMap` are rewritten.
 *
 * @param {string} transformedCode - Output from `transformToCjs`.
 * @param {Record<string, string>} requireMap - Map: original specifier -> normalized absolute module id.
 * @returns {string} Rewritten code.
 */
function rewriteLocalRequires(transformedCode, requireMap) {
  let code = transformedCode;
  for (const [spec, resolvedId] of Object.entries(requireMap)) {
    const specRegex = escapeForRegex(spec);
    const idQuoted = escapeForJsString(resolvedId);

    // Replace require("spec") and require('spec')
    const reDouble = new RegExp(`\\brequire\\("${specRegex}"\\)`, "g");
    const reSingle = new RegExp(`\\brequire\\('${specRegex}'\\)`, "g");

    code = code
      .replace(reDouble, `__dctc_require("${idQuoted}")`)
      .replace(reSingle, `__dctc_require("${idQuoted}")`);
  }
  return code;
}

/**
 * Compile an entry file using SWC and bundle local dependencies into a single CJS string.
 *
 * High-level flow:
 * - Resolve the entry file to an absolute path.
 * - Recursively walk local imports/re-exports/requires.
 * - For each module:
 *   - JSON: inline as `module.exports = <parsed-json>`
 *   - Others: preprocess `import.meta.url`, SWC-transform to CJS, rewrite local requires.
 * - Emit a small runtime module system:
 *   - `__dctc_modules`: module table keyed by absolute ids
 *   - `__dctc_require`: loads from table and falls back to Node `require` for externals
 *   - `__dctc_cache`: require cache to avoid double execution
 * - Execute the entry module.
 *
 * @param {string} filePath - Entry file path (relative or absolute).
 * @returns {Promise<string>} A single JavaScript string in CommonJS style ready for vm execution.
 */
module.exports = async function complie_swc(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${JSON.stringify(filePath)}`);
    process.exit(1);
  }

  const entryAbs = path.resolve(filePath);

  try {
    const modules = {}; // id -> { code, filename, dirname }
    const requireMaps = {}; // id -> { spec: resolvedId }
    const visiting = new Set();
    const visited = new Set();

    /**
     * Load (and compile) one module into the in-memory bundle tables.
     *
     * This function is intentionally DFS:
     * - It records the dependency map for the current module.
     * - Then loads dependencies first.
     * - Finally transforms and stores the current module.
     *
     * `visiting`/`visited` are used to prevent infinite recursion for cyclic imports.
     * This is a pragmatic cycle guard; it does not fully emulate Node's nuanced cyclic export timing,
     * but is sufficient for common project structures.
     *
     * @param {string} absPath - Absolute file path of the module.
     * @returns {Promise<void>}
     */
    const loadModule = async (absPath) => {
      const id = normalizeId(absPath);
      if (visited.has(id)) return;
      if (visiting.has(id)) return; // avoid cycles
      visiting.add(id);

      const ext = path.extname(absPath).toLowerCase();
      if (ext === ".json") {
        const jsonText = await fs.promises.readFile(absPath, "utf8");
        const jsonValue = JSON.parse(jsonText);
        modules[id] = {
          filename: absPath,
          dirname: path.dirname(absPath),
          code: `module.exports = ${JSON.stringify(jsonValue)};`,
        };
        requireMaps[id] = {};
        visited.add(id);
        visiting.delete(id);
        return;
      }

      let source = await fs.promises.readFile(absPath, "utf8");
      source = patchImportMetaUrl(source);

      const localImports = await parseForImports(absPath, source);
      const map = {};
      for (const spec of localImports) {
        const resolved = resolveLocal(absPath, spec);
        const resolvedId = normalizeId(resolved);
        map[spec] = resolvedId;
      }
      requireMaps[id] = map;

      // Load deps first
      for (const spec of localImports) {
        await loadModule(resolveLocal(absPath, spec));
      }

      const transformed = await transformToCjs(absPath, source);
      const rewritten = rewriteLocalRequires(transformed, map);

      modules[id] = {
        filename: absPath,
        dirname: path.dirname(absPath),
        code: rewritten,
      };

      visited.add(id);
      visiting.delete(id);
    };

    await loadModule(entryAbs);

    const entries = Object.entries(modules);
    const moduleTable = entries
      .map(([id, m]) => {
        const idStr = escapeForJsString(id);
        const filenameStr = escapeForJsString(m.filename);
        const dirnameStr = escapeForJsString(m.dirname);
        // Wrap each module in a function to emulate Node's per-module __filename/__dirname.
        return `"${idStr}": { filename: "${filenameStr}", dirname: "${dirnameStr}", fn: function(module, exports, __dctc_require, require, __filename, __dirname) {\n${m.code}\n} }`;
      })
      .join(",\n");

    const entryId = escapeForJsString(normalizeId(entryAbs));

    const bundle = `(function () {
  "use strict";
  var __dctc_modules = {
${moduleTable}
  };
  var __dctc_cache = Object.create(null);
  function __dctc_require(id) {
    if (__dctc_cache[id]) return __dctc_cache[id].exports;
    var record = __dctc_modules[id];
    if (!record) return require(id);
    var module = { exports: {} };
    __dctc_cache[id] = module;
    record.fn(module, module.exports, __dctc_require, require, record.filename, record.dirname);
    return module.exports;
  }
  __dctc_require("${entryId}");
})();`;

    return bundle;
  } catch (error) {
    logErr("Build failed:");
    console.error(error);
    throw error;
  }
};

