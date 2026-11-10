// Builds both versions of ShellFlow from the files in src/:
//   public/index.html                              the hosted site (served by server.js)
//   dist/shellflow_interactive_prototype-2.html    the single file that runs on its own
//
// In the source, <!--@include path--> pulls in a file from src/, and
//   <!--@if hosted-->...<!--@else-->...<!--@endif-->   (in HTML)
//   /*@if hosted*/.../*@else*/.../*@endif*/            (in CSS and JavaScript)
// keep a piece for one version only. The other version is called "single".
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const TARGETS = {
  hosted: path.join(ROOT, 'public', 'index.html'),
  single: path.join(ROOT, 'dist', 'shellflow_interactive_prototype-2.html')
};

const OPEN = '(?:<!--|\\/\\*)';
const CLOSE = '(?:-->|\\*\\/)';
const CONDITION = new RegExp(`${OPEN}@if (\\w+)${CLOSE}([\\s\\S]*?)(?:${OPEN}@else${CLOSE}([\\s\\S]*?))?${OPEN}@endif${CLOSE}`, 'g');

function includeFiles(text, seen = []) {
  return text.replace(/<!--@include ([\w./-]+)-->/g, (_, file) => {
    if (seen.includes(file)) throw new Error(`${file} includes itself`);
    const full = path.join(SRC, file);
    if (!fs.existsSync(full)) throw new Error(`Missing source file: src/${file}`);
    return includeFiles(fs.readFileSync(full, 'utf8'), [...seen, file]);
  });
}

function forVersion(text, version) {
  const out = text.replace(CONDITION, (_, wanted, yes, no = '') => {
    if (!Object.keys(TARGETS).includes(wanted)) throw new Error(`Unknown version in @if: ${wanted}`);
    return wanted === version ? yes : no;
  });
  const left = out.match(/(?:<!--|\/\*)@(?:if|else|endif|include)\b/);
  if (left) throw new Error(`A build marker was left unmatched near: ${out.slice(left.index, left.index + 60)}`);
  return out;
}

function build() {
  const started = Date.now();
  const page = includeFiles(fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'));
  for (const [version, file] of Object.entries(TARGETS)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, forVersion(page, version));
  }
  const kb = file => Math.round(fs.statSync(file).size / 1024);
  console.log(`[build] hosted ${kb(TARGETS.hosted)} KB, single file ${kb(TARGETS.single)} KB in ${Date.now() - started} ms`);
}

module.exports = { build, TARGETS, SRC };

if (require.main === module) {
  try {
    build();
  } catch (err) {
    console.error(`[build] ${err.message}`);
    process.exit(1);
  }
}
