// Runs the server for real on a spare port and checks the access rules from the outside.
// Uses a temporary file store, or PostgreSQL when TEST_DATABASE_URL is set.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createApp } = require('../server/app');
const { FileStore, PgStore } = require('../server/store');

const ADMIN_PASSWORD = crypto.randomBytes(12).toString('base64url');
const ADMIN_NEW = crypto.randomBytes(12).toString('base64url');
const TEMP = crypto.randomBytes(12).toString('base64url');
const USER_NEW = crypto.randomBytes(12).toString('base64url');
let server, base, dir, store;

class Client {
  constructor() { this.cookie = ''; }
  async call(method, url, body, headers = {}) {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const set = res.headers.get('set-cookie');
    if (set) { this.rawCookie = set; const value = set.split(';')[0]; this.cookie = value.endsWith('=') ? '' : value; }
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, headers: res.headers };
  }
}
const admin = new Client();

async function signedInUser(email, roles) {
  const created = await admin.call('POST', '/api/users', { name: `Test ${email}`, email, password: TEMP, roles });
  assert.strictEqual(created.status, 201);
  const c = new Client();
  assert.strictEqual((await c.call('POST', '/api/login', { email, password: TEMP })).status, 200);
  assert.strictEqual((await c.call('POST', '/api/change-password', { current: TEMP, next: USER_NEW })).status, 200);
  c.id = created.data.user.id;
  return c;
}

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shellflow-test-'));
  store = process.env.TEST_DATABASE_URL ? new PgStore(process.env.TEST_DATABASE_URL) : new FileStore(dir);
  if (process.env.TEST_DATABASE_URL) {
    await store.init();
    await store.pool.query('TRUNCATE sf_users, sf_sections');
  }
  const app = createApp({ store, loginLimit: 1000, env: { JWT_SECRET: crypto.randomBytes(32).toString('hex'), ADMIN_EMAIL: 'owner@example.com', ADMIN_PASSWORD } });
  await app.locals.ready();
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  if (store.close) await store.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('nothing is readable without signing in', async () => {
  const c = new Client();
  for (const url of ['/api/me', '/api/state', '/api/state/versions', '/api/users']) {
    assert.strictEqual((await c.call('GET', url)).status, 401, url);
  }
  assert.strictEqual((await c.call('PUT', '/api/state', { changes: {} })).status, 401);
});

test('sign-in errors do not say whether an email exists', async () => {
  const c = new Client();
  const unknown = await c.call('POST', '/api/login', { email: 'nobody@example.com', password: 'whatever123' });
  const wrong = await c.call('POST', '/api/login', { email: 'owner@example.com', password: 'whatever123' });
  assert.strictEqual(unknown.status, 401);
  assert.strictEqual(wrong.status, 401);
  assert.strictEqual(unknown.data.error, wrong.data.error);
});

test('the first admin must change the password before doing anything else', async () => {
  const res = await admin.call('POST', '/api/login', { email: 'owner@example.com', password: ADMIN_PASSWORD });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.user.mustChangePassword, true);
  assert.ok(!('passwordHash' in res.data.user));
  assert.match(admin.rawCookie, /HttpOnly/i);
  assert.match(admin.rawCookie, /SameSite=Lax/i);
  const blocked = await admin.call('GET', '/api/users');
  assert.strictEqual(blocked.status, 403);
  assert.strictEqual(blocked.data.code, 'PASSWORD_CHANGE_REQUIRED');
  assert.strictEqual((await admin.call('POST', '/api/change-password', { current: 'wrong-password', next: ADMIN_NEW })).status, 400);
  assert.strictEqual((await admin.call('POST', '/api/change-password', { current: ADMIN_PASSWORD, next: 'short' })).status, 400);
  assert.strictEqual((await admin.call('POST', '/api/change-password', { current: ADMIN_PASSWORD, next: ADMIN_PASSWORD })).status, 400);
  assert.strictEqual((await admin.call('POST', '/api/change-password', { current: ADMIN_PASSWORD, next: ADMIN_NEW })).status, 200);
  assert.strictEqual((await admin.call('GET', '/api/users')).status, 200);
});

