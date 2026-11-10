// Renders the Mermaid diagrams below to PNG files in ./diagrams, using the local Chrome.
// Usage: node diagrams.js [name,name...]
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
const OUT = path.join(__dirname, 'diagrams');

const DIAGRAMS = require('./diagram-defs.js');

const html = (code) => `<!doctype html><html><head><meta charset="utf-8">
<style>#d svg text,#d svg tspan,#d .nodeLabel,#d .edgeLabel,#d .label,#d span{fill:#000!important;color:#000!important}body{margin:0;background:#fff;font-family:Calibri,'Segoe UI',Arial,sans-serif}#d{display:inline-block;padding:16px}</style>
<script src="${MERMAID}"></script></head><body><div id="d"><pre class="mermaid">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>
<script>
mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'base', fontFamily: 'Calibri, Segoe UI, Arial, sans-serif',
  themeVariables: { fontSize: '16px', primaryColor: '#F2F2F2', primaryBorderColor: '#404040', primaryTextColor: '#000000',
    secondaryColor: '#FAFAFA', secondaryTextColor: '#000000', tertiaryColor: '#FFFFFF', tertiaryTextColor: '#000000',
    textColor: '#000000', lineColor: '#404040', labelTextColor: '#000000', edgeLabelBackground: '#FFFFFF',
    clusterBkg: '#FAFAFA', clusterBorder: '#808080', titleColor: '#000000',
    actorBkg: '#F2F2F2', actorBorder: '#404040', actorTextColor: '#000000', actorLineColor: '#808080',
    signalColor: '#404040', signalTextColor: '#000000', labelBoxBkgColor: '#F2F2F2', labelBoxBorderColor: '#404040',
    loopTextColor: '#000000', noteBkgColor: '#FFFFFF', noteBorderColor: '#404040', noteTextColor: '#000000',
    classText: '#000000', attributeBackgroundColorOdd: '#FFFFFF', attributeBackgroundColorEven: '#F7F7F7' },
  flowchart: { htmlLabels: true, curve: 'basis', padding: 12, useMaxWidth: false }, sequence: { mirrorActors: false, useMaxWidth: false, actorMargin: 24, width: 120, boxMargin: 8, noteMargin: 8 },
  er: { useMaxWidth: false }, class: { useMaxWidth: false } });
// Draw every diagram at its natural size (some diagram types otherwise shrink to the container)
mermaid.run().then(() => {
  document.querySelectorAll('svg').forEach((s) => {
    const vb = s.viewBox && s.viewBox.baseVal;
    if (vb && vb.width) { s.setAttribute('width', vb.width); s.setAttribute('height', vb.height); s.style.maxWidth = 'none'; }
  });
  document.body.dataset.done = '1';
}).catch((e) => { document.body.dataset.error = String((e && (e.message || e.str)) || JSON.stringify(e)); });
</script></body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    for (const [name, code] of Object.entries(DIAGRAMS)) {
      if (only && !only.includes(name)) continue;
      const page = await browser.newPage();
      await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });
      await page.setContent(html(code.trim()), { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.body.dataset.done || document.body.dataset.error, { timeout: 60000 });
      const error = await page.evaluate(() => document.body.dataset.error);
      if (error) { console.log(`${name}  ERROR ${error}`); await page.close(); continue; }
      const el = await page.$('#d');
      const file = path.join(OUT, `${name}.png`);
      await el.screenshot({ path: file });
      const box = await el.boundingBox();
      console.log(`${name}  ${Math.round(box.width)}x${Math.round(box.height)}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
