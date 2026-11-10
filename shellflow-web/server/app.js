const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { createStore } = require('./store');
const { MERGED_LISTS, canWrite, validateSection, mergeList, mergeComments } = require('./sections');

const ROLES = ['ADMIN', 'CEO', 'BD', 'FINANCE', 'SHELLPLAN', 'DESIGN', 'PLANNING', 'PRODUCTION', 'DISPATCH'];
const COOKIE = 'sf_session';
const SESSION_HOURS = 12;
const MAX_FAILED_LOGINS = 10;
const LOCK_MINUTES = 15;
const MIN_PASSWORD = 8;
const BCRYPT_COST = 12;
// Compared when an email is unknown, so a wrong email takes as long as a wrong password
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_COST);

const publicUser = u => ({ id: u.id, name: u.name, email: u.email, roles: u.roles, active: u.active, isProtected: u.isProtected, mustChangePassword: u.mustChangePassword });
const cleanEmail = v => String(v || '').trim().toLowerCase();
const validEmail = v => /^[^@\s'"<>]+@[^@\s'"<>]+\.[^@\s'"<>]+$/.test(v) && v.length <= 200;
const validRoles = r => Array.isArray(r) && r.length > 0 && r.length <= ROLES.length && r.every(x => ROLES.includes(x));
const validName = v => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 120;