test('only an admin can see or change access', async () => {
  const bd = await signedInUser('bd.access@example.com', ['BD']);
  assert.strictEqual((await bd.call('GET', '/api/users')).status, 403);
  assert.strictEqual((await bd.call('POST', '/api/users', { name: 'X', email: 'x@example.com', password: TEMP, roles: ['ADMIN'] })).status, 403);
  assert.strictEqual((await bd.call('PATCH', `/api/users/${bd.id}`, { roles: ['ADMIN'] })).status, 403);
  assert.strictEqual((await bd.call('DELETE', `/api/users/${bd.id}`)).status, 403);
  const list = await admin.call('GET', '/api/users');
  assert.ok(list.data.users.every(u => !('passwordHash' in u)));
});

test('the admin can give the CEO role, and bad input is refused', async () => {
  assert.strictEqual((await admin.call('POST', '/api/users', { name: 'Bad', email: 'not-an-email', password: TEMP, roles: ['BD'] })).status, 400);
  assert.strictEqual((await admin.call('POST', '/api/users', { name: 'Bad', email: 'bad@example.com', password: 'short', roles: ['BD'] })).status, 400);
  assert.strictEqual((await admin.call('POST', '/api/users', { name: 'Bad', email: 'bad@example.com', password: TEMP, roles: ['OWNER'] })).status, 400);
  const ceo = await admin.call('POST', '/api/users', { name: 'The CEO', email: 'ceo.test@example.com', password: TEMP, roles: ['CEO'] });
  assert.strictEqual(ceo.status, 201);
  assert.strictEqual((await admin.call('POST', '/api/users', { name: 'Twin', email: 'ceo.test@example.com', password: TEMP, roles: ['BD'] })).status, 409);
});

test('role changes, suspension and deletion apply at once', async () => {
  const u = await signedInUser('moves@example.com', ['BD']);
  const nca = { nca: { baseVersion: 0, data: { ncaVersions: [{ version: 1, date: '2026-10-15', qty: 850, status: 'PENDING' }] } } };
  assert.deepStrictEqual((await u.call('PUT', '/api/state', { changes: nca })).data.saved, ['nca']);
  await admin.call('PATCH', `/api/users/${u.id}`, { roles: ['FINANCE'] });
  const after = await u.call('PUT', '/api/state', { changes: { nca: { baseVersion: 1, data: nca.nca.data } } });
  assert.deepStrictEqual(after.data.denied, ['nca']);
  await admin.call('PATCH', `/api/users/${u.id}`, { active: false });
  assert.strictEqual((await u.call('GET', '/api/me')).status, 401);
  const relog = new Client();
  assert.strictEqual((await relog.call('POST', '/api/login', { email: 'moves@example.com', password: USER_NEW })).status, 403);
  await admin.call('PATCH', `/api/users/${u.id}`, { active: true });
  assert.strictEqual((await relog.call('POST', '/api/login', { email: 'moves@example.com', password: USER_NEW })).status, 200);
  await admin.call('DELETE', `/api/users/${u.id}`);
  assert.strictEqual((await relog.call('GET', '/api/me')).status, 401);
  await store.clearSections();
});

test('a password reset signs the person out and forces a new password', async () => {
  const u = await signedInUser('reset@example.com', ['BD']);
  await admin.call('PATCH', `/api/users/${u.id}`, { password: TEMP });
  assert.strictEqual((await u.call('GET', '/api/me')).status, 401);
  const c = new Client();
  const login = await c.call('POST', '/api/login', { email: 'reset@example.com', password: TEMP });
  assert.strictEqual(login.data.user.mustChangePassword, true);
  assert.strictEqual((await c.call('GET', '/api/state')).status, 403);
});

