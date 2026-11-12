// Who may change which part of the shared data, and the checks each part must pass.
// The server decides this, so it holds even if someone edits the page in their browser.
const ADMIN_ONLY = [];
const ANYONE = null;

const SECTION_WRITERS = {
  form_bd: ['BD'],
  form_design: ['SHELLPLAN', 'DESIGN'],
  form_gate: ['PLANNING', 'PRODUCTION', 'DISPATCH'],
  finance: ['FINANCE'],
  bankLines: ANYONE,
  nca: ['BD'],
  lines: ['BD'],
  // Each department keeps its own figures for each MR11 line
  lineFinance: ['FINANCE'],
  lineDesign: ['SHELLPLAN', 'DESIGN'],
  lineProduction: ['PLANNING', 'PRODUCTION'],
  lineDispatch: ['DISPATCH'],
  lineSite: ['DISPATCH'],
  shell: ['SHELLPLAN', 'DESIGN'],
  items: ['DESIGN', 'PRODUCTION'],
  panels: ['PLANNING', 'PRODUCTION', 'DISPATCH'],
  yard: ['PRODUCTION', 'DISPATCH'],
  logistics: ['DISPATCH'],
  site: ANYONE,
  incidents: ['DISPATCH', 'FINANCE'],
  releases: ADMIN_ONLY,
  rules: ADMIN_ONLY,
  referenceRows: ['FINANCE', 'DISPATCH'],
  approvals: ANYONE,
  reminders: ANYONE,
  reports: ANYONE,
  activity: ANYONE,
  updates: ANYONE,
  notes: ANYONE,
  comments: ANYONE
};

// These only ever grow; entries from different people are combined instead of overwritten
const MERGED_LISTS = { activity: 500, updates: 500, notes: 200 };

