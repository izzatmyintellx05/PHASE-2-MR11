// Captures screenshots of the running app (demo mode, sample workbooks) into ./shots.
// Each shot signs in through the API as the role that normally uses that screen.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = 'http://127.0.0.1:3911';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'shots');
const PASSWORD = 'admin123'; // the demo accounts' seeded password (local demo data only)

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function signIn(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json();
  if (!body.token) throw new Error(`sign-in failed for ${email}`);
  return body;
}

async function clickText(page, text) {
  await page.waitForFunction(
    (t) => [...document.querySelectorAll('button, a, [role="tab"]')].some((b) => b.textContent.trim().includes(t)),
    { timeout: 30000 },
    text
  );
  const clicked = await page.evaluate((t) => {
    const el = [...document.querySelectorAll('button, a, [role="tab"]')].find((b) => b.textContent.trim().includes(t));
    if (el) el.click();
    return Boolean(el);
  }, text);
  if (!clicked) throw new Error(`no control with text "${text}"`);
}

const SHOTS = [
  { name: 'login', path: '/login' },
  { name: 'mr11-admin', user: 'admin@mfeformwork.com', path: '/mr11', wait: 4000 },
  { name: 'mr11-bd', user: 'bd@mfeformwork.com', path: '/mr11', wait: 4000 },
  { name: 'dept-bd', user: 'bd@mfeformwork.com', path: '/departments/BD', wait: 3000 },
  // Opens with the Shell Plan approval history above the workbook
  { name: 'dept-design', user: 'design@mfeformwork.com', path: '/departments/DESIGN', wait: 3000 },
  { name: 'dept-planning', user: 'planning@mfeformwork.com', path: '/departments/PLANNING', wait: 3000 },
  { name: 'dept-planning-series', user: 'planning@mfeformwork.com', path: '/departments/PLANNING', wait: 3000, click: 'Series Ledger' },
  { name: 'dept-production', user: 'production@mfeformwork.com', path: '/departments/PRODUCTION', wait: 3000 },
  { name: 'dept-production-series', user: 'production@mfeformwork.com', path: '/departments/PRODUCTION', wait: 3000, click: 'Production Series' },
  // The sample data has only the Overseas Dispatch file, so that view is shown
  { name: 'dept-dispatch', user: 'dispatch@mfeformwork.com', path: '/departments/DISPATCH', wait: 3000, click: 'Overseas' },
  { name: 'ceo', user: 'ceo@mfeformwork.com', path: '/ceo', wait: 5000 },
  { name: 'admin', user: 'admin@mfeformwork.com', path: '/admin', wait: 3000 },
  { name: 'change-password', user: 'finance@mfeformwork.com', path: '/mr11', wait: 3000, defaultPassword: true, clickSelector: 'button[aria-label="Change password"]' },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2];
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-first-run', '--hide-scrollbars'] });
  try {
    for (const shot of SHOTS.filter((s) => !only || only.split(',').includes(s.name))) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      page.setDefaultTimeout(120000);
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
      await page.evaluate(() => localStorage.clear());
      if (shot.user) {
        const { token, user } = await signIn(shot.user);
        await page.evaluate((t, u, d) => {
          localStorage.setItem('mfe_token', t);
          localStorage.setItem('mfe_user', JSON.stringify(u));
          if (d) localStorage.setItem('mfe_default_password', '1');
        }, token, user, Boolean(shot.defaultPassword));
        await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle2' });
      }
      await pause(shot.wait || 1500);
      if (shot.click) { await clickText(page, shot.click); await pause(2000); }
      if (shot.clickSelector) {
        await page.waitForSelector(shot.clickSelector, { timeout: 30000 });
        const buttons = await page.$$(shot.clickSelector);
        await buttons.at(-1).click();
        await pause(1500);
      }
      const file = path.join(OUT, `${shot.name}.png`);
      await page.screenshot({ path: file });
      console.log(`${shot.name}  ${page.url()}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
