
    // =========================================================================
    // SHELLFLOW PAGE SYSTEM: page heads, gate tie holes, My Work, Timeline,
    // command search (Ctrl K) and A4 printing. Reads the same appState as the
    // rest of the page; nothing here stores data of its own.
    // =========================================================================
    const PAGES = {
      1: { step: 1, name: 'BD & Commercial', purpose: 'Project entry, NCA versions and pricing', icon: 'briefcase' },
      2: { step: 2, name: 'Finance Gateway', purpose: 'Payment lines and bank-line matching', icon: 'landmark' },
      3: { step: 3, name: 'Technical Design', purpose: 'Shell plan, design release and accessories', icon: 'drafting-compass' },
      4: { step: 4, name: 'Production & Yard', purpose: 'Daily panel actuals, series and yard readiness', icon: 'factory' },
      6: { step: 5, name: 'Readiness Gate & 4-Way', purpose: 'Five-point dispatch gate and the 4-way m² check', icon: 'shield-check' },
      7: { step: 6, name: 'Logistics & Shipping', purpose: 'Lorry planning, ETD log and shipping', icon: 'truck' },
      8: { step: 7, name: 'Site Receiving', purpose: 'Deliveries, site progress and incidents', icon: 'hard-hat' },
      9: { step: 8, name: 'MR11 Master Schedule', purpose: 'The MR11 master operations ledger: every contract, live from steps 1 to 7', icon: 'sheet' },
      18: { name: 'My Work', purpose: 'Everything waiting on you, in one list', icon: 'inbox' },
      10: { name: 'Alerts & Reminders', purpose: 'Rule-based alerts and dated reminders', icon: 'bell-ring' },
      11: { name: 'Approvals & Log', purpose: 'Changes waiting for approval, field updates and the activity log', icon: 'clipboard-check' },
      12: { name: 'Reports', purpose: 'The weekly report, saved reports and A4 printing', icon: 'file-bar-chart' },
      19: { name: 'Project Timeline', purpose: 'Every MR11 project month by month, with what needs attention', icon: 'chart-gantt' },
      13: { name: 'Mobile App', purpose: 'Critical and urgent inputs from site and the factory floor', icon: 'smartphone' },
      14: { name: 'Rules', purpose: 'Capacities, tolerances, clocks and gate checks (administrators)', icon: 'sliders-horizontal' },
      15: { name: 'CEO Executive Hub', purpose: 'Progress, cash and risk across every project', icon: 'line-chart' },
      16: { name: 'Admin Permissions', purpose: 'Who can sign in and what each person can open', icon: 'users' },
      17: { name: 'Department Workbooks', purpose: "Each department's Excel workbook, read and written here", icon: 'table' }
    };
    const STEP_TABS = [1, 2, 3, 4, 6, 7, 8, 9];
    const MENU_ORDER = [...STEP_TABS, 18, 10, 11, 12, 19, 13, 14, 15, 16, 17];
    const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
    const fmtDate = v => { if (!isDate(v)) return v || ''; const [y, m, d] = v.split('-'); return `${Number(d)} ${MONTH_SHORT[Number(m) - 1]} ${y}`; };
    const icon = (name, cls = '') => `<i data-lucide="${name}"${cls ? ` class="${cls}"` : ''}></i>`;
    const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
    function myRoles() { return Array.isArray(appState.roles) && appState.roles.length ? appState.roles : [appState.role]; }
    function roleIsAdmin() { return myRoles().includes('ADMIN'); }
    function goHome() {
      const first = [18, 15, 9].find(t => tabAllowed(t));
      switchTab(first || 9);
    }

    // ---------------- Gate conditions: the tie holes ----------------
    function check(label, test) {
      let met = false;
      try { met = !!test(); } catch { met = false; }
      return { label, met };
    }
    function stepConditions(tab, alerts) {
      const val = id => ($(id) ? $(id).value : '');
      switch (tab) {
        case 1: return [
          check('Project details complete', () => [appState.projectName, appState.buildingName, appState.countryName, appState.picName, appState.projectNo].every(v => String(v || '').trim())),
          check('An NCA version is approved', () => latestNca()),
          check('Selling price calculated', () => appState.finalUnitRate > 0 && Number.isFinite(appState.totalContractValue)),
          check('Monthly forecast matches the NCA', () => Math.abs(forecastInputs().reduce((a, b) => a + b, 0) - appState.ncaArea) < 0.01)
        ];
        case 2: return [
          check('Payment terms add up to 100%', () => Math.abs(termsList().reduce((a, t) => a + t.pct, 0) - 100) < 0.01),
          check('Advance payment received', () => appState.advanceCleared),
          check('Advance date recorded', () => appState.advanceCleared && isDate(appState.advanceDate)),
          check('Every bank line matched', () => !appState.bankLines.some(l => l.status === 'OPEN'))
        ];
        case 3: return [
          check('Shell plan approved', () => val('sp-act-date')),
          check('Design complete', () => designIsComplete()),
          check('Design m² matches the NCA', () => Math.abs((parseFloat(val('des-final-m2')) || 0) - appState.ncaArea) <= (appState.ncaArea * (appState.rules.designTolerancePct || 0) / 100) + 0.01),
          check('Accessories inside their SLA', () => !appState.items.some(i => !itemDone(i) && slaOf(i).over))
        ];
        case 4: return [
          check('Production series released', () => appState.planningSeries.some(s => s.status === 'Released')),
          check('Panels produced', () => panelM2AtOrPast('PRODUCED') > 0),
          check('Yard evidence attached', () => appState.yardEvidence.length > 0),
          check('Plant load inside capacity', () => appState.existingPlantLoad + appState.ncaArea <= appState.plantCapacityCap)
        ];
        case 6: {
          const g = gateFor('LIVE');
          return g.checks.map(c => ({ label: c.na ? `${c.name} (not needed)` : c.name, met: !!c.pass }));
        }
        case 7: return [
          check('Freight reference saved', () => appState.freightRef),
          check('A lorry is booked', () => appState.lorries.some(l => l.row === 'LIVE' && l.status !== 'Cancelled')),
          check('No lorry is late', () => !appState.lorries.some(l => activeLorry(l) && l.date < DEMO_TODAY)),
          check('No lorry is overloaded', () => !appState.lorries.some(l => l.m2 > l.cap && l.status !== 'Cancelled'))
        ];
        case 8: return [
          check('A delivery is recorded', () => appState.siteRegister.length > 0),
          check('Every delivery has evidence', () => appState.siteRegister.length > 0 && appState.siteRegister.every(x => x.evidence)),
          check('Departed lorries are received', () => appState.lorries.filter(l => l.row === 'LIVE' && l.status === 'Departed').every(l => appState.siteRegister.some(x => x.lorry === l.id))),
          check('Site progress within shipped m²', () => appState.siteProgressM2 <= allMr11Rows()[0].shippedM2)
        ];
        case 9: return [
          check('Every row passes validation', () => allMr11Rows().every(r => validationIssues(r).length === 0)),
          check('No change waiting for approval', () => !appState.approvals.some(a => a.status === 'PENDING')),
          check('No high alert open', () => !(alerts || computeAlerts()).some(a => a.severity === 'HIGH' && a.decision !== 'RESOLVED')),
          check('Synced today', () => String(appState.lastSync).startsWith(DEMO_TODAY))
        ];
        default: return [];
      }
    }
    const holes = conds => conds.map(c => `<span class="sf-hole${c.met ? ' is-met' : ''}"></span>`).join('');
    const condList = conds => conds.map(c => `<span class="sf-cond" data-met="${c.met}"><span class="sf-hole${c.met ? ' is-met' : ''}" aria-hidden="true"></span>${esc(c.label)}<span class="sr-only">${c.met ? ': met' : ': not met yet'}</span></span>`).join('');
    const lastMet = {};
    function renderTies(alerts) {
      STEP_TABS.forEach(tab => {
        const box = $(`sf-ties-${tab}`), tip = $(`sf-tip-${tab}`);
        if (!box) return;
        const conds = stepConditions(tab, alerts);
        const met = conds.filter(c => c.met).length;
        const before = lastMet[tab];
        box.innerHTML = holes(conds);
        if (before) [...box.children].forEach((h, i) => { if (conds[i]?.met && before[i] === false) h.classList.add('just-met'); });
        lastMet[tab] = conds.map(c => c.met);
        if (tip) tip.innerHTML = `<b>Gate conditions: ${met} of ${conds.length} met</b>${condList(conds)}`;
      });
    }

    // ---------------- Page head: one pattern on every page ----------------
    function printLabel(tab) { return tab === 12 ? 'Print weekly report' : tab === 15 ? 'Print CEO summary' : 'Print page'; }
    function printFor(tab) { printReport(tab === 12 ? 'weekly' : tab === 15 ? 'ceo' : 'page'); }
    function renderPageHead(alerts) {
      const head = $('sf-pagehead');
      const tab = appState.activeTab;
      const page = PAGES[tab];
      if (!head || !page) return;
      const folds = [...($(`step-panel-${tab}`)?.querySelectorAll('.sf-collapsible') || [])];
      const allShut = folds.length && folds.every(c => c.classList.contains('sf-collapsed'));
      const foldBtn = folds.length > 1 ? `<button type="button" class="sf-btn" onclick="setAllCollapsed(${!allShut})" aria-label="${allShut ? 'Expand' : 'Collapse'} every section on this page">${icon(allShut ? 'chevrons-up-down' : 'chevrons-down-up')}${allShut ? 'Expand all' : 'Collapse all'}</button>` : '';
      const conds = page.step ? stepConditions(tab, alerts) : [];
      const met = conds.filter(c => c.met).length;
      const sub = page.step
        ? `<b>Step ${page.step} of 8</b> · ${esc(page.purpose)}${conds.length ? ` · ${met} of ${conds.length} gate conditions met` : ''}`
        : esc(page.purpose);
      head.innerHTML = `<div class="sf-pagehead-main"><div><h1 id="sf-page-title">${esc(page.name)}</h1><p class="sf-sub">${sub}</p></div>
          <div class="sf-headside">${foldBtn}<button type="button" class="sf-btn" onclick="printFor(${tab})">${icon('printer')}${printLabel(tab)}</button></div></div>
        ${conds.length ? `<div class="sf-conds" aria-label="Gate conditions">${condList(conds)}</div>` : ''}`;
      document.title = `${page.name} · ShellFlow`;
    }

    // ---------------- My Work ----------------
    const DEPT_WORDS = { BD: ['bd'], FINANCE: ['finance'], SHELLPLAN: ['shell plan', 'design'], DESIGN: ['design'], PLANNING: ['planning'], PRODUCTION: ['production'], DISPATCH: ['dispatch', 'logistics', 'site'], ADMIN: ['admin'] };
    function alertIsMine(a) {
      const roles = myRoles();
      if (roles.includes('ADMIN')) return true;
      if (roles.includes('CEO') && a.severity === 'HIGH') return true;
      const dept = String(a.dept || '').toLowerCase();
      return roles.some(r => (DEPT_WORDS[r] || []).some(w => dept.includes(w)));
    }
    function reminderIsMine(r) { const roles = myRoles(); return roles.includes('ADMIN') || roles.includes(r.dept) || (roles.includes('SHELLPLAN') && r.dept === 'DESIGN'); }
    function myWork(alerts) {
      const roles = myRoles();
      const admin = roles.includes('ADMIN');
      const decisions = [];
      if (admin) {
        appState.approvals.filter(a => a.status === 'PENDING').forEach(a => decisions.push({
          title: `${rowLabel(a.row)}: ${a.type === 'DELETE' ? 'delete this row' : `${MR11_FIELD_LABELS[a.field]} from "${a.before}" to "${a.value}"`}`,
          meta: `Asked by ${a.by} · ${a.when}${a.reason ? ` · ${a.reason}` : ''}`,
          actions: [['Approve', `decideApproval(${a.id}, true)`, true], ['Reject', `decideApproval(${a.id}, false)`]]
        }));
        appState.ncaVersions.filter(v => v.status === 'PENDING').forEach(v => decisions.push({
          title: `NCA v${v.version}: ${fmtNum(v.qty)} m² for ${appState.projectName}`,
          meta: `${v.reason || 'No reason given'} · submitted ${fmtDate(v.date)}`,
          actions: [['Approve', `decideNca(${v.version}, true)`, true], ['Reject', `decideNca(${v.version}, false)`], ['Open', 'switchTab(1)']]
        }));
      }
      if (admin || roles.includes('FINANCE')) appState.bankLines.filter(l => l.status === 'OPEN').forEach(l => decisions.push({
        title: `Bank line ${l.ref || l.id}: ${formatUSD(l.amount)}`,
        meta: `${l.source || 'Bank'} · ${fmtDate(l.date) || 'no date'} · match it to a payment line`,
        actions: [['Open Finance', 'switchTab(2)', true]]
      }));
      const mine = alerts.filter(a => a.decision !== 'RESOLVED' && alertIsMine(a)).sort((a, b) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.severity] - { HIGH: 0, MEDIUM: 1, LOW: 2 }[b.severity]));
      const due = allReminders().filter(r => (r.state === 'OVERDUE' || r.state === 'SOON') && reminderIsMine(r));
      const waiting = admin ? [] : appState.approvals.filter(a => a.status === 'PENDING' && roles.some(r => ROLES[r] === a.by));
      return { decisions, mine, due, waiting };
    }
    function workItem({ sev, title, meta, actions }) {
      const buttons = (actions || []).map(([label, run, primary]) => `<button type="button" class="sf-btn sf-btn-sm${primary ? ' sf-primary' : ''}" onclick="${run}">${esc(label)}</button>`).join('');
      return `<li class="sf-item"><span class="sf-sev" data-sev="${sev || ''}" aria-hidden="true"></span><div><strong>${esc(title)}</strong>${meta ? `<div class="sf-meta">${esc(meta)}</div>` : ''}</div><div class="sf-do">${buttons}</div></li>`;
    }
    function workSlab(title, note, items, empty) {
      return `<section class="sf-slab" aria-label="${esc(title)}"><div class="sf-slab-head"><h2>${esc(title)}</h2><span>${esc(note)}</span></div>
        ${items.length ? `<ul class="sf-list">${items.join('')}</ul>` : `<p class="sf-empty">${esc(empty)}</p>`}</section>`;
    }
    function myWorkCount(alerts) {
      const w = myWork(alerts);
      return w.decisions.length + w.mine.filter(a => a.decision === 'OPEN' && a.severity !== 'LOW').length + w.due.filter(r => r.state === 'OVERDUE').length;
    }
    function renderMyWork(alerts) {
      const w = myWork(alerts);
      const high = w.mine.filter(a => a.severity === 'HIGH').length;
      const overdue = w.due.filter(r => r.state === 'OVERDUE').length;
      const decisions = w.decisions.map(d => workItem({ sev: 'DECIDE', ...d }));
      const alertItems = w.mine.slice(0, 40).map(a => workItem({
        sev: a.severity, title: a.message, meta: `${a.severity.toLowerCase()} · for ${a.dept}${a.decision === 'SEEN' ? ' · seen' : ''}`,
        actions: [['Open', `switchTab(${tabAllowed(a.tab) ? a.tab : 10})`, true], ...(a.decision === 'OPEN' ? [['Seen', `decideAlert('${esc(a.id)}', 'SEEN')`]] : []), ['Resolve', `decideAlert('${esc(a.id)}', 'RESOLVED')`]]
      }));
      const dueItems = w.due.map(r => workItem({
        sev: r.state === 'OVERDUE' ? 'HIGH' : 'MEDIUM', title: r.title,
        meta: `${ROLES[r.dept]} · ${r.left < 0 ? `${plural(-r.left, 'day')} overdue` : r.left === 0 ? 'due today' : `due in ${plural(r.left, 'day')}`} · ${fmtDate(r.date)}`,
        actions: [['Done', `doneReminder('${esc(r.id)}')`, true]]
      }));
      const waitingItems = w.waiting.map(a => workItem({ sev: '', title: `${rowLabel(a.row)}: ${a.type === 'DELETE' ? 'delete row' : MR11_FIELD_LABELS[a.field]}`, meta: `Sent ${a.when} · waiting for an administrator`, actions: [['Open', 'switchTab(11)']] }));
      const who = myRoles().map(r => ROLES[r]).join(', ');
      $('mywork-content').innerHTML = `<div class="space-y-6">
          ${workSlab(`Waiting on your decision · ${w.decisions.length}`, who, decisions, 'Nothing is waiting on your decision.')}
          ${workSlab(`Dates due and overdue · ${w.due.length}`, `${overdue} overdue, the rest within ${plural(appState.rules.reminderLeadDays, 'day')}`, dueItems, 'No dates are due for you in the next few days.')}
          ${waitingItems.length ? workSlab(`Sent by you, waiting · ${waitingItems.length}`, 'Changes an administrator still has to decide', waitingItems, '') : ''}
        </div>
        ${workSlab(`Alerts for you · ${w.mine.length}`, `${high} high, highest first`, alertItems, 'No open alerts for your department. Alerts clear themselves when their cause is fixed.')}`;
    }

    // ---------------- Project timeline ----------------
    const TL_MONTHS = ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04'];
    function tlPos(date) {
      if (!isDate(date)) return null;
      const key = date.slice(0, 7);
      const i = TL_MONTHS.indexOf(key);
      if (i < 0) return date < TL_MONTHS[0] ? 0 : 100;
      const [y, m, d] = date.split('-').map(Number);
      const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return ((i + (d - 1) / days) / TL_MONTHS.length) * 100;
    }
    function rowAttention(r, alerts) {
      const flags = [];
      const high = alerts.filter(a => a.decision !== 'RESOLVED' && a.severity === 'HIGH' && a.id.endsWith(`:${r.key}`)).length;
      if (high) flags.push(['high', plural(high, 'high alert')]);
      if (r.paymentOverdue) flags.push(['high', 'Advance overdue']);
      if (!isDate(r.designDate)) flags.push(['warn', 'Design not released']);
      if (!gateFor(r.key).ok && r.producedM2 > r.shippedM2) flags.push(['warn', 'Stock waiting at the gate']);
      return flags;
    }
    function timelineRows(alerts) {
      const region = $('tl-region') ? $('tl-region').value : '';
      const status = $('tl-status') ? $('tl-status').value : '';
      const late = $('tl-late') ? $('tl-late').checked : false;
      return allMr11Rows().map(r => ({ r, flags: rowAttention(r, alerts) }))
        .filter(({ r, flags }) => (!region || regionOf(r) === region) && (!status || r.status === status) && (!late || flags.length));
    }
    function fillTimelineFilters() {
      const reg = $('tl-region'), st = $('tl-status');
      if (reg && reg.options.length === 1) reg.insertAdjacentHTML('beforeend', Object.entries(CEO_REGIONS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join(''));
      if (st) {
        const current = st.value;
        const statuses = [...new Set(allMr11Rows().map(r => r.status))];
        st.innerHTML = `<option value="">All statuses</option>${statuses.map(s => `<option>${esc(s)}</option>`).join('')}`;
        if (statuses.includes(current)) st.value = current;
      }
    }
    function renderTimeline(alerts) {
      alerts = alerts || computeAlerts();
      fillTimelineFilters();
      const list = timelineRows(alerts);
      const nowKey = DEMO_TODAY.slice(0, 7);
      const label = key => { const [y, m] = key.split('-'); return `${MONTH_SHORT[Number(m) - 1]} ${y.slice(2)}`; };
      const head = `<div class="sf-gantt-head">Project</div>${TL_MONTHS.map(k => `<div class="sf-gantt-head${k === nowKey ? ' is-now' : ''}">${label(k)}${k === nowKey ? ` <span>· today ${Number(DEMO_TODAY.slice(8))}</span>` : ''}</div>`).join('')}`;
      const marker = (date, kind, text) => { const x = tlPos(date); return x === null ? '' : `<span class="sf-ms" data-kind="${kind}" style="left:${x}%" title="${esc(text)} · ${esc(fmtDate(date))}" role="img" aria-label="${esc(text)}, ${esc(fmtDate(date))}"></span>`; };
      const now = tlPos(DEMO_TODAY);
      let hasActual = false;
      const rows = list.map(({ r, flags }) => {
        const bars = MONTH_KEYS.map((key, i) => {
          const m2 = r.monthsM2[i] || 0;
          if (!m2) return '';
          const start = tlPos(`${key}-01`);
          const kind = key < nowKey ? 'actual' : 'forecast';
          if (kind === 'actual') hasActual = true;
          return `<span class="sf-bar-seg" data-kind="${kind}" style="left:calc(${start}% + 2px);width:calc(${100 / TL_MONTHS.length}% - 4px)" title="${esc(label(key))}: ${fmtNum(m2, 0)} m² ${kind === 'forecast' ? 'forecast' : 'actual'}">${fmtNum(m2, 0)} m²</span>`;
        }).join('');
        const ms = [
          marker(r.paymentDate, 'pay', 'Advance received'),
          marker(r.shellDate, 'plan', 'Shell plan'),
          isDate(r.designDate) ? marker(r.designDate, 'design', 'Design released') : marker(DEMO_TODAY, 'hold', `Design on hold (${r.designDate})`),
          marker(r.dispatchDate, 'ship', 'First dispatch'),
          marker(r.etd, 'ship', 'Planned departure')
        ].join('');
        const flagHtml = flags.map(([tone, text]) => `<span class="sf-flag" data-tone="${tone}">${esc(text)}</span>`).join(' ');
        return `<div class="sf-gantt-label"><strong title="${esc(r.customerProject.trim())}">${esc(r.customerProject.trim())}</strong><span>${esc(r.projectNo)} · ${esc(r.country)}</span>${flagHtml ? `<div>${flagHtml}</div>` : ''}</div>
          <div class="sf-gantt-lane"><span class="sf-now" style="left:${now}%" aria-hidden="true"></span>${bars}${ms}</div>`;
      }).join('');
      $('tl-gantt').innerHTML = list.length
        ? `<div class="sf-gantt-grid" style="--months:${TL_MONTHS.length}">${head}${rows}</div>`
        : '<p class="sf-empty">No projects match these filters. Clear a filter to see more.</p>';
      $('tl-count').textContent = `${plural(list.length, 'project')} shown`;
      $('tl-legend').innerHTML = [
        '<span class="sf-key"><span class="sf-swatch" data-kind="forecast"></span>Forecast m² by month</span>',
        hasActual ? '<span class="sf-key"><span class="sf-swatch"></span>Actual m²</span>' : '',
        '<span class="sf-key"><span class="sf-ms" data-kind="pay"></span>Advance received</span>',
        '<span class="sf-key"><span class="sf-ms" data-kind="plan"></span>Shell plan</span>',
        '<span class="sf-key"><span class="sf-ms" data-kind="design"></span>Design released</span>',
        '<span class="sf-key"><span class="sf-ms" data-kind="hold"></span>On hold today</span>',
        '<span class="sf-key"><span class="sf-ms" data-kind="ship"></span>Dispatch</span>'
      ].join('');
      const cell = v => (isDate(v) ? fmtDate(v) : v ? `<span style="color:var(--ochre);font-weight:600">${esc(v)}</span>` : '<span style="color:var(--ink-3)">Not yet</span>');
      $('tl-table').innerHTML = `<thead><tr><th>Project</th><th>Advance</th><th>Shell plan</th><th>Design</th><th>Produced</th><th>Dispatch</th><th class="text-right">Forecast m²</th><th>Needs attention</th></tr></thead><tbody>${list.map(({ r, flags }) => `<tr>
        <td><strong>${esc(r.customerProject.trim())}</strong><div style="color:var(--ink-3)">${esc(r.projectNo)}</div></td>
        <td>${cell(r.paymentDate)}</td><td>${cell(r.shellDate)}</td><td>${cell(r.designDate)}</td><td>${cell(r.producedDate)}</td><td>${cell(r.dispatchDate || r.etd)}</td>
        <td class="text-right">${fmtNum(r.monthsM2.reduce((a, b) => a + b, 0), 0)}</td><td>${flags.map(f => esc(f[1])).join(', ') || '<span style="color:var(--ink-3)">Nothing</span>'}</td></tr>`).join('')}</tbody>`;
    }

    // ---------------- Command search (Ctrl K) ----------------
    let cmdItems = [], cmdShown = [], cmdActive = 0, cmdReturnFocus = null;
    function readRecent() { try { return JSON.parse(localStorage.getItem('sf.recent') || '[]'); } catch { return []; } }
    function saveRecent(key) { try { localStorage.setItem('sf.recent', JSON.stringify([key, ...readRecent().filter(k => k !== key)].slice(0, 5))); } catch {} }
    function buildCommandIndex() {
      const items = [];
      const add = (group, iconName, label, hint, run, keywords = '') => items.push({ key: `${group}:${label}`, group, icon: iconName, label, hint, run, hay: `${label} ${hint} ${keywords}`.toLowerCase() });
      MENU_ORDER.forEach(id => { const p = PAGES[id]; if (tabAllowed(id)) add('Pages', p.icon, p.name, p.step ? `Step ${p.step} · ${p.purpose}` : p.purpose, () => switchTab(id), 'page go open'); });
      add('Actions', 'printer', 'Print this page on A4', 'Prints the page you are on', () => printFor(appState.activeTab), 'pdf paper');
      if (tabAllowed(12)) add('Actions', 'file-text', 'Print the weekly report on A4', 'Summary, cash at risk, gate, alerts and lorries', () => printReport('weekly'), 'pdf paper report');
      if (tabAllowed(15)) add('Actions', 'line-chart', 'Print the CEO summary on A4', 'Regions, stages, cash and top risks', () => printReport('ceo'), 'pdf paper executive');
      add('Actions', 'file-spreadsheet', 'Export the MR11 workbook', 'Excel (.xlsx)', () => exportMR11Workbook(), 'download excel xlsx');
      const shown = sel => { const el = document.querySelector(sel); return !!el && !el.classList.contains('hidden'); };
      if (shown('[onclick="resetAllDemoData()"]')) add('Actions', 'rotate-ccw', 'Reset the sample data', 'Puts the prototype back to its starting figures', () => resetAllDemoData(), 'reset demo');
      if (shown('[onclick="downloadStandaloneHTML()"]')) add('Actions', 'download', 'Download this page as one HTML file', 'Works without a server', () => downloadStandaloneHTML(), 'download html offline');
      add('Actions', 'key-round', 'Change my password', '', () => openPasswordModal(), 'security');
      add('Actions', 'log-out', 'Sign out', '', () => signOut(), 'logout');
      allMr11Rows().forEach(r => add('Projects', 'building-2', r.customerProject.trim(), `${r.projectNo} · ${r.country} · ${r.pic} · ${r.status}`, () => {
        switchTab(9);
        if ($('mr11-search')) { $('mr11-search').value = r.projectNo; renderMR11PipelineTab(); }
      }, `${r.buildingStream} ${r.nca} ${r.po}`));
      if (tabAllowed(1)) appState.ncaVersions.forEach(v => add('NCA versions', 'ruler', `NCA v${v.version} · ${fmtNum(v.qty)} m²`, `${v.status.toLowerCase()} · ${v.ref || ''} · ${fmtDate(v.date)}`, () => switchTab(1), 'nca'));
      appState.lorries.forEach(l => add('Lorries', 'truck', `${l.id} · ${l.ref || ''}`, `${l.status} · ${fmtDate(l.date)} · ${rowLabel(l.row)}`, () => switchTab(tabAllowed(7) ? 7 : 9), `lorry ${l.dest}`));
      computeAlerts().filter(a => a.decision !== 'RESOLVED').forEach(a => add('Alerts', 'bell-ring', a.message, `${a.severity.toLowerCase()} · for ${a.dept}`, () => switchTab(tabAllowed(a.tab) ? a.tab : 10), `${a.rule} alert`));
      appState.approvals.filter(a => a.status === 'PENDING').forEach(a => add('Approvals', 'clipboard-check', `${rowLabel(a.row)}: ${a.type === 'DELETE' ? 'delete row' : MR11_FIELD_LABELS[a.field]}`, `Waiting · ${a.by}`, () => switchTab(11), 'approval pending'));
      return items;
    }
    function markMatch(text, tokens) {
      let out = esc(text);
      tokens.forEach(t => { if (t.length < 2) return; const i = out.toLowerCase().indexOf(esc(t)); if (i >= 0) out = `${out.slice(0, i)}<mark>${out.slice(i, i + esc(t).length)}</mark>${out.slice(i + esc(t).length)}`; });
      return out;
    }
    function filterCommands(query) {
      const q = query.trim().toLowerCase();
      if (!q) {
        const recent = readRecent().map(k => cmdItems.find(i => i.key === k)).filter(Boolean).map(i => ({ ...i, group: 'Recent' }));
        return [...recent, ...cmdItems.filter(i => i.group === 'Pages' || i.group === 'Actions')];
      }
      const tokens = q.split(/\s+/).filter(Boolean);
      const order = { Pages: 0, Actions: 1, Projects: 2, 'NCA versions': 3, Lorries: 4, Approvals: 5, Alerts: 6 };
      return cmdItems.filter(i => tokens.every(t => i.hay.includes(t)))
        .map(i => { const l = i.label.toLowerCase(); return { ...i, score: (l.startsWith(q) ? 100 : 0) + (l.split(/[\s·:,]+/).some(w => w.startsWith(tokens[0])) ? 40 : 0) + (l.includes(q) ? 20 : 0) - order[i.group] }; })
        .sort((a, b) => b.score - a.score || order[a.group] - order[b.group])
        .slice(0, 40)
        .sort((a, b) => order[a.group] - order[b.group]);
    }
    function renderCommands() {
      const input = $('sf-cmdk-input');
      const tokens = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      cmdShown = filterCommands(input.value);
      cmdActive = Math.min(cmdActive, Math.max(0, cmdShown.length - 1));
      let group = '';
      $('sf-cmdk-list').innerHTML = cmdShown.length ? cmdShown.map((item, i) => {
        const g = item.group !== group ? `<div class="sf-cmdk-group" role="presentation">${esc(item.group)}</div>` : '';
        group = item.group;
        return `${g}<div class="sf-cmdk-opt" role="option" id="sf-opt-${i}" aria-selected="${i === cmdActive}" onmousemove="setCommandActive(${i})" onclick="runCommand(${i})">${icon(item.icon)}<span>${markMatch(item.label, tokens)}</span><span class="sf-hint">${esc(item.hint)}</span></div>`;
      }).join('') : `<p class="sf-empty">Nothing matches "${esc(input.value)}". Try a project number, a lorry, or a page name.</p>`;
      input.setAttribute('aria-activedescendant', cmdShown.length ? `sf-opt-${cmdActive}` : '');
      refreshIcons();
    }
    function setCommandActive(i) {
      if (i === cmdActive) return;
      const prev = $(`sf-opt-${cmdActive}`), next = $(`sf-opt-${i}`);
      if (prev) prev.setAttribute('aria-selected', 'false');
      if (next) { next.setAttribute('aria-selected', 'true'); next.scrollIntoView({ block: 'nearest' }); }
      cmdActive = i;
      $('sf-cmdk-input').setAttribute('aria-activedescendant', `sf-opt-${i}`);
    }
    function openCommand() {
      if ($('signin-screen') && !$('signin-screen').classList.contains('hidden')) return;
      cmdReturnFocus = document.activeElement;
      cmdItems = buildCommandIndex();
      cmdActive = 0;
      $('sf-cmdk-input').value = '';
      $('sf-cmdk').classList.add('is-open');
      renderCommands();
      $('sf-cmdk-input').focus();
    }
    function closeCommand() {
      $('sf-cmdk').classList.remove('is-open');
      if (cmdReturnFocus && document.contains(cmdReturnFocus)) cmdReturnFocus.focus();
    }
    function runCommand(i) {
      const item = cmdShown[i];
      if (!item) return;
      saveRecent(item.key);
      closeCommand();
      item.run();
    }
    document.addEventListener('keydown', e => {
      const open = $('sf-cmdk')?.classList.contains('is-open');
      const typing = e.target.matches?.('input, textarea, select, [contenteditable="true"]');
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); open ? closeCommand() : openCommand(); return; }
      if (!open && e.key === '/' && !typing) { e.preventDefault(); openCommand(); return; }
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); closeCommand(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setCommandActive(Math.min(cmdShown.length - 1, cmdActive + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCommandActive(Math.max(0, cmdActive - 1)); }
      else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); setCommandActive(0); }
      else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); setCommandActive(cmdShown.length - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runCommand(cmdActive); }
      else if (e.key === 'Tab') { e.preventDefault(); $('sf-cmdk-input').focus(); }
    });
    document.addEventListener('input', e => { if (e.target.id === 'sf-cmdk-input') { cmdActive = 0; renderCommands(); } });

    // ---------------- Print-ready A4 reports ----------------
    function printTable(head, rows, numeric = []) {
      return `<table><thead><tr>${head.map((h, i) => `<th${numeric.includes(i) ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${numeric.includes(i) ? ' class="num"' : ''}>${typeof c === 'number' ? fmtNum(c, Number.isInteger(c) ? 0 : 2) : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    function printShell(title, subtitle, body) {
      const u = typeof currentUser === 'function' ? currentUser() : null;
      const who = (appState.me && appState.me.name) || (u && u.name) || ROLES[appState.role];
      return `<div class="sf-print-cover"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="sf-print-brand"><span class="sf-mark sf-print-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><b>ShellFlow · MR11</b>MFE Phase 2 operations<br>Prepared for ${esc(who)} · ${fmtDate(DEMO_TODAY)}</div></div>
        ${body}<div class="sf-print-foot"><span>ShellFlow MR11 · ${fmtDate(DEMO_TODAY)} · demonstration data</span><span>Figures in m² and US dollars</span></div>`;
    }
    function weeklyPrint() {
      const sheets = reportSheets();
      const rows = allMr11Rows();
      const green = rows.filter(r => gateFor(r.key).green).length;
      const kpis = [['Pipeline m²', fmtNum(rows.reduce((a, r) => a + r.ncaQty, 0), 0)], ['Green / blocked rows', `${green} / ${rows.length - green}`], ['Cash at risk', formatUSD(rows.reduce((a, r) => a + cashAtRisk(r), 0))], ['Open alerts', String(sheets.Alerts.length - 1)]];
      const section = (name, title, numeric) => { const [head, ...body] = sheets[name]; return `<h2>${esc(title)}</h2>${body.length ? printTable(head, body, numeric) : '<p>Nothing to report.</p>'}`; };
      return printShell('MR11 weekly report', `${plural(rows.length, 'project')} · week ending ${fmtDate(DEMO_TODAY)}`,
        `<dl class="sf-print-kpis">${kpis.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        ${section('Pipeline', 'Pipeline by status', [1, 2])}
        ${section('Cash at Risk', 'Cash at risk', [1, 2])}
        ${section('Dispatch Gate', 'Dispatch gate', [])}
        ${section('Reconciliation', '4-way reconciliation', [1, 2, 3, 4])}
        ${section('Lorry Forecast', 'Lorry forecast', [1, 2, 3])}
        ${section('Alerts', 'Open alerts', [])}`);
    }
    function ceoPrint() {
      const rows = allMr11Rows();
      const alerts = computeAlerts().filter(a => a.decision !== 'RESOLVED' && a.severity === 'HIGH');
      const byRegion = Object.entries(CEO_REGIONS).map(([k, name]) => {
        const rs = rows.filter(r => regionOf(r) === k);
        return [name, rs.length, rs.reduce((a, r) => a + r.ncaQty, 0), rs.reduce((a, r) => a + r.producedM2, 0), rs.reduce((a, r) => a + r.shippedM2, 0), Number(rs.reduce((a, r) => a + cashAtRisk(r), 0).toFixed(2))];
      });
      const stages = stageTotals(rows);
      return printShell('CEO summary', `Every MR11 project · ${fmtDate(DEMO_TODAY)}`,
        `<dl class="sf-print-kpis">${[['Projects', rows.length], ['NCA m²', fmtNum(rows.reduce((a, r) => a + r.ncaQty, 0), 0)], ['Shipped m²', fmtNum(stages.Dispatched, 0)], ['Cash at risk', formatUSD(rows.reduce((a, r) => a + cashAtRisk(r), 0))]].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <h2>By region</h2>${printTable(['Region', 'Projects', 'NCA m²', 'Produced m²', 'Shipped m²', 'Cash at risk USD'], byRegion, [1, 2, 3, 4, 5])}
        <h2>Where the m² are</h2>${printTable(Object.keys(stages), [Object.values(stages).map(v => Math.round(v))], Object.keys(stages).map((_, i) => i))}
        <h2>Projects</h2>${printTable(['Project', 'Country', 'Status', 'NCA m²', 'Shipped m²', 'Advance'], rows.map(r => [r.customerProject.trim(), r.country, r.status, r.ncaQty, r.shippedM2, r.advStatus]), [3, 4])}
        <h2>High risks open</h2>${alerts.length ? printTable(['For', 'What'], alerts.map(a => [a.dept, a.message])) : '<p>No high alerts are open.</p>'}`);
    }
    function printReport(kind) {
      if (kind === 'page') { window.print(); return; }
      const root = $('sf-print-root');
      root.innerHTML = kind === 'ceo' ? ceoPrint() : weeklyPrint();
      const done = () => { document.body.classList.remove('sf-printing'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      document.body.classList.add('sf-printing');
      logActivity(`Printed the ${kind === 'ceo' ? 'CEO summary' : 'weekly report'}`);
      window.print();
    }

    // ---------------- Collapsible sections: every boxed section with a heading folds away ----------------
    const COLLAPSE_KEY = 'sf.collapsed';
    const CHEVRON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    let collapsedSet = (() => { try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')); } catch { return new Set(); } })();
    function saveCollapsed() { try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsedSet])); } catch {} }
    function collapseCandidates(panel) {
      const all = [...panel.querySelectorAll('div.bg-white, div.bg-slate-900, .sf-slab, #mr11-card')].filter(el => el.closest('.step-panel') === panel);
      return all.filter(el => !all.some(other => other !== el && other.contains(el)));
    }
    function collapseHead(card) {
      const first = card.firstElementChild;
      if (!first) return null;
      if (/^H[1-4]$/.test(first.tagName)) return first;
      return first.querySelector('h2, h3, h4') ? first : null;
    }
    function enhanceCollapsibles() {
      document.querySelectorAll('main .step-panel').forEach(panel => {
        collapseCandidates(panel).forEach(card => {
          const head = collapseHead(card);
          // Only worth folding when there is real content under the heading
          const body = [...card.children].filter(c => c !== head);
          if (!head || !body.length || body.reduce((n, c) => n + c.querySelectorAll('*').length + 1, 0) < 4) return;
          const heading = head.matches('h1, h2, h3, h4') ? head : head.querySelector('h2, h3, h4');
          // A count in the heading changes over time, so it is not part of the remembered name
          const title = heading.textContent.trim().replace(/\s+/g, ' ').replace(/\s·\s\d+$/, '');
          const key = `${panel.id}|${title}`;
          card.classList.add('sf-collapsible');
          head.classList.add('sf-collapse-head');
          card.dataset.sfKey = key;
          let btn = heading.querySelector(':scope > .sf-collapse-btn');
          if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sf-collapse-btn';
            btn.innerHTML = CHEVRON;
            btn.addEventListener('click', e => { e.stopPropagation(); toggleCollapsed(card); });
            heading.insertBefore(btn, heading.firstChild);
          }
          const shut = collapsedSet.has(key);
          card.classList.toggle('sf-collapsed', shut);
          btn.setAttribute('aria-expanded', String(!shut));
          btn.setAttribute('aria-label', `${shut ? 'Expand' : 'Collapse'}: ${title}`);
          btn.title = shut ? 'Expand' : 'Collapse';
        });
      });
    }
    function toggleCollapsed(card, force) {
      const shut = force === undefined ? !card.classList.contains('sf-collapsed') : force;
      if (shut) collapsedSet.add(card.dataset.sfKey); else collapsedSet.delete(card.dataset.sfKey);
      saveCollapsed();
      enhanceCollapsibles();
      renderPageHead();
    }
    function setAllCollapsed(shut) {
      const panel = $(`step-panel-${appState.activeTab}`);
      if (!panel) return;
      panel.querySelectorAll('.sf-collapsible').forEach(card => { if (shut) collapsedSet.add(card.dataset.sfKey); else collapsedSet.delete(card.dataset.sfKey); });
      saveCollapsed();
      enhanceCollapsibles();
      renderPageHead();
    }
    function toggleMr11Options(force) {
      const open = typeof force === 'boolean' ? force : $('mr11-filters').classList.contains('hidden');
      ['mr11-filters', 'mr11-groups'].forEach(id => $(id).classList.toggle('hidden', !open));
      const btn = $('mr11-options-btn');
      if (btn) { btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Hide filters & columns' : 'Filters & columns'; }
      try { localStorage.setItem('sf.mr11Options', open ? 'open' : 'closed'); } catch {}
    }
    window.addEventListener('DOMContentLoaded', () => { let pref = null; try { pref = localStorage.getItem('sf.mr11Options'); } catch {} if (pref === 'closed') toggleMr11Options(false); });

    // ---------------- Page links: every page has its own address ----------------
    const PAGE_SLUGS = { 1: 'bd-commercial', 2: 'finance', 3: 'design', 4: 'production', 6: 'readiness-gate', 7: 'logistics', 8: 'site', 9: 'mr11', 18: 'my-work', 10: 'alerts', 11: 'approvals', 12: 'reports', 19: 'timeline', 13: 'mobile', 14: 'rules', 15: 'ceo', 16: 'permissions', 17: 'workbooks' };
    function pageFromHash() {
      const slug = location.hash.replace(/^#/, '');
      const hit = Object.entries(PAGE_SLUGS).find(([, s]) => s === slug);
      return hit ? Number(hit[0]) : null;
    }
    // The page asked for in the address is read once, before start-up can change the address
    const START_PAGE = pageFromHash();
    function startPage() { return START_PAGE; }
    let routeReady = false;
    function syncHash(tab) {
      const slug = PAGE_SLUGS[tab];
      if (!routeReady || !slug || location.hash === `#${slug}`) return;
      try { location.hash ? history.pushState(null, '', `#${slug}`) : history.replaceState(null, '', `#${slug}`); } catch {}
    }
    window.addEventListener('popstate', () => { const t = pageFromHash(); if (t && t !== appState.activeTab && tabAllowed(t)) switchTab(t); });
    window.addEventListener('DOMContentLoaded', () => {
      routeReady = true;
      if (START_PAGE && START_PAGE !== appState.activeTab && tabAllowed(START_PAGE)) switchTab(START_PAGE);
      else syncHash(appState.activeTab);
    });

    // ---------------- Called from refreshAll ----------------
    function renderFeatures() {
      const alerts = computeAlerts();
      renderTies(alerts);
      if (appState.activeTab === 18) renderMyWork(alerts);
      if (appState.activeTab === 19) renderTimeline(alerts);
      enhanceCollapsibles();
      renderPageHead(alerts);
      syncHash(appState.activeTab);
      const count = $('sf-mywork-count');
      if (count) { const n = myWorkCount(alerts); count.textContent = n ? String(n) : ''; count.setAttribute('aria-label', `${n} waiting`); }
      // On phones each menu is one scrolling row: keep the open page in view
      if (window.matchMedia && window.matchMedia('(max-width: 639px)').matches) {
        document.querySelectorAll('.sf-steps, .sf-tools').forEach(row => {
          const on = row.querySelector('.step-btn-active');
          if (on) row.scrollLeft += on.getBoundingClientRect().left - row.getBoundingClientRect().left - 16;
        });
      }
    }
    function toggleRibbon(btn) {
      const open = $('sf-ribbon').classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Less' : 'Details';
    }