test('the main admin cannot be locked out', async () => {
  const me = (await admin.call('GET', '/api/me')).data.user;
  assert.strictEqual((await admin.call('PATCH', `/api/users/${me.id}`, { roles: ['BD'] })).status, 400);
  assert.strictEqual((await admin.call('PATCH', `/api/users/${me.id}`, { active: false })).status, 400);
  assert.strictEqual((await admin.call('DELETE', `/api/users/${me.id}`)).status, 400);
  const second = await signedInUser('second.admin@example.com', ['ADMIN']);
  assert.strictEqual((await second.call('DELETE', `/api/users/${me.id}`)).status, 400);
  assert.strictEqual((await second.call('PATCH', `/api/users/${me.id}`, { roles: ['BD'] })).status, 400);
  assert.strictEqual((await second.call('PATCH', `/api/users/${second.id}`, { roles: ['BD'] })).status, 400);
});

test('each department can only save its own data', async () => {
  const fin = await signedInUser('fin@example.com', ['FINANCE']);
  const res = await fin.call('PUT', '/api/state', { changes: {
    finance: { baseVersion: 0, data: { advanceCleared: true } },
    rules: { baseVersion: 0, data: { rules: { lorryCapacityM2: 1 } } },
    form_bd: { baseVersion: 0, data: { values: { 'bd-project-name': 'Hacked' } } },
    made_up: { baseVersion: 0, data: {} }
  } });
  assert.deepStrictEqual(res.data.saved, ['finance']);
  assert.deepStrictEqual(res.data.denied.sort(), ['form_bd', 'made_up', 'rules']);
  const state = await fin.call('GET', '/api/state');
  assert.ok(!state.data.sections.rules);
  assert.strictEqual(state.data.sections.finance.data.advanceCleared, true);
  await store.clearSections();
});

test('approvals cannot be faked by a non-admin', async () => {
  const bd = await signedInUser('bd.fake@example.com', ['BD']);
  const approved = { ncaVersions: [{ version: 1, date: '2026-10-15', qty: 999, status: 'APPROVED' }] };
  const res = await bd.call('PUT', '/api/state', { changes: { nca: { baseVersion: 0, data: approved } } });
  assert.deepStrictEqual(res.data.saved, []);
  assert.match(res.data.invalid[0].error, /must wait for approval/);
  const pending = await bd.call('PUT', '/api/state', { changes: { nca: { baseVersion: 0, data: { ncaVersions: [{ ...approved.ncaVersions[0], status: 'PENDING' }] } } } });
  assert.deepStrictEqual(pending.data.saved, ['nca']);
  const flip = await bd.call('PUT', '/api/state', { changes: { nca: { baseVersion: 1, data: approved } } });
  assert.match(flip.data.invalid[0].error, /Only an administrator/);
  const decided = await admin.call('PUT', '/api/state', { changes: { nca: { baseVersion: 1, data: approved } } });
  assert.deepStrictEqual(decided.data.saved, ['nca']);

  const apr = await bd.call('PUT', '/api/state', { changes: { approvals: { baseVersion: 0, data: { approvals: [{ id: 1, type: 'EDIT', row: 'LIVE', field: 'pic', value: 'X', status: 'APPROVED' }] } } } });
  assert.deepStrictEqual(apr.data.saved, []);
  const bank = await bd.call('PUT', '/api/state', { changes: { bankLines: { baseVersion: 0, data: { bankLines: [{ id: 1, date: '2026-11-01', amount: 5, status: 'CONFIRMED', source: 'Mobile' }] } } } });
  assert.deepStrictEqual(bank.data.saved, []);
  const mobile = await bd.call('PUT', '/api/state', { changes: { bankLines: { baseVersion: 0, data: { bankLines: [{ id: 1, date: '2026-11-01', amount: 5, status: 'OPEN', source: 'Mobile' }] } } } });
  assert.deepStrictEqual(mobile.data.saved, ['bankLines']);
  await store.clearSections();
});

