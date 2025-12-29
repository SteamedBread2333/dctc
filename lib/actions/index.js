const complie_es = require("../complie_es");
const complie_rollup = require("../complie_rollup");
const complie_rolldown = require("../complie_rolldown");
const execute = require("../execute");
const chalk = require("chalk");
const log = content => console.log(chalk.green(content));
const logInfo = content => console.log(chalk.bgWhiteBright(content));

async function applyVersion() {
  log(`Version: ${require("../../package.json").version}`);
}

function applyHelp() {
  logInfo("dctc is a tool for running TypeScript and JSX files in the browser.");
  logInfo("Usage: dctc [options] <file>");
  logInfo("Options:");
  logInfo(`  -v, --version        Print the version number`);
  logInfo(`  -h, --help           Print this help message`);
  logInfo(`  -c, --compiler <name> Specify compiler: es, rollup, rolldown (default: es)`);
  logInfo("Examples:");
  logInfo(`  dctc src/index.tsx`);
  logInfo(`  dctc src/index.ts`);
  logInfo(`  dctc --compiler rollup src/index.tsx`);
  logInfo(`  dctc -c rolldown src/index.ts`);
}

async function applyDctc(inputFile, compiler = 'es') {
  let code;
  
  switch (compiler.toLowerCase()) {
    case 'es':
    case 'esbuild':
      code = await complie_es(inputFile);
      break;
    case 'rollup':
      code = await complie_rollup(inputFile);
      break;
    case 'rolldown':
      code = await complie_rolldown(inputFile);
      break;
    default:
      log(`Unknown compiler: ${compiler}, using default 'es'`);
      code = await complie_es(inputFile);
      break;
  }
  
  execute(code, inputFile);
  process.exit(0);
}

module.exports = {
  applyVersion,
  applyHelp,
  applyDctc,
}