// Development mode: builds both versions, rebuilds whenever a file in src/ changes,
// and runs the site. Refresh the browser to see changes. public/hosted.js is served
// as it is, so edits there need only a refresh.
const fs = require('fs');
const path = require('path');
const { build, SRC } = require('./build');

function safeBuild() {
  return build().catch(err => console.error(`[build] ${err.message}`));
}

safeBuild();

let timer = null;
fs.watch(SRC, { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(safeBuild, 150);
});
console.log('[dev] Watching src/ for changes');

require('../server.js');