function createApp(options = {}) {
  const env = options.env || process.env;
  const production = env.NODE_ENV === 'production';
  const onVercel = !!env.VERCEL;

  if (production && !env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production');
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  if (onVercel && !(env.DATABASE_URL || env.POSTGRES_URL)) throw new Error('DATABASE_URL must be set on Vercel, because its disk does not last between requests');
  const secret = env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
  if (!env.JWT_SECRET) console.warn('[shellflow] JWT_SECRET is not set: using a temporary one, so everyone is signed out when the server restarts.');

  const store = options.store || createStore(env);

  // The first start creates the main administrator, who must change the password on first sign-in
  let readyPromise = null;
  const ready = () => {
    if (!readyPromise) {
      readyPromise = (async () => {
        await store.init();
        if ((await store.countUsers()) > 0) return;
        const email = cleanEmail(env.ADMIN_EMAIL);
        let password = env.ADMIN_PASSWORD;
        if (!validEmail(email)) throw new Error('Set ADMIN_EMAIL to create the first administrator');
        if (!password) {
          if (production) throw new Error('Set ADMIN_PASSWORD to create the first administrator');
          password = crypto.randomBytes(9).toString('base64url');
          console.log(`[shellflow] First administrator: ${email}  Temporary password: ${password}`);
        }
        if (password.length < MIN_PASSWORD) throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD} characters`);
        await store.createUser({
          id: crypto.randomUUID(), name: 'Main Administrator', email, passwordHash: await bcrypt.hash(password, BCRYPT_COST), roles: ['ADMIN'],
          mustChangePassword: true, active: true, isProtected: true, sessionVersion: 1, failedLogins: 0, lockedUntil: 0
        }).catch(err => { if (err.code !== 'DUPLICATE') throw err; });
      })().catch(err => { readyPromise = null; throw err; });
    }
    return readyPromise;
  };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.tailwindcss.com', 'https://unpkg.com', 'https://cdnjs.cloudflare.com'],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },
    strictTransportSecurity: production ? undefined : false
  }));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  // Optional fixed date for demonstrations on the sample data; blank means the real date
  app.get('/config.js', (req, res) => {
    const demoDate = /^\d{4}-\d{2}-\d{2}$/.test(env.DEMO_DATE || '') ? `${env.DEMO_DATE}T09:00:00` : '';
    res.type('application/javascript').set('Cache-Control', 'no-store').send(`window.SHELLFLOW_HOSTED = true;${demoDate ? ` window.SHELLFLOW_NOW = ${JSON.stringify(demoDate)};` : ' window.SHELLFLOW_NOW = new Date().toISOString();'}`);
  });

  const api = express.Router();
  api.use(cookieParser());
  api.use(express.json({ limit: '6mb' }));
  // Sign-in cookies cannot be used from other sites: state-changing calls must be JSON from this site
  api.use((req, res, next) => {
    if (['GET', 'HEAD'].includes(req.method)) return next();
    if (req.method !== 'DELETE' && !req.is('application/json')) return res.status(415).json({ error: 'Send JSON.' });
    const origin = req.get('origin');
    let sameSite = true;
    try { sameSite = !origin || new URL(origin).host === req.get('host'); } catch { sameSite = false; }
    if (!sameSite) return res.status(403).json({ error: 'This request came from another site.' });
    return next();
  });
  api.use((req, res, next) => ready().then(() => next(), next));

  const setSession = (res, user) => {
    const token = jwt.sign({ sub: user.id, sv: user.sessionVersion }, secret, { expiresIn: `${SESSION_HOURS}h` });
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: production, maxAge: SESSION_HOURS * 3600 * 1000, path: '/' });
  };

  // Reads the person from the store on every request, so role changes and removals apply at once
  const authenticate = async (req, res, next) => {
    try {
      const payload = jwt.verify(req.cookies[COOKIE] || '', secret);
      const user = await store.getUserById(payload.sub);
      if (!user || !user.active || user.sessionVersion !== payload.sv) throw new Error('session');
      req.user = user;
      return next();
    } catch {
      res.clearCookie(COOKIE, { path: '/' });
      return res.status(401).json({ error: 'Please sign in.', code: 'AUTH_REQUIRED' });
    }
  };
  const requirePasswordChanged = (req, res, next) => {
    if (req.user.mustChangePassword) return res.status(403).json({ error: 'Please change your password first.', code: 'PASSWORD_CHANGE_REQUIRED' });
    return next();
  };
  const requireAdmin = (req, res, next) => {
    if (!req.user.roles.includes('ADMIN')) return res.status(403).json({ error: 'Only an administrator can do this.', code: 'ACCESS_DENIED' });
    return next();
  };
  const signedIn = [authenticate, requirePasswordChanged];

  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: options.loginLimit || 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please wait and try again.' } });

  api.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const email = cleanEmail(req.body.email);
      const password = String(req.body.password || '');
      const bad = () => res.status(401).json({ error: 'Email or password is incorrect.', code: 'BAD_CREDENTIALS' });
      if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
      const user = await store.getUserByEmail(email);
      const matches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
      if (!user) return bad();
      if (user.lockedUntil > Date.now()) return res.status(429).json({ error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.`, code: 'LOCKED' });
      if (!matches) {
        const failed = user.failedLogins + 1;
        await store.updateUser(user.id, failed >= MAX_FAILED_LOGINS ? { failedLogins: 0, lockedUntil: Date.now() + LOCK_MINUTES * 60000 } : { failedLogins: failed });
        return bad();
      }
      if (!user.active) return res.status(403).json({ error: 'This account is suspended. Ask your administrator.', code: 'SUSPENDED' });
      const fresh = await store.updateUser(user.id, { failedLogins: 0, lockedUntil: 0 });
      setSession(res, fresh);
      return res.json({ user: publicUser(fresh) });
    } catch (err) { return next(err); }
  });

  api.post('/logout', (req, res) => {
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  api.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

  api.post('/change-password', authenticate, async (req, res, next) => {
    try {
      const current = String(req.body.current || '');
      const next_ = String(req.body.next || '');
      if (!(await bcrypt.compare(current, req.user.passwordHash))) return res.status(400).json({ error: 'Your current password is not correct.' });
      if (next_.length < MIN_PASSWORD) return res.status(400).json({ error: `Your new password needs at least ${MIN_PASSWORD} characters.` });
      if (next_.length > 200) return res.status(400).json({ error: 'That password is too long.' });
      if (next_ === current) return res.status(400).json({ error: 'It cannot be the same as your current password.' });
      const fresh = await store.updateUser(req.user.id, { passwordHash: await bcrypt.hash(next_, BCRYPT_COST), mustChangePassword: false, sessionVersion: req.user.sessionVersion + 1 });
      setSession(res, fresh);
      return res.json({ user: publicUser(fresh) });
    } catch (err) { return next(err); }
  });

  // ----- Admin Permissions: who can sign in and what they can open -----
  const adminOnly = [...signedIn, requireAdmin];

  api.get('/users', adminOnly, async (req, res, next) => {
    try { res.json({ users: (await store.listUsers()).map(publicUser) }); } catch (err) { next(err); }
  });

  api.post('/users', adminOnly, async (req, res, next) => {
    try {
      const { name, password, roles } = req.body;
      const email = cleanEmail(req.body.email);
      if (!validName(name)) return res.status(400).json({ error: "Enter the person's full name." });
      if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid corporate email address.' });
      if (typeof password !== 'string' || password.length < MIN_PASSWORD || password.length > 200) return res.status(400).json({ error: `The temporary password needs at least ${MIN_PASSWORD} characters.` });
      if (!validRoles(roles)) return res.status(400).json({ error: 'Choose at least one valid role.' });
      const user = await store.createUser({
        id: crypto.randomUUID(), name: name.trim(), email, passwordHash: await bcrypt.hash(password, BCRYPT_COST), roles,
        mustChangePassword: true, active: true, isProtected: false, sessionVersion: 1, failedLogins: 0, lockedUntil: 0
      });
      return res.status(201).json({ user: publicUser(user) });
    } catch (err) {
      if (err.code === 'DUPLICATE') return res.status(409).json({ error: 'That email address already has an account.' });
      return next(err);
    }
  });

  api.patch('/users/:id', adminOnly, async (req, res, next) => {
    try {
      const target = await store.getUserById(req.params.id);
      if (!target) return res.status(404).json({ error: 'That user no longer exists.' });
      const patch = {};
      const { name, roles, active, password } = req.body;
      if (name !== undefined) {
        if (!validName(name)) return res.status(400).json({ error: "Enter the person's full name." });
        patch.name = name.trim();
      }
      if (roles !== undefined) {
        if (!validRoles(roles)) return res.status(400).json({ error: 'Choose at least one valid role.' });
        if (target.isProtected && !roles.includes('ADMIN')) return res.status(400).json({ error: 'The main administrator must keep the administrator role.' });
        if (target.id === req.user.id && !roles.includes('ADMIN')) return res.status(400).json({ error: 'You cannot remove your own administrator role.' });
        patch.roles = roles;
      }
      if (active !== undefined) {
        if (typeof active !== 'boolean') return res.status(400).json({ error: 'Active must be true or false.' });
        if (target.isProtected && !active) return res.status(400).json({ error: 'The main administrator cannot be suspended.' });
        if (target.id === req.user.id && !active) return res.status(400).json({ error: 'You cannot suspend your own account.' });
        patch.active = active;
      }
      if (password !== undefined) {
        if (typeof password !== 'string' || password.length < MIN_PASSWORD || password.length > 200) return res.status(400).json({ error: `The temporary password needs at least ${MIN_PASSWORD} characters.` });
        patch.passwordHash = await bcrypt.hash(password, BCRYPT_COST);
        patch.mustChangePassword = true;
        patch.sessionVersion = target.sessionVersion + 1;
        patch.failedLogins = 0;
        patch.lockedUntil = 0;
      }
      return res.json({ user: publicUser(await store.updateUser(target.id, patch)) });
    } catch (err) { return next(err); }
  });

  api.delete('/users/:id', adminOnly, async (req, res, next) => {
    try {
      const target = await store.getUserById(req.params.id);
      if (!target) return res.status(404).json({ error: 'That user no longer exists.' });
      if (target.isProtected) return res.status(400).json({ error: 'The main administrator cannot be deleted.' });
      if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
      await store.deleteUser(target.id);
      return res.json({ ok: true });
    } catch (err) { return next(err); }
  });

  // ----- Shared data -----
  const versionsOf = sections => Object.fromEntries(Object.entries(sections).map(([n, s]) => [n, s.version]));

  api.get('/state', signedIn, async (req, res, next) => {
    try {
      const sections = await store.getSections();
      res.set('Cache-Control', 'no-store').json({ sections });
    } catch (err) { next(err); }
  });

  api.get('/state/versions', signedIn, async (req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store').json({ versions: versionsOf(await store.getSections()) });
    } catch (err) { next(err); }
  });

  api.put('/state', signedIn, async (req, res, next) => {
    try {
      const changes = req.body.changes;
      if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return res.status(400).json({ error: 'Nothing to save.' });
      const author = req.user.name;
      const outcome = await store.updateSections(current => {
        const accepted = {};
        const denied = [];
        const conflicts = [];
        const invalid = [];
        Object.entries(changes).forEach(([name, change]) => {
          if (!canWrite(name, req.user)) { denied.push(name); return; }
          if (!change || typeof change !== 'object') { invalid.push({ section: name, error: 'Nothing to save.' }); return; }
          const stored = current[name];
          let data = change && change.data;
          try {
            if (MERGED_LISTS[name]) {
              const key = name === 'activity' ? 'activity' : name;
              validateSection(name, data, stored?.data, req.user);
              data = { [key]: mergeList(stored?.data?.[key], data[key], author, MERGED_LISTS[name]) };
            } else if (name === 'comments') {
              validateSection(name, data, stored?.data, req.user);
              data = { comments: mergeComments(stored?.data?.comments, data.comments, author) };
            } else {
              if ((stored?.version || 0) !== (change.baseVersion || 0)) { conflicts.push(name); return; }
              validateSection(name, data, stored?.data, req.user);
            }
            accepted[name] = data;
          } catch (err) {
            if (!err.invalid) throw err;
            invalid.push({ section: name, error: err.message });
          }
        });
        return { changes: accepted, result: { denied, conflicts, invalid, saved: Object.keys(accepted) } };
      });
      const { denied, conflicts, invalid, saved } = outcome.result;
      const touched = [...saved, ...conflicts];
      return res.json({
        denied, conflicts, invalid, saved,
        sections: Object.fromEntries(touched.filter(n => outcome.sections[n]).map(n => [n, outcome.sections[n]])),
        versions: versionsOf(outcome.sections)
      });
    } catch (err) { return next(err); }
  });

  // Goes back to the sample data; users and passwords are not touched
  api.delete('/state', adminOnly, async (req, res, next) => {
    try { await store.clearSections(); res.json({ ok: true }); } catch (err) { next(err); }
  });

  api.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  // Errors are logged here and never shown in detail to the browser
  api.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That is too large to save.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'That request could not be read.' });
    console.error('[shellflow]', err.message);
    return res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
  });

  app.use('/api', api);
  app.use(express.static(path.join(__dirname, '..', 'public'), { etag: true, setHeaders: res => res.set('Cache-Control', 'no-cache') }));
  app.locals.store = store;
  app.locals.ready = ready;
  return app;
}

module.exports = { createApp, ROLES };