test('departments can keep adding their own entries after the first save', async () => {
  const bd = await signedInUser('bd.more@example.com', ['BD']);
  const first = { version: 1, date: '2026-10-15', qty: 850, status: 'PENDING', ref: 'A', reason: 'First' };
  const second = { version: 2, date: '2026-10-16', qty: 900, status: 'PENDING', ref: 'B', reason: 'Second' };
  assert.deepStrictEqual((await bd.call('PUT', '/api/state', { changes: { nca: { baseVersion: 0, data: { ncaVersions: [first] } } } })).data.saved, ['nca']);
  assert.deepStrictEqual((await bd.call('PUT', '/api/state', { changes: { nca: { baseVersion: 1, data: { ncaVersions: [first, second] } } } })).data.saved, ['nca']);

  const edit = { id: 1, type: 'EDIT', row: 'LIVE', field: 'pic', value: 'X', base: 'Y', before: 'Y', by: 'BD', when: 't', status: 'PENDING' };
  assert.deepStrictEqual((await bd.call('PUT', '/api/state', { changes: { approvals: { baseVersion: 0, data: { approvals: [edit] } } } })).data.saved, ['approvals']);
  assert.deepStrictEqual((await bd.call('PUT', '/api/state', { changes: { approvals: { baseVersion: 1, data: { approvals: [{ ...edit, id: 2, field: 'po' }, edit] } } } })).data.saved, ['approvals']);

  const line = { id: 1, date: '2026-11-01', ref: 'R1', amount: 5, desc: 'D', source: 'Mobile', status: 'OPEN' };
  assert.deepStrictEqual((await bd.call('PUT', '/api/state', { changes: { bankLines: { baseVersion: 0, data: { bankLines: [line] } } } })).data.saved, ['bankLines']);
  assert.deepStrictEqual((await bd.call('PUT', '/api/state', { changes: { bankLines: { baseVersion: 1, data: { bankLines: [{ ...line, id: 2 }, line] } } } })).data.saved, ['bankLines']);
  await store.clearSections();
});

test('harmful stored values are refused', async () => {
  const dispatch = await signedInUser('dis@example.com', ['DISPATCH']);
  const evil = "x');alert(1);//";
  const lorry = { id: evil, row: 'LIVE', date: '2026-11-19', m2: 5, cap: 450, status: 'Planned' };
  const res = await dispatch.call('PUT', '/api/state', { changes: { logistics: { baseVersion: 0, data: { lorries: [lorry] } } } });
  assert.deepStrictEqual(res.data.saved, []);
  assert.strictEqual(res.data.invalid.length, 1);
  const row = await dispatch.call('PUT', '/api/state', { changes: { logistics: { baseVersion: 0, data: { lorries: [{ ...lorry, id: 'LORRY-02', row: evil }] } } } });
  assert.deepStrictEqual(row.data.saved, []);
  const number = await dispatch.call('PUT', '/api/state', { changes: { referenceRows: { baseVersion: 0, data: { rows: { 'MY-26-0104': { shippedM2: 'lots', advStatus: 'x', readinessState: 'y' } } } } } });
  assert.deepStrictEqual(number.data.saved, []);
  const reminders = await dispatch.call('PUT', '/api/state', { changes: { reminders: { baseVersion: 0, data: { reminders: [{ id: evil, date: '2026-11-19', dept: 'BD', title: 'x' }] } } } });
  assert.deepStrictEqual(reminders.data.saved, []);
  assert.strictEqual((await dispatch.call('PUT', '/api/state', { changes: { logistics: null } })).data.invalid.length, 1);
});

test('two people editing the same data: the second is told, nothing is overwritten', async () => {
  const a = await signedInUser('des.a@example.com', ['DESIGN']);
  const b = await signedInUser('des.b@example.com', ['DESIGN']);
  assert.deepStrictEqual((await a.call('PUT', '/api/state', { changes: { items: { baseVersion: 0, data: { items: [] } } } })).data.saved, ['items']);
  const res = await b.call('PUT', '/api/state', { changes: { items: { baseVersion: 0, data: { items: [{ id: 2, row: 'LIVE', kind: 'HOLING', name: 'late', qtyReq: 1, qtyDone: 0, status: 'Ongoing' }] } } } });
  assert.deepStrictEqual(res.data.conflicts, ['items']);
  assert.deepStrictEqual(res.data.sections.items.data.items, []);
  await store.clearSections();
});

