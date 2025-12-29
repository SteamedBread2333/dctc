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

function isLocalSpecifier(spec) {
  return typeof spec === "string" && (spec.startsWith(".") || spec.startsWith("/"));
}

function fileExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function dirExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

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

function resolveLocal(fromFile, spec) {
  const baseDir = path.dirname(fromFile);
  const abs = spec.startsWith("/") ? path.resolve(spec) : path.resolve(baseDir, spec);
  const resolved = resolveWithExt(abs);
  if (!resolved) {
    throw new Error(`Cannot resolve import '${spec}' from '${fromFile}'`);
  }
  return resolved;
}

function normalizeId(p) {
  // Keep absolute path as module id for stable caching/resolution.
  return path.resolve(p);
}

function patchImportMetaUrl(source) {
  // Keep parity with esbuild compiler behavior in this repo.
  return source.replace(/import\.meta\.url/g, 'require("url").pathToFileURL(__filename).href');
}

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

function escapeForJsString(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function rewriteLocalRequires(transformedCode, requireMap) {
  let code = transformedCode;
  for (const [spec, resolvedId] of Object.entries(requireMap)) {
    const quoted = escapeForJsString(spec);
    const idQuoted = escapeForJsString(resolvedId);

    // Replace require("spec") and require('spec')
    const reDouble = new RegExp(`\\brequire\\(\\"${quoted}\\"\\)`, "g");
    const reSingle = new RegExp(`\\brequire\\(\\'${quoted.replace(/'/g, "\\'")}\\'\\)`, "g");

    code = code
      .replace(reDouble, `__dctc_require("${idQuoted}")`)
      .replace(reSingle, `__dctc_require("${idQuoted}")`);
  }
  return code;
}

module.exports = async function complie_swc(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    process.exit(1);
  }

  const entryAbs = path.resolve(filePath);

  try {
    const modules = {}; // id -> { code, filename, dirname }
    const requireMaps = {}; // id -> { spec: resolvedId }
    const visiting = new Set();
    const visited = new Set();

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

