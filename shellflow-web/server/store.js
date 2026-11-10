// Where users and shared data live: PostgreSQL when DATABASE_URL is set, otherwise a JSON file.
const fs = require('fs');
const path = require('path');

const userColumns = {
  name: 'name', email: 'email', passwordHash: 'password_hash', roles: 'roles', mustChangePassword: 'must_change_password',
  active: 'active', isProtected: 'is_protected', sessionVersion: 'session_version', failedLogins: 'failed_logins', lockedUntil: 'locked_until'
};

class FileStore {
  constructor(dir) {
    this.file = path.join(dir, 'store.json');
    fs.mkdirSync(dir, { recursive: true });
    this.data = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : { users: [], sections: {} };
    this.queue = Promise.resolve();
  }
  init() { return Promise.resolve(); }
  flush() {
    const temp = `${this.file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(this.data));
    fs.renameSync(temp, this.file);
  }
  // Runs one change at a time, so two requests cannot overwrite each other
  locked(fn) {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => {});
    return run;
  }
  async listUsers() { return this.data.users.map(u => ({ ...u })); }
  async countUsers() { return this.data.users.length; }
  async getUserById(id) { const u = this.data.users.find(x => x.id === id); return u ? { ...u } : null; }
  async getUserByEmail(email) { const u = this.data.users.find(x => x.email === email); return u ? { ...u } : null; }
  createUser(user) {
    return this.locked(() => {
      if (this.data.users.some(u => u.email === user.email)) { const e = new Error('duplicate'); e.code = 'DUPLICATE'; throw e; }
      this.data.users.push(user);
      this.flush();
      return { ...user };
    });
  }
  updateUser(id, patch) {
    return this.locked(() => {
      const u = this.data.users.find(x => x.id === id);
      if (!u) return null;
      Object.assign(u, patch);
      this.flush();
      return { ...u };
    });
  }
  deleteUser(id) {
    return this.locked(() => {
      this.data.users = this.data.users.filter(u => u.id !== id);
      this.flush();
    });
  }
  async getSections() { return JSON.parse(JSON.stringify(this.data.sections)); }
  // fn receives the current sections and returns { name: { data } } to save; each saved section's version goes up
  updateSections(fn) {
    return this.locked(async () => {
      const current = JSON.parse(JSON.stringify(this.data.sections));
      const { changes, result } = await fn(current);
      Object.entries(changes).forEach(([name, data]) => {
        this.data.sections[name] = { data, version: (this.data.sections[name]?.version || 0) + 1 };
      });
      if (Object.keys(changes).length) this.flush();
      return { result, sections: JSON.parse(JSON.stringify(this.data.sections)) };
    });
  }
  clearSections() {
    return this.locked(() => {
      this.data.sections = {};
      this.flush();
    });
  }
}

class PgStore {
  constructor(url) {
    const { Pool } = require('pg');
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    // Hosted Postgres such as Supabase needs TLS; DATABASE_CA_CERT turns on full certificate checks
    const ca = process.env.DATABASE_CA_CERT;
    const clean = url.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '');
    this.pool = new Pool({
      connectionString: clean,
      max: Number(process.env.DATABASE_POOL_SIZE) || 3,
      ssl: local ? false : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false }
    });
  }
  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sf_users (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        roles jsonb NOT NULL,
        must_change_password boolean NOT NULL DEFAULT true,
        active boolean NOT NULL DEFAULT true,
        is_protected boolean NOT NULL DEFAULT false,
        session_version integer NOT NULL DEFAULT 1,
        failed_logins integer NOT NULL DEFAULT 0,
        locked_until bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS sf_sections (
        name text PRIMARY KEY,
        data jsonb NOT NULL,
        version integer NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );`);
  }
  row(r) {
    return r && {
      id: r.id, name: r.name, email: r.email, passwordHash: r.password_hash, roles: r.roles, mustChangePassword: r.must_change_password,
      active: r.active, isProtected: r.is_protected, sessionVersion: r.session_version, failedLogins: r.failed_logins, lockedUntil: Number(r.locked_until)
    };
  }
  async listUsers() { return (await this.pool.query('SELECT * FROM sf_users ORDER BY created_at, email')).rows.map(r => this.row(r)); }
  async countUsers() { return (await this.pool.query('SELECT count(*)::int AS n FROM sf_users')).rows[0].n; }
  async getUserById(id) { return this.row((await this.pool.query('SELECT * FROM sf_users WHERE id = $1', [id])).rows[0]) || null; }
  async getUserByEmail(email) { return this.row((await this.pool.query('SELECT * FROM sf_users WHERE email = $1', [email])).rows[0]) || null; }
  async createUser(u) {
    try {
      const { rows } = await this.pool.query(
        `INSERT INTO sf_users (id, name, email, password_hash, roles, must_change_password, active, is_protected, session_version, failed_logins, locked_until)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [u.id, u.name, u.email, u.passwordHash, JSON.stringify(u.roles), u.mustChangePassword, u.active, u.isProtected, u.sessionVersion, u.failedLogins, u.lockedUntil]
      );
      return this.row(rows[0]);
    } catch (err) {
      if (err.code === '23505') { const e = new Error('duplicate'); e.code = 'DUPLICATE'; throw e; }
      throw err;
    }
  }
  async updateUser(id, patch) {
    const keys = Object.keys(patch).filter(k => userColumns[k]);
    if (!keys.length) return this.getUserById(id);
    const sets = keys.map((k, i) => `${userColumns[k]} = $${i + 2}`).join(', ');
    const values = keys.map(k => (k === 'roles' ? JSON.stringify(patch[k]) : patch[k]));
    const { rows } = await this.pool.query(`UPDATE sf_users SET ${sets} WHERE id = $1 RETURNING *`, [id, ...values]);
    return this.row(rows[0]) || null;
  }
  async deleteUser(id) { await this.pool.query('DELETE FROM sf_users WHERE id = $1', [id]); }
  async getSections() {
    const { rows } = await this.pool.query('SELECT name, data, version FROM sf_sections');
    return Object.fromEntries(rows.map(r => [r.name, { data: r.data, version: r.version }]));
  }
  async updateSections(fn) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // A single lock per save keeps merges correct when several server instances run at once
      await client.query('SELECT pg_advisory_xact_lock(727001)');
      const { rows } = await client.query('SELECT name, data, version FROM sf_sections');
      const current = Object.fromEntries(rows.map(r => [r.name, { data: r.data, version: r.version }]));
      const { changes, result } = await fn(JSON.parse(JSON.stringify(current)));
      for (const [name, data] of Object.entries(changes)) {
        const version = (current[name]?.version || 0) + 1;
        await client.query(
          `INSERT INTO sf_sections (name, data, version, updated_at) VALUES ($1, $2, $3, now())
           ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = now()`,
          [name, JSON.stringify(data), version]
        );
        current[name] = { data, version };
      }
      await client.query('COMMIT');
      return { result, sections: current };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
  async clearSections() { await this.pool.query('DELETE FROM sf_sections'); }
  close() { return this.pool.end(); }
}

function createStore(env = process.env) {
  const url = env.DATABASE_URL || env.POSTGRES_URL;
  if (url) return new PgStore(url);
  return new FileStore(env.DATA_DIR || path.join(__dirname, '..', 'data'));
}

module.exports = { createStore, FileStore, PgStore };