const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9-]{0,40}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const fail = message => { const e = new Error(message); e.invalid = true; throw e; };
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isText = (v, max = 2000) => v === undefined || v === null || (typeof v === 'string' && v.length <= max);
const list = (data, key) => {
  const v = data[key];
  if (v === undefined) return [];
  if (!Array.isArray(v)) fail(`${key} must be a list`);
  if (v.length > 5000) fail(`${key} is too long`);
  return v;
};
const object = data => { if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Expected an object'); return data; };

const VALIDATORS = {
  form_bd: checkForm, form_design: checkForm, form_gate: checkForm,
  bankLines(d) {
    list(d, 'bankLines').forEach(l => {
      if (!Number.isInteger(l.id) || !isNum(l.amount) || !DATE.test(l.date)) fail('A bank line is not valid');
      if (!['OPEN', 'CONFIRMED', 'NOT_OURS'].includes(l.status)) fail('A bank line status is not valid');
      if (!isText(l.ref, 200) || !isText(l.desc, 500) || !isText(l.source, 20) || !isText(l.matchedTo, 300)) fail('Bank line text is not valid');
      if (l.score !== undefined && !isNum(l.score)) fail('A bank line score is not valid');
    });
  },
  nca(d) {
    list(d, 'ncaVersions').forEach(v => {
      if (!Number.isInteger(v.version) || !isNum(v.qty) || v.qty <= 0 || !DATE.test(v.date)) fail('An NCA version is not valid');
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(v.status)) fail('An NCA status is not valid');
      if (!isText(v.ref, 200) || !isText(v.reason, 1000) || !isText(v.rejectReason, 1000)) fail('NCA text is not valid');
    });
  },
  lines(d) {
    const lines = list(d, 'mr11Lines');
    if (lines.length > 60) fail('There are too many MR11 lines');
    lines.forEach(l => {
      if (!l || typeof l !== 'object' || Array.isArray(l)) fail('An MR11 line is not valid');
      if (!SAFE_KEY.test(String(l.id || '')) || !isNum(l.m2) || l.m2 < 0 || l.m2 > 10000000) fail('An MR11 line is not valid');
      if (!isText(l.stream, 60) || !isText(l.blocks, 300) || !isText(l.formwork, 80) || !isText(l.product, 80) || !isText(l.terms, 80)) fail('MR11 line text is not valid');
      // A line's own selling price in USD per m²; none means the project's price
      if (l.price !== undefined && l.price !== null && (!isNum(l.price) || l.price < 0 || l.price > 1000000)) fail('An MR11 line price is not valid');
    });
  },
  lineFinance: d => checkLineTrack(d, 'lineFinance'),
  lineDesign: d => checkLineTrack(d, 'lineDesign'),
  lineProduction: d => checkLineTrack(d, 'lineProduction'),
  lineDispatch: d => checkLineTrack(d, 'lineDispatch'),
  lineSite: d => checkLineTrack(d, 'lineSite'),
  shell(d) {
    list(d, 'shellRevisions').forEach(r => {
      if (!Number.isInteger(r.rev) || !isText(r.status, 60) || !isText(r.date, 20) || !isText(r.remarks, 500)) fail('A Shell Plan revision is not valid');
    });
  },
  items(d) {
    list(d, 'items').forEach(i => {
      if (!Number.isInteger(i.id) || !SAFE_KEY.test(i.row) || !['HOLING', 'ACCESSORY'].includes(i.kind)) fail('An item is not valid');
      if (!isNum(i.qtyReq) || !isNum(i.qtyDone) || !isText(i.name, 200) || !isText(i.status, 30)) fail('An item is not valid');
    });
  },
  panels(d) {
    list(d, 'panels').forEach(p => {
      if (!isText(p.code, 40) || !isNum(p.m2) || !isText(p.series, 40) || !isText(p.block, 80) || !isText(p.type, 40)) fail('A panel is not valid');
      if (!['DESIGNED', 'PROCESSED', 'PRODUCED', 'DISPATCHED', 'DELIVERED'].includes(p.stage)) fail('A panel stage is not valid');
    });
    list(d, 'panelLog').forEach(l => { if (!isNum(l.m2) || !isText(l.codes, 500) || !isText(l.stage, 20) || !isText(l.date, 20)) fail('A panel log entry is not valid'); });
    list(d, 'planningSeries').forEach(s => { if (!isNum(s.area) || !isNum(s.processed) || !isText(s.series, 40)) fail('A planning series is not valid'); });
  },
  logistics(d) {
    list(d, 'lorries').forEach(l => {
      if (!/^LORRY-\d{1,6}$/.test(l.id) || !SAFE_KEY.test(l.row) || !DATE.test(l.date) || !isNum(l.m2) || !isNum(l.cap)) fail('A lorry is not valid');
      if (!['Planned', 'Loaded', 'Departed', 'Cancelled'].includes(l.status) || !isText(l.ref, 80) || !isText(l.dest, 200)) fail('A lorry is not valid');
    });
    list(d, 'etdLog').forEach(e => { if (!isText(e.date, 20) || !isText(e.reason, 500) || !isText(e.who, 120)) fail('An ETD entry is not valid'); });
    if (d.sailedM2 !== undefined && !isNum(d.sailedM2)) fail('Sailed m² must be a number');
  },
  site(d) {
    list(d, 'siteRegister').forEach(s => { if (!isNum(s.m2)) fail('Site progress must be a number'); });
    if (d.siteProgressM2 !== undefined && !isNum(d.siteProgressM2)) fail('Site progress must be a number');
  },
  incidents(d) { list(d, 'incidents').forEach(i => { if (!isNum(i.cost) || !isNum(i.m2)) fail('An incident is not valid'); }); },
  releases(d) { list(d, 'releases').forEach(r => { if (!SAFE_KEY.test(r.row) || !isText(r.reason, 1000)) fail('A release is not valid'); }); },
  referenceRows(d) {
    Object.entries(object(d.rows || {})).forEach(([key, r]) => {
      if (!SAFE_KEY.test(key) || !isNum(r.shippedM2) || !isText(r.advStatus, 60) || !isText(r.readinessState, 60)) fail('A row update is not valid');
    });
  },
  approvals(d) {
    list(d, 'approvals').forEach(a => {
      if (!Number.isInteger(a.id) || !SAFE_KEY.test(a.row) || !['EDIT', 'DELETE'].includes(a.type)) fail('An approval is not valid');
      if (a.type === 'EDIT' && !['country', 'pic', 'status', 'po', 'nca', 'incoterms'].includes(a.field)) fail('That column cannot be edited');
      if (!['PENDING', 'APPROVED', 'REJECTED', 'UNDONE', 'LAPSED', 'REPLACED'].includes(a.status)) fail('An approval status is not valid');
    });
  },
  reminders(d) {
    list(d, 'reminders').forEach(r => {
      if (!/^own-\d+$/.test(r.id) || !DATE.test(r.date) || !SAFE_KEY.test(r.dept) || !isText(r.title, 300)) fail('A reminder is not valid');
    });
    list(d, 'doneReminders').forEach(id => { if (!/^[A-Za-z0-9-]{1,80}$/.test(id)) fail('A reminder id is not valid'); });
    Object.keys(object(d.alertDecisions || {})).forEach(k => { if (!/^[A-Za-z0-9_:. -]{1,120}$/.test(k)) fail('An alert id is not valid'); });
  },
  reports(d) { list(d, 'reports').forEach(r => { if (!Number.isInteger(r.id) || !isText(r.date, 20) || !isText(r.trigger, 60)) fail('A report is not valid'); }); },
  comments(d) {
    Object.entries(object(d.comments || {})).forEach(([k, entries]) => {
      if (!SAFE_KEY.test(k) || !Array.isArray(entries)) fail('A comment row is not valid');
      entries.forEach(checkEntry);
    });
  },
  activity(d) { list(d, 'activity').forEach(checkEntry); },
  updates(d) { list(d, 'updates').forEach(checkEntry); },
  notes(d) { list(d, 'notes').forEach(checkEntry); }
};

