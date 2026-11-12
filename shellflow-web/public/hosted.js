// Connects the ShellFlow page to the server: real sign-in, access from Admin Permissions, and shared data.
(function () {
  const $id = id => document.getElementById(id);
  document.documentElement.style.visibility = 'hidden';
  // The page's own start-up reads this before anyone has signed in
  appState.roles = [];

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'The server could not complete that.');
      err.status = res.status;
      err.code = data.code;
      throw err;
    }
    return data;
  }

  // ----- Which part of the shared data each piece of the page belongs to -----
  const FORM_PATTERNS = { form_bd: /^(bd-|pt-)/, form_design: /^(sp-|des-(start|est|act|status|level|final|dcf))/, form_gate: /^(recon-|freight-ref$)/ };
  const SECTION_KEYS = {
    finance: ['advanceCleared', 'advanceReceived', 'advanceDate', 'otherPaid'],
    bankLines: ['bankLines'],
    nca: ['ncaVersions'],
    shell: ['shellRevisions'],
    items: ['items'],
    panels: ['panels', 'panelLog', 'planningSeries'],
    yard: ['yardEvidence', 'confirmOver'],
    logistics: ['lorries', 'etdLog', 'sailedM2'],
    site: ['siteRegister', 'siteProgressM2'],
    incidents: ['incidents'],
    releases: ['releases'],
    rules: ['rules'],
    approvals: ['approvals'],
    reminders: ['reminders', 'doneReminders', 'alertDecisions'],
    reports: ['reports'],
    activity: ['activity'],
    updates: ['updates'],
    notes: ['notes'],
    comments: ['comments'],
    lines: ['mr11Lines'],
    lineFinance: ['lineFinance'], lineDesign: ['lineDesign'], lineProduction: ['lineProduction'], lineDispatch: ['lineDispatch'], lineSite: ['lineSite']
  };
  const WRITERS = {
    form_bd: ['BD'], form_design: ['SHELLPLAN', 'DESIGN'], form_gate: ['PLANNING', 'PRODUCTION', 'DISPATCH'], finance: ['FINANCE'], bankLines: null,
    nca: ['BD'], shell: ['SHELLPLAN', 'DESIGN'], items: ['DESIGN', 'PRODUCTION'], panels: ['PLANNING', 'PRODUCTION', 'DISPATCH'], yard: ['PRODUCTION', 'DISPATCH'],
    logistics: ['DISPATCH'], site: null, incidents: ['DISPATCH', 'FINANCE'], releases: [], rules: [], referenceRows: ['FINANCE', 'DISPATCH'],
    approvals: null, reminders: null, reports: null, activity: null, updates: null, notes: null, comments: null, lines: ['BD'],
    lineFinance: ['FINANCE'], lineDesign: ['SHELLPLAN', 'DESIGN'], lineProduction: ['PLANNING', 'PRODUCTION'], lineDispatch: ['DISPATCH'], lineSite: ['DISPATCH']
  };
  const mayWrite = name => {
    if (appState.roles.includes('ADMIN')) return true;
    const writers = WRITERS[name];
    return writers === null || (writers || []).some(r => appState.roles.includes(r));
  };

  function collect() {
    const out = {};
    Object.entries(FORM_PATTERNS).forEach(([name, pattern]) => {
      const values = {};
      document.querySelectorAll('.step-panel input[id], .step-panel select[id], .step-panel textarea[id]').forEach(el => {
        if (pattern.test(el.id) && el.type !== 'file' && el.type !== 'password') values[el.id] = el.value;
      });
      out[name] = { values };
    });
    out.form_bd.months = [...document.querySelectorAll('.fc-month-input')].map(i => i.value);
    Object.entries(SECTION_KEYS).forEach(([name, keys]) => {
      out[name] = Object.fromEntries(keys.map(k => [k, appState[k]]));
    });
    out.reports = { reports: appState.reports.slice(0, 12) };
    out.referenceRows = { rows: Object.fromEntries(referenceMR11Projects.map(r => [r.key, { advStatus: r.advStatus, paymentOverdue: !!r.paymentOverdue, readinessState: r.readinessState, shippedM2: r.shippedM2, deleted: !!r.deleted }])) };
    return out;
  }

  function applySection(name, data) {
    if (FORM_PATTERNS[name]) {
      Object.entries(data.values || {}).forEach(([id, value]) => {
        const el = $id(id);
        if (el && document.activeElement !== el) el.value = value;
      });
      return;
    }
    if (name === 'referenceRows') {
      referenceMR11Projects.forEach(r => {
        const saved = data.rows && data.rows[r.key];
        if (!saved) return;
        // Only these fields can change, so saved data can never replace a row's other figures
        ['advStatus', 'paymentOverdue', 'readinessState', 'shippedM2', 'deleted'].forEach(f => { if (saved[f] !== undefined) r[f] = saved[f]; });
      });
      return;
    }
    (SECTION_KEYS[name] || []).forEach(k => { if (data[k] !== undefined) appState[k] = data[k]; });
    if (name === 'logistics') {
      appState.lorrySeq = appState.lorries.reduce((max, l) => Math.max(max, Number(l.id.replace('LORRY-', '')) || 0), 1);
    }
  }

  let applying = false;
  const versions = {};
  let sentSnapshot = {};
  const snapshotStrings = () => Object.fromEntries(Object.entries(collect()).map(([k, v]) => [k, JSON.stringify(v)]));

  function applySections(sections) {
    applying = true;
    try {
      // Everything below is drawn once at the end, not once per step
      (window.sfBatch || (work => work()))(() => applyAll(sections));
    } finally {
      applying = false;
    }
    // Only what was just loaded counts as saved; any edit still waiting stays waiting
    const now = snapshotStrings();
    Object.keys(sections).forEach(name => { sentSnapshot[name] = now[name]; });
  }
  function applyAll(sections) {
    {
      Object.entries(sections).forEach(([name, s]) => {
        applySection(name, s.data);
        versions[name] = s.version;
      });
      if (sections.form_bd || sections.nca) {
        propagateBDData();
        const months = sections.form_bd && sections.form_bd.data.months;
        renderForecastInputs();
        if (months) document.querySelectorAll('.fc-month-input').forEach((inp, i) => { if (months[i] !== undefined) inp.value = months[i]; });
      }
      recalculateCommercial();
      validateShellPlanSchedule();
      validateDesignSchedule();
      applyDesignLock();
      renderRules();
      baseRefreshAll();
    }
  }

  // ----- Saving -----
  let saveTimer = null;
  let saving = false;
  let dirtyAgain = false;
  function scheduleSave() {
    if (applying || !appState.me || appState.me.mustChangePassword) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 700);
  }
  async function saveNow() {
    if (saving) { dirtyAgain = true; return; }
    const now = snapshotStrings();
    const changes = {};
    Object.keys(now).forEach(name => {
      if (now[name] !== sentSnapshot[name] && mayWrite(name)) changes[name] = { data: JSON.parse(now[name]), baseVersion: versions[name] || 0 };
    });
    if (!Object.keys(changes).length) return;
    saving = true;
    try {
      const res = await api('/state', { method: 'PUT', body: { changes } });
      Object.keys(changes).forEach(name => { if (res.saved.includes(name)) sentSnapshot[name] = now[name]; });
      Object.entries(res.versions || {}).forEach(([n, v]) => { if (res.saved.includes(n)) versions[n] = v; });
      // Merged lists come back with everyone's entries
      const refreshed = {};
      Object.entries(res.sections || {}).forEach(([name, s]) => { refreshed[name] = s; });
      if (res.conflicts.length) notify('Someone else just changed the same data, so the latest version has been loaded. Please check it and try again.', 'error');
      if (res.invalid.length) notify(res.invalid[0].error, 'error');
      if (res.denied.length) notify('Your role cannot change that, so it was not saved.', 'error');
      if (Object.keys(refreshed).length) {
        const keep = {};
        Object.keys(refreshed).forEach(n => { if (['activity', 'updates', 'notes', 'comments'].includes(n) || res.conflicts.includes(n)) keep[n] = refreshed[n]; });
        if (Object.keys(keep).length) applySections(keep);
      }
    } catch (err) {
      handleApiError(err, 'Your change could not be saved. Please check your connection.');
    } finally {
      saving = false;
      if (dirtyAgain) { dirtyAgain = false; scheduleSave(); }
    }
  }

  // ----- Other people's changes -----
  async function poll() {
    if (!appState.me || appState.me.mustChangePassword || document.hidden || saving || saveTimer === null) return;
    try {
      const res = await api('/state/versions');
      const changed = Object.keys(res.versions).some(n => res.versions[n] !== (versions[n] || 0));
      const removed = Object.keys(versions).some(n => !(n in res.versions));
      if (removed) { location.reload(); return; }
      if (!changed) return;
      const now = snapshotStrings();
      if (Object.keys(now).some(n => mayWrite(n) && now[n] !== sentSnapshot[n])) return;
      const state = await api('/state');
      const fresh = {};
      Object.entries(state.sections).forEach(([n, s]) => { if (s.version !== (versions[n] || 0)) fresh[n] = s; });
      if (Object.keys(fresh).length) applySections(fresh);
    } catch (err) {
      if (err.status === 401) handleApiError(err);
    }
  }

  function handleApiError(err, fallback) {
    if (err.status === 401) { showSignIn('Your session ended. Please sign in again.'); return; }
    if (err.code === 'PASSWORD_CHANGE_REQUIRED') { requirePasswordChange(); return; }
    notify(err.status && err.message ? err.message : (fallback || err.message), 'error');
  }

  // ----- Sign-in -----
  function showSignIn(message) {
    appState.me = null;
    clearTimeout(saveTimer);
    $id('signin-email').value = '';
    $id('signin-password').value = '';
    $id('signin-error').textContent = message || '';
    $id('signin-screen').classList.remove('hidden');
    $id('signin-screen').classList.add('flex');
    // The quick login only shows when the server has it switched on for a local demonstration
    ['signin-quick', 'signin-quick-note'].forEach(id => { if ($id(id)) $id(id).classList.toggle('hidden', !window.SHELLFLOW_DEMO_LOGIN); });
    document.documentElement.style.visibility = 'visible';
    $id('signin-email').focus();
  }
  window.quickLoginAdmin = () => window.quickLogin('ADMIN');
  window.quickLogin = async function (role) {
    const error = $id('signin-error');
    error.textContent = '';
    try {
      const { user } = await api('/demo-login', { method: 'POST', body: { role } });
      await startSession(user, true);
    } catch (err) {
      error.textContent = err.status === 404 ? 'Quick login is switched off on this site.' : err.message;
    }
  };
  window.signOut = async function () {
    await api('/logout', { method: 'POST', body: {} }).catch(() => {});
    location.reload();
  };
  window.performLogin = async function () {
    const error = $id('signin-error');
    error.textContent = '';
    try {
      const { user } = await api('/login', { method: 'POST', body: { email: $id('signin-email').value, password: $id('signin-password').value } });
      $id('signin-password').value = '';
      await startSession(user, true);
    } catch (err) {
      error.textContent = err.message;
      $id('signin-password').value = '';
      $id('signin-password').focus();
    }
  };

  // ----- Access from the signed-in person's roles -----
  window.isAdmin = () => appState.roles.includes('ADMIN');
  window.can = (...roles) => appState.roles.includes('ADMIN') || roles.some(r => appState.roles.includes(r));
  window.guard = (roles, what) => {
    if (can(...roles)) return true;
    notify(`Your account cannot ${what}. Ask your administrator for access.`, 'error');
    return false;
  };
  window.tabAllowed = tab => appState.roles.includes('ADMIN') || COMMON_TABS.includes(tab) || appState.roles.some(r => (ROLE_TABS[r] || []).includes(tab));
  window.allowedWorkbookDepts = () => {
    if (appState.roles.includes('ADMIN')) return Object.keys(WORKBOOK_DEPTS);
    const mapped = appState.roles.map(r => (r === 'SHELLPLAN' ? 'DESIGN' : r)).filter(r => WORKBOOK_DEPTS[r]);
    return [...new Set(mapped)];
  };
  window.logActivity = what => { appState.activity.unshift({ who: appState.me ? appState.me.name : '', when: nowStamp(), what }); };
  window.setRole = () => {};
  window.toggleGateCheck = id => { if (guard(['ADMIN'], 'simulate gate failures')) { appState.simFail[id] = !appState.simFail[id]; baseRefreshAll(); } };
  window.currentUser = () => appState.me;
  window.renderUserChip = () => {
    if (appState.me) $id('header-user').textContent = appState.me.name;
  };

  function applyOwnership() {
    // People can read every step they can open, but only type in their own department's fields
    Object.entries(FORM_PATTERNS).forEach(([name, pattern]) => {
      const allowed = mayWrite(name);
      document.querySelectorAll('.step-panel input[id], .step-panel select[id], .step-panel textarea[id]').forEach(el => {
        if (pattern.test(el.id) && el.id !== 'bd-nca-area') el.disabled = !allowed;
      });
    });
    const admin = appState.roles.includes('ADMIN');
    document.querySelectorAll('[onclick^="simulate"],[onclick^="setAdvance"],[onclick^="test"],[onclick^="restoreValid"],[onclick^="resetRecon"]').forEach(el => el.classList.toggle('hidden', !admin));
  }

  // ----- Password -----
  function requirePasswordChange() {
    openPasswordModal();
    const closeBtns = document.querySelectorAll('#password-modal [onclick="closePasswordModal()"]');
    closeBtns.forEach(b => b.classList.add('hidden'));
    $id('pw-error').textContent = 'Please choose your own password before you continue.';
    $id('pw-error').classList.remove('text-rose-600');
    $id('pw-error').classList.add('text-amber-700');
  }
  window.submitPasswordChange = async function () {
    const error = $id('pw-error');
    error.classList.add('text-rose-600');
    error.classList.remove('text-amber-700');
    const current = $id('pw-current').value, next = $id('pw-new').value, again = $id('pw-confirm').value;
    if (next !== again) { error.textContent = 'The two new passwords do not match.'; return; }
    try {
      const wasForced = appState.me.mustChangePassword;
      const { user } = await api('/change-password', { method: 'POST', body: { current, next } });
      appState.me = user;
      document.querySelectorAll('#password-modal [onclick="closePasswordModal()"]').forEach(b => b.classList.remove('hidden'));
      closePasswordModal();
      notify('Password changed. Use your new password the next time you sign in.', 'success');
      if (wasForced) await loadSharedData();
    } catch (err) {
      error.textContent = err.message;
    }
  };

  // ----- Admin Permissions -----
  const PRESET_LABELS = { ADMIN: 'System Administrator', CEO: 'CEO', BD: 'Business Development', FINANCE: 'Finance', SHELLPLAN: 'Shell Plan', DESIGN: 'Design', PLANNING: 'Planning', PRODUCTION: 'Production', DISPATCH: 'Dispatch' };
  const ACCESS_ROWS = [['System Administrator', 'Every page, including Rules and Admin Permissions'], ['CEO', 'CEO Executive Hub, plus the shared pages'], ['Business Development', 'Step 1 and its workbook, plus the shared pages'], ['Finance', 'Step 2 and its workbook, plus the shared pages'], ['Shell Plan or Design', 'Step 3 and the combined workbook, plus the shared pages'], ['Planning or Production', 'Step 4 and its workbook, plus the shared pages'], ['Dispatch', 'Steps 6 and 7 and its workbooks, plus the shared pages']];
  const presetOfRoles = roles => (roles.length === 1 ? roles[0] : roles.includes('ADMIN') ? 'ADMIN' : 'CUSTOM');
  async function reloadUsers() {
    try {
      appState.users = (await api('/users')).users;
      renderAdminUsers();
    } catch (err) { handleApiError(err); }
  }
  window.renderAdminUsers = function () {
    const root = $id('admin-users');
    const form = $id('admin-form');
    if (!appState.roles.includes('ADMIN')) {
      root.innerHTML = '<p class="text-sm text-slate-600">Admin Permissions opens for administrators only.</p>';
      form.classList.add('hidden');
      return;
    }
    form.classList.remove('hidden');
    const presetSelect = $id('admin-new-preset');
    if (!presetSelect.options.length) presetSelect.innerHTML = Object.entries(PRESET_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    const rows = appState.users.map((u, index) => {
      const current = presetOfRoles(u.roles);
      const locked = u.isProtected;
      const self = appState.me && u.id === appState.me.id;
      const preset = `<select onchange="setUserPreset(${index}, this.value)" ${locked ? 'disabled' : ''} aria-label="Primary role for ${esc(u.name)}" class="px-2 py-1 bg-white border border-slate-300 rounded-lg font-semibold disabled:bg-slate-100">${Object.entries(PRESET_LABELS).map(([k, v]) => `<option value="${k}" ${current === k ? 'selected' : ''}>${v}</option>`).join('')}<option value="CUSTOM" ${current === 'CUSTOM' ? 'selected' : ''} disabled>Custom Permissions</option></select>`;
      const depts = DEPT_KEYS.map(k => {
        const on = u.roles.includes('ADMIN') || u.roles.includes(k);
        return `<button onclick="toggleUserDept(${index}, '${k}')" ${locked || u.roles.includes('ADMIN') ? 'disabled' : ''} class="px-2 py-0.5 rounded text-[10px] font-bold ${on ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}">${on ? 'Enabled' : 'Hidden'}</button>`;
      });
      const state = u.active ? pill('ACTIVE', 'emerald') : pill('SUSPENDED', 'rose');
      const action = locked
        ? `<div class="flex flex-col gap-1 items-start">${pill('Protected System Account', 'amber')}<button onclick="resetUserPassword(${index})" class="text-[11px] font-semibold text-sky-700 hover:underline whitespace-nowrap">Reset Password</button></div>`
        : `<div class="flex flex-col gap-1 items-start whitespace-nowrap">
            <button onclick="resetUserPassword(${index})" class="text-[11px] font-semibold text-sky-700 hover:underline">Reset Password</button>
            ${self ? '' : `<button onclick="toggleUserActive(${index})" class="text-[11px] font-semibold text-amber-700 hover:underline">${u.active ? 'Suspend Access' : 'Restore Access'}</button>
            <button onclick="deleteUser(${index})" class="text-[11px] font-semibold text-rose-700 hover:underline">Delete User</button>`}
          </div>`;
      return [`<strong>${esc(u.name)}</strong><div class="text-[11px] text-slate-500">${esc(u.email)}</div>`, preset, pill('Enabled', 'emerald'), ...depts, state, action];
    });
    root.innerHTML = table(['User Account', 'Primary Role', 'Global MR11', ...DEPT_KEYS.map(k => ROLES[k]), 'State', 'Action'], rows)
      + `<div class="pt-4"><h3 class="text-sm font-bold text-slate-900 mb-2">What Each Role Can Open</h3>${table(['Role', 'Pages'], ACCESS_ROWS)}<p class="text-[11px] text-slate-500 mt-2">Shared pages: MR11 Master Schedule, Readiness Gate, Alerts, Approvals &amp; Log, Reports and Mobile App. The server enforces all of this, and a change applies straight away.</p></div>`
      + `<div class="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 mt-4"><span class="text-xs text-slate-500">Sample data can be restored for a demonstration. Users and passwords are not affected.</span><button onclick="resetSharedData()" class="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 text-xs font-semibold hover:bg-rose-50">Reset Shared Data to Sample</button></div>`;
  };
  async function adminCall(path, method, body, message) {
    try {
      await api(path, { method, body });
      if (message) notify(message, 'success');
      await reloadUsers();
    } catch (err) { handleApiError(err); await reloadUsers(); }
  }
  window.createUser = function () {
    adminCall('/users', 'POST', { name: $id('admin-new-name').value, email: $id('admin-new-email').value, password: $id('admin-new-password').value, roles: [$id('admin-new-preset').value] }, 'Account created. They must change the temporary password when they first sign in.')
      .then(() => { $id('admin-new-name').value = ''; $id('admin-new-email').value = ''; $id('admin-new-password').value = ''; });
  };
  window.setUserPreset = (i, preset) => {
    const u = appState.users[i];
    logActivity(`Set ${u.email} to ${PRESET_LABELS[preset]}`);
    adminCall(`/users/${u.id}`, 'PATCH', { roles: [preset] }, 'Saved. It applies straight away.');
  };
  window.toggleUserDept = (i, dept) => {
    const u = appState.users[i];
    const roles = u.roles.includes(dept) ? u.roles.filter(r => r !== dept) : [...u.roles, dept];
    if (!roles.length) { notify('A user needs at least one role. To stop their access, use Suspend Access.', 'error'); return; }
    logActivity(`${roles.includes(dept) ? 'Enabled' : 'Hid'} ${ROLES[dept]} for ${u.email}`);
    adminCall(`/users/${u.id}`, 'PATCH', { roles }, 'Saved. It applies straight away.');
  };
  window.toggleUserActive = i => {
    const u = appState.users[i];
    logActivity(`${u.active ? 'Suspended' : 'Restored'} access for ${u.email}`);
    adminCall(`/users/${u.id}`, 'PATCH', { active: !u.active }, u.active ? 'Access suspended. They are signed out straight away.' : 'Access restored.');
  };
  window.resetUserPassword = i => {
    const u = appState.users[i];
    askModal({
      title: 'Reset Password', desc: `${u.name} will be signed out and must choose a new password at next sign-in. Give them this temporary password privately.`, label: 'Temporary password (at least 8 characters)', confirm: 'Reset Password', min: 8,
      onOk: password => {
        logActivity(`Reset the password for ${u.email}`);
        adminCall(`/users/${u.id}`, 'PATCH', { password }, 'Password reset.');
      }
    });
  };
  window.deleteUser = i => {
    const u = appState.users[i];
    askModal({
      title: 'Delete User Account', desc: `This removes ${u.email} and cannot be undone. Type the email address to confirm.`, label: 'Email address', confirm: 'Delete User', min: 3,
      onOk: typed => {
        if (typed.trim().toLowerCase() !== u.email) { notify('The email address did not match, so nothing was deleted.', 'error'); return; }
        logActivity(`Deleted user ${u.email}`);
        adminCall(`/users/${u.id}`, 'DELETE', undefined, 'User deleted.');
      }
    });
  };
  window.resetSharedData = () => {
    askModal({
      title: 'Reset Shared Data', desc: 'This replaces everything people have entered with the sample data. It cannot be undone. Type RESET to confirm.', label: 'Type RESET', confirm: 'Reset Data', min: 5,
      onOk: typed => {
        if (typed !== 'RESET') { notify('Nothing was changed.', 'info'); return; }
        api('/state', { method: 'DELETE' }).then(() => location.reload(), err => handleApiError(err));
      }
    });
  };

  // ----- Start-up -----
  let baseRefreshAll = null;
  async function loadSharedData() {
    const state = await api('/state');
    if (Object.keys(state.sections).length) applySections(state.sections);
    sentSnapshot = snapshotStrings();
    applyOwnership();
    if (appState.roles.includes('ADMIN')) await reloadUsers();
    baseRefreshAll();
    saveTimer = 0;
    // The first admin sign-in stores the starting data, so the server can tell a new entry from an old one
    if (appState.roles.includes('ADMIN')) {
      const missing = Object.keys(sentSnapshot).filter(name => !state.sections[name]);
      if (missing.length) {
        missing.forEach(name => { delete sentSnapshot[name]; });
        await saveNow();
      }
    }
  }
  async function startSession(user, signedInNow) {
    appState.me = user;
    appState.roles = user.roles;
    appState.role = user.roles.includes('ADMIN') ? 'ADMIN' : user.roles[0];
    appState.currentUserEmail = user.email;
    appState.users = [];
    $id('signin-screen').classList.add('hidden');
    $id('signin-screen').classList.remove('flex');
    applyRoleNav();
    // Everyone starts at the MR11 Master Schedule. A reload, or a page link such as #timeline,
    // keeps that page; signing in always opens MR11.
    const first = 9;
    const asked = !signedInNow && typeof startPage === 'function' ? startPage() : null;
    switchTab(asked && tabAllowed(asked) ? asked : tabAllowed(first) ? first : 9);
    renderUserChip();
    document.documentElement.style.visibility = 'visible';
    if (user.mustChangePassword) { requirePasswordChange(); return; }
    await loadSharedData();
  }

  window.addEventListener('DOMContentLoaded', async () => {
    baseRefreshAll = window.refreshAll;
    window.refreshAll = function () { baseRefreshAll(); scheduleSave(); };
    // New ids start from the clock, so two people cannot create the same one
    appState.nextId = Math.floor(Date.now() / 1000);
    appState.roles = [];
    // The audit trail starts empty on a hosted site, so nothing in it is sample data
    appState.activity = [];
    appState.updates = [];
    appState.notes = [];
    appState.comments = {};
    // Controls that only make sense in the single-file demonstration
    $id('role-select').parentElement.classList.add('hidden');
    document.querySelectorAll('[onclick="resetAllDemoData()"],[onclick="downloadStandaloneHTML()"]').forEach(el => el.classList.add('hidden'));
    setInterval(poll, 15000);
    try {
      const { user } = await api('/me');
      await startSession(user);
    } catch (err) {
      if (err.status === 401) showSignIn();
      else { showSignIn('The server could not be reached. Please try again.'); }
    }
  });
})();