test('logs combine everyone\'s entries and record the real author', async () => {
  const a = await signedInUser('log.a@example.com', ['BD']);
  const b = await signedInUser('log.b@example.com', ['FINANCE']);
  await a.call('PUT', '/api/state', { changes: { activity: { data: { activity: [{ who: 'Someone Else', when: 't1', what: 'A did this' }] } } } });
  const res = await b.call('PUT', '/api/state', { changes: { activity: { data: { activity: [{ who: 'Forged', when: 't2', what: 'B did this' }] } } } });
  const entries = res.data.sections.activity.data.activity;
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries.find(e => e.what === 'A did this').who, 'Test log.a@example.com');
  assert.strictEqual(entries.find(e => e.what === 'B did this').who, 'Test log.b@example.com');
  await a.call('PUT', '/api/state', { changes: { activity: { data: { activity: [{ who: 'x', when: 't1', what: 'A did this' }] } } } });
  assert.strictEqual((await a.call('GET', '/api/state')).data.sections.activity.data.activity.length, 2);
  const comment = await a.call('PUT', '/api/state', { changes: { comments: { data: { comments: { LIVE: [{ who: 'Forged', when: 't', text: 'hello' }] } } } } });
  assert.strictEqual(comment.data.sections.comments.data.comments.LIVE[0].who, 'Test log.a@example.com');
  await store.clearSections();
});

test('repeated wrong passwords lock the account for a while', async () => {
  await signedInUser('lock@example.com', ['BD']);
  const c = new Client();
  for (let i = 0; i < 10; i++) assert.strictEqual((await c.call('POST', '/api/login', { email: 'lock@example.com', password: 'wrong-password' })).status, 401);
  const locked = await c.call('POST', '/api/login', { email: 'lock@example.com', password: USER_NEW });
  assert.strictEqual(locked.status, 429);
});

test('requests from other sites are refused', async () => {
  assert.strictEqual((await admin.call('PUT', '/api/state', { changes: {} }, { Origin: 'https://evil.example' })).status, 403);
  const form = await fetch(`${base}/api/logout`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: admin.cookie }, body: 'a=1' });
  assert.strictEqual(form.status, 415);
});

test('only an admin can reset the shared data', async () => {
  const bd = await signedInUser('bd.reset@example.com', ['BD']);
  assert.strictEqual((await bd.call('DELETE', '/api/state')).status, 403);
  assert.strictEqual((await admin.call('DELETE', '/api/state')).status, 200);
});