function checkEntry(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) fail('A log entry is not valid');
  Object.values(e).forEach(value => { if (!['string', 'boolean', 'number'].includes(typeof value) && value !== null) fail('A log entry is not valid'); if (typeof value === 'string' && value.length > 2000) fail('A log entry is too long'); });
}

// A department's figures per MR11 line: { lineId: { field: number, date, short text, true/false or null } }
function checkLineTrack(d, key) {
  const v = d[key];
  if (v === undefined) return;
  const lines = object(v);
  if (Object.keys(lines).length > 60) fail('There are too many MR11 lines');
  Object.entries(lines).forEach(([id, entry]) => {
    if (!SAFE_KEY.test(id)) fail('An MR11 line is not valid');
    Object.entries(object(entry)).forEach(([field, x]) => {
      const ok = x === null || typeof x === 'boolean' || (isNum(x) && x >= 0 && x <= 10000000) || (typeof x === 'string' && x.length <= 40);
      if (!/^[a-zA-Z][a-zA-Z0-9]{0,29}$/.test(field) || !ok) fail('A line figure is not valid');
    });
  });
}

function checkForm(d) {
  Object.entries(object(d.values || {})).forEach(([id, v]) => {
    if (!/^[a-z0-9-]{2,40}$/.test(id) || !isText(v, 500)) fail('A form field is not valid');
  });
}

// PostgreSQL stores JSON keys in its own order, so comparisons must not depend on key order
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
const same = (a, b) => canonical(a) === canonical(b);

// Status changes only an administrator may make, even on a list everyone can add to
function checkRoleRules(name, before, after, user) {
  const admin = user.roles.includes('ADMIN');
  const finance = user.roles.includes('FINANCE');
  if (name === 'nca' && !admin) {
    const old = before?.ncaVersions || [];
    if (!same((after.ncaVersions || []).slice(0, old.length), old)) fail('Only an administrator can decide NCA revisions');
    if ((after.ncaVersions || []).slice(old.length).some(v => v.status !== 'PENDING')) fail('A new NCA revision must wait for approval');
  }
  if (name === 'approvals' && !admin) {
    const old = new Map((before?.approvals || []).map(a => [a.id, a]));
    (after.approvals || []).forEach(a => {
      const prior = old.get(a.id);
      if (prior ? (!same(prior, a) && !(prior.status === 'APPROVED' && a.status === 'LAPSED')) : a.status !== 'PENDING') fail('Only an administrator can decide changes');
    });
  }
  if (name === 'bankLines' && !admin && !finance) {
    const old = new Map((before?.bankLines || []).map(l => [l.id, l]));
    (after.bankLines || []).forEach(l => {
      const prior = old.get(l.id);
      if (prior ? !same(prior, l) : (l.status !== 'OPEN' || l.source !== 'Mobile')) fail('Only Finance can confirm or change bank lines');
    });
  }
}

const entryKey = e => { const { who, ...rest } = e; return canonical(rest); };

// Adds new entries to what is stored, naming the signed-in person as the author
function mergeList(stored, incoming, author, cap) {
  const seen = new Set((stored || []).map(entryKey));
  const fresh = (incoming || []).filter(e => e && typeof e === 'object' && !seen.has(entryKey(e))).map(e => ({ ...e, who: author }));
  return [...fresh, ...(stored || [])].slice(0, cap);
}
function mergeComments(stored, incoming, author) {
  const out = { ...(stored || {}) };
  Object.entries(incoming || {}).forEach(([row, entries]) => {
    if (!Array.isArray(entries)) fail('Comments must be a list');
    const seen = new Set((out[row] || []).map(entryKey));
    out[row] = [...(out[row] || []), ...entries.filter(e => !seen.has(entryKey(e))).map(e => ({ ...e, who: author }))].slice(-200);
  });
  return out;
}

function canWrite(name, user) {
  if (!(name in SECTION_WRITERS)) return false;
  if (user.roles.includes('ADMIN')) return true;
  const writers = SECTION_WRITERS[name];
  return writers === ANYONE || writers.some(r => user.roles.includes(r));
}

function validateSection(name, data, before, user) {
  object(data);
  if (VALIDATORS[name]) VALIDATORS[name](data);
  checkRoleRules(name, before, data, user);
}

module.exports = { SECTION_WRITERS, MERGED_LISTS, canWrite, validateSection, mergeList, mergeComments };
