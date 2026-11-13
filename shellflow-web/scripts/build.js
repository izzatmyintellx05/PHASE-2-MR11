// Builds both versions of ShellFlow from the files in src/:
//   public/index.html                              the hosted site (served by server.js)
//   dist/shellflow_interactive_prototype-2.html    the single file that runs on its own
//
// In the source, <!--@include path--> pulls in a file from src/, and
//   <!--@if hosted-->...<!--@else-->...<!--@endif-->   (in HTML)
//   /*@if hosted*/.../*@else*/.../*@endif*/            (in CSS and JavaScript)
// keep a piece for one version only. The other version is called "single".
//
// Two more markers are filled in by the build, so the browser has nothing to compile:
//   <!--@tailwind-->   the Tailwind CSS the page uses, compiled with src/scripts/tailwind.config.js
//   <!--@icons-->      a small icon script with only the Lucide icons the source names
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

// ---- Tailwind, compiled here instead of in the browser ----
// A few class names are put together in code (for example bg-${tone}-100), so Tailwind cannot
// see them in the source. These patterns keep every colour and shade the code can produce.
const TONES = 'slate|gray|emerald|green|teal|rose|red|amber|orange|yellow|sky|blue|indigo|violet|purple|cyan';
const SAFELIST = [
  { pattern: new RegExp(`^(bg|text|border)-(${TONES})-(50|100|200|600|700|800|950)$`) },
  { pattern: new RegExp(`^bg-(${TONES})-50/(40|50|60)$`) },
  'bg-slate-400'
];
// Comments go and spaces shrink; a space before ":" is kept, as it can matter in a selector
const minifyCss = css => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,>])\s*/g, '$1').replace(/:\s+/g, ':').replace(/;}/g, '}').trim();

function tailwindConfig() {
  // The config file is written for the browser (it sets tailwind.config), so read it the same way
  const sandbox = { window: {}, tailwind: {} };
  sandbox.window.tailwind = sandbox.tailwind;
  vm.runInNewContext(fs.readFileSync(path.join(SRC, 'scripts', 'tailwind.config.js'), 'utf8'), sandbox);
  const config = sandbox.window.tailwind.config || sandbox.tailwind.config;
  if (!config) throw new Error('src/scripts/tailwind.config.js did not set tailwind.config');
  return config;
}

async function compileTailwind(page) {
  const postcss = require('postcss');
  const tailwind = require('tailwindcss');
  // public/hosted.js is served as it is, but it draws markup too (admin users, sign-in), so it is read as well
  const hosted = path.join(ROOT, 'public', 'hosted.js');
  const content = [{ raw: page, extension: 'html' }, ...(fs.existsSync(hosted) ? [{ raw: fs.readFileSync(hosted, 'utf8'), extension: 'js' }] : [])];
  const config = { ...tailwindConfig(), content, safelist: SAFELIST };
  const result = await postcss([tailwind(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined });
  return minifyCss(result.css);
}

// ---- Icons: only the Lucide icons the source names, with the same createIcons() the page calls ----
function iconScript(page) {
  const { icons } = require('lucide');
  const pascal = name => name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
  // Every kebab-case word in the source that is also an icon name; a few extra words cost little
  const names = [...new Set(page.match(/[a-z][a-z0-9]*(?:-[a-z0-9]+)*/g))].filter(n => icons[pascal(n)]).sort();
  const subset = Object.fromEntries(names.map(n => [n, icons[pascal(n)][2]]));
  return `(function () {
  var ICONS = ${JSON.stringify(subset)};
  var BASE = { xmlns: 'http://www.w3.org/2000/svg', width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  function make(tag, attrs, kids) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { el.appendChild(make(c[0], c[1], c[2])); });
    return el;
  }
  // Swaps each <i data-lucide="name"> for its drawing, as Lucide does; icons are decoration unless labelled
  window.lucide = { createIcons: function () {
    document.querySelectorAll('i[data-lucide]').forEach(function (el) {
      var name = el.getAttribute('data-lucide'), kids = ICONS[name];
      if (!kids) return;
      var svg = make('svg', BASE, kids);
      for (var i = 0; i < el.attributes.length; i++) { var a = el.attributes[i]; if (a.name !== 'class') svg.setAttribute(a.name, a.value); }
      svg.setAttribute('class', ('lucide lucide-' + name + ' ' + (el.getAttribute('class') || '')).trim());
      if (!svg.hasAttribute('aria-label')) svg.setAttribute('aria-hidden', 'true');
      el.parentNode.replaceChild(svg, el);
    });
  } };
})();`;
}

async function build() {
  const started = Date.now();
  let page = includeFiles(fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'));
  const css = await compileTailwind(page);
  const icons = iconScript(page);
  page = page.replace('<!--@tailwind-->', () => css).replace('<!--@icons-->', () => icons);
  // The MFE logo, built in as small images
  const full = path.join(SRC, 'assets', 'mr11-logo-full.png');
  if (fs.existsSync(full)) page = page.split('@@LOGO_FULL@@').join(`data:image/png;base64,${fs.readFileSync(full).toString('base64')}`);
  for (const size of [64, 128, 256]) {
    const file = path.join(SRC, 'assets', `mfe-logo-${size}.png`);
    if (fs.existsSync(file)) page = page.split(`@@LOGO_${size}@@`).join(`data:image/png;base64,${fs.readFileSync(file).toString('base64')}`);
  }
  for (const [version, file] of Object.entries(TARGETS)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, forVersion(page, version));
  }
  const kb = file => Math.round(fs.statSync(file).size / 1024);
  console.log(`[build] hosted ${kb(TARGETS.hosted)} KB, single file ${kb(TARGETS.single)} KB (Tailwind ${Math.round(css.length / 1024)} KB, icons ${Math.round(icons.length / 1024)} KB) in ${Date.now() - started} ms`);
}

module.exports = { build, TARGETS, SRC };

if (require.main === module) {
  build().catch(err => {
    console.error(`[build] ${err.message}`);
    process.exit(1);
  });
}