test('security headers are sent, and the health check reveals nothing', async () => {
  const res = await fetch(`${base}/health`);
  assert.deepStrictEqual(await res.json(), { status: 'ok' });
  assert.ok(res.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.strictEqual(res.headers.get('x-powered-by'), null);
});

test('MR11 line tracking: each department keeps its own figures per line, and nobody else can', async () => {
  const production = await signedInUser('production.lines@example.com', ['PRODUCTION']);
  const finance = await signedInUser('finance.track@example.com', ['FINANCE']);
  const base = ((await production.call('GET', '/api/state/versions')).data.versions || {}).lineProduction || 0;
  const data = { lineProduction: { L1: { processedM2: 450, producedM2: 450, producedDate: '2026-11-14' }, L2: { producedM2: null } } };
  assert.deepStrictEqual((await finance.call('PUT', '/api/state', { changes: { lineProduction: { baseVersion: base, data } } })).data.denied, ['lineProduction']);
  assert.deepStrictEqual((await production.call('PUT', '/api/state', { changes: { lineProduction: { baseVersion: base, data } } })).data.saved, ['lineProduction']);
  for (const wrong of [{ 'L1': { producedM2: -1 } }, { 'bad id!': { producedM2: 1 } }, { L1: { producedM2: 'x'.repeat(41) } }]) {
    const res = await production.call('PUT', '/api/state', { changes: { lineProduction: { baseVersion: base + 1, data: { lineProduction: wrong } } } });
    assert.ok((res.data.invalid || []).some(x => x.section === 'lineProduction'), JSON.stringify(wrong));
  }
  const state = await production.call('GET', '/api/state');
  assert.strictEqual(state.data.sections.lineProduction.data.lineProduction.L1.producedM2, 450);
});

test('the page goes out compressed, and its scripts need no eval and no style or icon CDN', async () => {
  const res = await fetch(`${base}/`, { headers: { 'accept-encoding': 'gzip' } });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-encoding'), 'gzip');
  const csp = res.headers.get('content-security-policy');
  assert.ok(!csp.includes("'unsafe-eval'"), csp);
  assert.ok(!csp.includes('cdn.tailwindcss.com') && !csp.includes('unpkg.com'), csp);
  const page = await res.text();
  assert.ok(!page.includes('cdn.tailwindcss.com') && !page.includes('unpkg.com/lucide'), 'the page still loads a CDN script');
});

test('on Vercel with a database, the session key comes from the database secret', async () => {
  const url = 'postgres://user:pass@example.invalid:6543/db';
  assert.doesNotThrow(() => createApp({ store, env: { NODE_ENV: 'production', VERCEL: '1', DATABASE_URL: url } }));
  assert.throws(() => createApp({ store, env: { NODE_ENV: 'production' } }), /JWT_SECRET must be set/);
});

test('production refuses to start without a real secret or first admin', async () => {
  assert.throws(() => createApp({ store, env: { NODE_ENV: 'production' } }), /JWT_SECRET must be set/);
  assert.throws(() => createApp({ store, env: { JWT_SECRET: 'too-short' } }), /at least 32/);
  assert.throws(() => createApp({ store, env: { VERCEL: '1', JWT_SECRET: crypto.randomBytes(32).toString('hex') } , }) && createApp({ env: { VERCEL: '1', JWT_SECRET: crypto.randomBytes(32).toString('hex') } }), /DATABASE_URL must be set/);
});

// Starts a second, separate server with its own settings and store
async function startOther(env) {
  const own = fs.mkdtempSync(path.join(os.tmpdir(), 'shellflow-other-'));
  const app = createApp({ store: new FileStore(own), loginLimit: 1000, env: { JWT_SECRET: crypto.randomBytes(32).toString('hex'), ADMIN_EMAIL: 'main@example.com', ADMIN_PASSWORD: crypto.randomBytes(12).toString('base64url'), ...env } });
  await app.locals.ready();
  const srv = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const url = `http://127.0.0.1:${srv.address().port}`;
  return { url, close: async () => { await new Promise(r => srv.close(r)); fs.rmSync(own, { recursive: true, force: true }); } };
}
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('demo quick login is off unless switched on, and never in production', async () => {
  assert.strictEqual((await new Client().call('POST', '/api/demo-login', {})).status, 404);
  assert.doesNotMatch(await (await fetch(`${base}/config.js`)).text(), /SHELLFLOW_DEMO_LOGIN/);

  const prod = await startOther({ NODE_ENV: 'production', DEMO_QUICK_LOGIN: 'true' });
  try {
    assert.strictEqual((await post(`${prod.url}/api/demo-login`, {})).status, 404);
    assert.doesNotMatch(await (await fetch(`${prod.url}/config.js`)).text(), /SHELLFLOW_DEMO_LOGIN/);
  } finally { await prod.close(); }

  const demo = await startOther({ DEMO_QUICK_LOGIN: 'true' });
  try {
    assert.match(await (await fetch(`${demo.url}/config.js`)).text(), /SHELLFLOW_DEMO_LOGIN = true/);
    const res = await post(`${demo.url}/api/demo-login`, {});
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.email, 'main@example.com');
    assert.deepStrictEqual(data.user.roles, ['ADMIN']);
    assert.ok(!('passwordHash' in data.user));
    assert.match(res.headers.get('set-cookie') || '', /HttpOnly/i);
    // Each department has its own quick login, with that one role
    const fin = await (await post(`${demo.url}/api/demo-login`, { role: 'FINANCE' })).json();
    assert.deepStrictEqual(fin.user.roles, ['FINANCE']);
    assert.strictEqual((await post(`${demo.url}/api/demo-login`, { role: 'NOBODY' })).status, 400);
  } finally { await demo.close(); }

  // A live demonstration can open quick login to everyone until a date, even in production
  const day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const live = await startOther({ NODE_ENV: 'production', DEMO_QUICK_LOGIN_PUBLIC_UNTIL: day(7) });
  try {
    assert.match(await (await fetch(`${live.url}/config.js`)).text(), /SHELLFLOW_DEMO_LOGIN = true/);
    const res = await post(`${live.url}/api/demo-login`, { role: 'DESIGN' });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual((await res.json()).user.roles, ['DESIGN']);
  } finally { await live.close(); }
  for (const until of [day(-1), day(90)]) {
    const off = await startOther({ NODE_ENV: 'production', DEMO_QUICK_LOGIN_PUBLIC_UNTIL: until });
    try {
      assert.strictEqual((await post(`${off.url}/api/demo-login`, {})).status, 404, until);
      assert.doesNotMatch(await (await fetch(`${off.url}/config.js`)).text(), /SHELLFLOW_DEMO_LOGIN/);
    } finally { await off.close(); }
  }
});

