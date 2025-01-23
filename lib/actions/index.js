// const complie_vite = require("../complie_vite");
const complie_es = require("../complie_es");
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
  logInfo(`  -v, --version  Print the version number`);
  logInfo(`  -h, --help     Print this help message`);
  logInfo("Examples:");
  logInfo(`  dctc src/index.tsx`);
  logInfo(`  dctc src/index.ts`);
}

async function applyDctc(inputFile) {
  // const code = await complie_vite(inputFile);
  const code = await complie_es(inputFile);
  execute(code, inputFile);
  process.exit(0);
}

module.exports = {
  applyVersion,
  applyHelp,
  applyDctc,
}