test('MR11 lines: only BD and administrators may change them, and bad lines are refused', async () => {
  const bd = await signedInUser('bd.lines@example.com', ['BD']);
  const finance = await signedInUser('finance.lines@example.com', ['FINANCE']);
  const versions = (await bd.call('GET', '/api/state/versions')).data.versions || {};
  const base = versions.lines || 0;
  const good = { mr11Lines: [{ id: 'L1', stream: 'Stream 1', blocks: 'Block A', formwork: 'MIVAN/MONOLITIC FORMWORK', product: 'MFE New', m2: 600, price: null, terms: '' }, { id: 'L2', stream: 'Stream 2', blocks: 'Core', formwork: 'QUICK DECK / LIGHTDECK', product: 'MFE New', m2: 250, price: 132.5, terms: '30% Advance / 70% CAD' }] };
  assert.deepStrictEqual((await finance.call('PUT', '/api/state', { changes: { lines: { baseVersion: base, data: good } } })).data.denied, ['lines']);
  assert.deepStrictEqual((await bd.call('PUT', '/api/state', { changes: { lines: { baseVersion: base, data: good } } })).data.saved, ['lines']);
  const bad = await bd.call('PUT', '/api/state', { changes: { lines: { baseVersion: base + 1, data: { mr11Lines: [{ id: 'L1', stream: 'Stream 1', m2: -5 }] } } } });
  assert.ok((bad.data.invalid || []).some(x => x.section === 'lines'), JSON.stringify(bad.data));
  // A line's own price must be a number from 0 up, and its terms short text
  for (const wrong of [{ price: -1 }, { price: '150' }, { terms: 'x'.repeat(81) }]) {
    const res = await bd.call('PUT', '/api/state', { changes: { lines: { baseVersion: base + 1, data: { mr11Lines: [{ ...good.mr11Lines[1], ...wrong }] } } } });
    assert.ok((res.data.invalid || []).some(x => x.section === 'lines'), JSON.stringify(wrong));
  }
  const state = await bd.call('GET', '/api/state');
  assert.strictEqual(state.data.sections.lines.data.mr11Lines.length, 2);
  assert.strictEqual(state.data.sections.lines.data.mr11Lines[1].price, 132.5);
  assert.strictEqual(state.data.sections.lines.data.mr11Lines[1].terms, '30% Advance / 70% CAD');
});
