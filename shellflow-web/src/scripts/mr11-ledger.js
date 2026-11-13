
    // =========================================================================
    // MR11 LEDGER: the Phase 1 master table, with its Options panel (column groups,
    // department highlight, multi-value filters), rates strip and filter summary,
    // plus sorting, a totals row, a frozen project column, row spacing, quick views,
    // saved views, export and copy of the current view, A4 landscape printing and
    // a details panel for each project. These replace the simpler table functions
    // in app.js; the columns themselves still come from mr11Columns().
    // =========================================================================
    const LEDGER = {
      panel: loadPref('mr11.panelOpen', true),
      rates: loadPref('mr11.ratesOpen', false),
      freeze: loadPref('mr11.freeze', true),
      density: loadPref('mr11.density', 'comfortable'),
      sort: loadPref('mr11.sort', null),
      highlights: loadPref('mr11.highlights', []),
      sections: loadPref('mr11.panelSections', { view: true, highlight: true, filters: true }),
      openFilters: new Set(),
      drawerKey: null
    };
    const LEDGER_ICONS = {
      chevron: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
      up: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
      down: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
      both: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 9 5-5 5 5M7 15l5 5 5-5"/></svg>',
      x: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
      check: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
    };
    // Quick views: the questions people ask of MR11 most often, one click each
    const MR11_QUICK = [
      ['', 'All lines', () => true],
      ['attention', 'Needs attention', (r, alerts) => rowAttention(r, alerts).length > 0],
      ['payment', 'Waiting on advance', r => !/CLEARED/.test(r.advStatus)],
      ['design', 'Design not released', r => !/^\d{4}-\d{2}-\d{2}$/.test(r.designDate)],
      ['ready', 'Ready to dispatch', r => gateFor(r.key).ok && r.producedM2 > r.shippedM2],
      ['shipped', 'Dispatched', r => r.shippedM2 > 0]
    ];
    // Columns whose figures add up in the totals row (rates, prices and dates do not)
    const SUMMABLE = /^(NCA Qty|Actual Received|Total Quantity|Total m²|Total USD|Total Processed|Actual Produced|Actual Del|Sailed|Pending Delivery)|\((m²|USD)\)$/;
    const textBox = document.createElement('div');
    const htmlText = html => { textBox.innerHTML = html; return (textBox.textContent || '').replace(/\s+/g, ' ').trim(); };
    const colKey = c => htmlText(c.head.replace(/<span[^>]*>(ACTUAL|F'CAST)<\/span>/g, ''));
    const asNumber = text => { const t = String(text).replace(/[$,\s]|m²/g, ''); return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null; };
    function ledgerFilterValues(field) { const v = appState.mr11Filters[field]; return Array.isArray(v) ? v : v ? [v] : []; }
    function ledgerSearchTerm() { return ($('mr11-search')?.value || '').trim().toLowerCase(); }

    // Search covers more of the row, filters take several values each, then the quick view
    function mr11ShownRows(allRows, alerts) {
      const term = ledgerSearchTerm();
      const quick = MR11_QUICK.find(q => q[0] === (appState.mr11Quick || '')) || MR11_QUICK[0];
      alerts = alerts || computeAlerts();
      return allRows.filter(r => {
        if (term && ![r.customerProject, r.projectNo, r.buildingStream, r.shortName, r.pic, r.country, r.nca, r.po].some(v => String(v ?? '').toLowerCase().includes(term))) return false;
        if (!quick[2](r, alerts)) return false;
        return MR11_FILTERS.every(([field]) => { const vals = ledgerFilterValues(field); return !vals.length || vals.includes(mr11FilterValue(r, field)); });
      });
    }
    // One place builds what the table, export, copy and print all show: the same rows in the same order
    function ledgerView(allRows) {
      const alerts = computeAlerts();
      const cols = mr11Columns().filter(c => !appState.hiddenGroups.includes(c.group));
      const projects = allRows || allMr11Rows();
      const all = typeof mr11Lines === 'function' ? mr11Lines(projects) : projects;
      let rows = mr11ShownRows(all, alerts);
      const sort = LEDGER.sort;
      const sortCol = sort && cols.find(c => colKey(c) === sort.key);
      if (sortCol) {
        const value = r => { const t = htmlText(sortCol.cell(r, all.indexOf(r))); const n = asNumber(t); return n === null ? t.toLowerCase() : n; };
        const keyed = rows.map(r => [value(r), r]);
        keyed.sort((a, b) => {
          const [x, y] = [a[0], b[0]];
          const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
          return sort.dir === 'desc' ? -cmp : cmp;
        });
        rows = keyed.map(k => k[1]);
      }
      return { cols, rows, all, alerts, projects };
    }
    const lineKeyOf = r => r.lineKey || r.key;
    // Identifiers stay text in Excel, so a project number is never turned into a sum or loses a zero
    const TEXT_COLUMNS = /^(Project No|Short Name|PO|NCA|Stream|Incoterms)$/;
    function ledgerCellValue(c, r, all) {
      const key = colKey(c);
      if (key === 'Row') return r.isLive ? `${all.indexOf(r) + 1} LIVE` : all.indexOf(r) + 1;
      const text = htmlText(c.cell(r, all.indexOf(r)));
      if (TEXT_COLUMNS.test(key)) return text;
      const n = asNumber(text);
      return n === null ? text : n;
    }
    function ledgerTotals(cols, rows, all) {
      return cols.map((c, i) => {
        const key = colKey(c);
        if (i === 0) return 'Total';
        if (key === 'Customer & Project Name') return plural(rows.length, 'line');
        if (!SUMMABLE.test(key)) return '';
        let money = false, sum = 0, any = false;
        rows.forEach(r => {
          const text = htmlText(c.cell(r, all.indexOf(r)));
          if (text.includes('$')) money = true;
          const n = asNumber(text);
          if (n !== null) { sum += n; any = true; }
        });
        return any ? (money ? formatUSD(sum) : fmtNum(sum, 2)) : '';
      });
    }
    const markTerm = (html, term) => {
      if (!term) return html;
      const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      return html.replace(/>([^<]+)</g, (m, text) => `>${text.replace(re, x => `<mark>${x}</mark>`)}<`);
    };

    function renderMr11Table(allRows) {
      const { cols, rows, all, projects } = ledgerView(allRows);
      const term = ledgerSearchTerm();
      // As in Phase 1, Shell Plan and Design cells merge across lines of the same project, stream and fill
      const spans = new Map();
      if (!LEDGER.sort) {
        for (let i = 0; i < rows.length;) {
          const a = rows[i];
          let span = 1;
          while (i + span < rows.length && rows[i + span].key === a.key && rowStreamNo(rows[i + span]) === rowStreamNo(a) && (FORMWORK_FILL[rows[i + span].formworkSystem] || '') === (FORMWORK_FILL[a.formworkSystem] || '')) span++;
          spans.set(i, span);
          for (let j = 1; j < span; j++) spans.set(i + j, 0);
          i += span;
        }
      }
      const lit = group => LEDGER.highlights.some(d => (MR11_GROUPS[group].depts || []).includes(d));
      const groupRow = [];
      cols.forEach(c => {
        const last = groupRow[groupRow.length - 1];
        if (last && last.group === c.group) last.span++; else groupRow.push({ group: c.group, span: 1 });
      });
      const sortIcon = key => (LEDGER.sort && LEDGER.sort.key === key ? (LEDGER.sort.dir === 'asc' ? LEDGER_ICONS.up : LEDGER_ICONS.down) : LEDGER_ICONS.both);
      const ariaSort = key => (LEDGER.sort && LEDGER.sort.key === key ? (LEDGER.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      $('mr11-head').innerHTML = `<tr class="sf-mr11-groups">${groupRow.map(g => `<th colspan="${g.span}" class="${lit(g.group) ? 'hl-col' : ''}">${esc(MR11_GROUPS[g.group].label)}</th>`).join('')}</tr>
        <tr class="sf-mr11-cols">${cols.map(c => { const key = colKey(c); return `<th class="${lit(c.group) ? 'hl-col' : ''}" aria-sort="${ariaSort(key)}"><button type="button" class="sf-th-btn${LEDGER.sort && LEDGER.sort.key === key ? ' is-sorted' : ''}" data-mr11="sort" data-key="${esc(key)}" title="Sort by ${esc(key)}"><span>${c.head}</span><span class="sf-sort">${sortIcon(key)}</span></button></th>`; }).join('')}</tr>`;
      $('mr11-master-tbody').innerHTML = rows.map((r, rowIndex) => {
        const fill = FORMWORK_FILL[r.formworkSystem];
        const rowBg = r.isLive ? `${fill ? '' : 'bg-sky-50'} font-semibold` : `${fill ? '' : 'bg-white'}`;
        const position = all.indexOf(r);
        const cells = cols.map(c => {
          const key = colKey(c);
          let html = key === 'Customer & Project Name'
            ? `<td class="font-bold"><button type="button" class="sf-row-open" data-mr11="open" data-key="${esc(lineKeyOf(r))}" title="Open the details of ${esc(r.customerProject.trim())}">${markTerm(`>${esc(r.customerProject)}<`, term).slice(1, -1)}</button></td>`
            : c.cell(r, position);
          if (term && ['Project No', 'Short Name', 'Stream / Building / Block', 'PIC', 'Countries'].includes(key)) html = markTerm(html, term);
          if (key === 'Row' && r.isLive) html = html.replace('1 (LIVE)', `${position + 1} · LIVE`);
          if (lit(c.group)) html = html.replace('<td class="', '<td class="hl-col ');
          if (c.group === 'design' && spans.has(rowIndex)) {
            const span = spans.get(rowIndex);
            if (span === 0) return '';
            if (span > 1) html = html.replace(/^<td/, `<td rowspan="${span}" data-merged`);
          }
          return html;
        }).join('');
        return `<tr class="${rowBg}${LEDGER.drawerKey === lineKeyOf(r) ? ' is-open' : ''}" data-row="${esc(lineKeyOf(r))}" style="color:${PRODUCT_FONT[r.product] || '#000000'};${fill ? `background:${fill};` : ''}">${cells}</tr>`;
      }).join('') || `<tr><td colspan="${cols.length}" class="sf-ledger-empty">No contracts match. Clear the search, a filter or the quick view to see more.</td></tr>`;
      const table = $('mr11-head').closest('table');
      let foot = table.querySelector('tfoot');
      if (!foot) { foot = document.createElement('tfoot'); table.appendChild(foot); }
      foot.innerHTML = rows.length ? `<tr>${ledgerTotals(cols, rows, all).map(v => `<td>${esc(v)}</td>`).join('')}</tr>` : '';
      table.classList.toggle('is-frozen', !!LEDGER.freeze);
      table.classList.toggle('is-compact', LEDGER.density === 'compact');
      requestAnimationFrame(() => { const first = table.querySelector('thead tr.sf-mr11-cols th'); if (first && first.offsetWidth) table.style.setProperty('--mr11-col1', `${first.offsetWidth}px`); });
      if ($('mr11-count')) $('mr11-count').textContent = `${rows.length === all.length ? plural(all.length, 'line') : `${rows.length} of ${plural(all.length, 'line')}`} · ${plural(projects.length, 'contract')}`;
      renderMr11Tools(all, rows);
      if (LEDGER.drawerKey && !$('mr11-drawer').hidden) renderMr11Drawer();
    }

    function renderMr11Tools(allRows, shown) {
      const alerts = computeAlerts();
      // Tool row states
      const press = (id, on) => { const b = $(id); if (b) b.setAttribute('aria-pressed', String(!!on)); };
      press('mr11-panel-btn', LEDGER.panel);
      press('mr11-rates-btn', LEDGER.rates);
      press('mr11-freeze-btn', LEDGER.freeze);
      press('mr11-density-btn', LEDGER.density === 'compact');
      $('mr11-rates').classList.toggle('hidden', !LEDGER.rates);
      $('mr11-side')?.classList.toggle('hidden', !LEDGER.panel);
      if ($('mr11-panel-btn')) $('mr11-panel-btn').textContent = LEDGER.panel ? 'Hide tools' : 'Show tools';
      $('mr11-search-clear').classList.toggle('hidden', !ledgerSearchTerm());
      $('mr11-zoom-label').textContent = `${appState.mr11Zoom}%`;
      $('mr11-table-wrap').style.zoom = `${appState.mr11Zoom}%`;
      $('mr11-sync-label').textContent = `Last rebuilt ${appState.lastSync}`;
      // Quick views, each with how many contracts it holds
      $('mr11-quick').innerHTML = MR11_QUICK.map(([key, label, test]) => {
        const n = allRows.filter(r => test(r, alerts)).length;
        return `<button type="button" class="sf-chip" data-mr11="quick" data-quick="${key}" aria-pressed="${(appState.mr11Quick || '') === key}">${esc(label)} <span>${n}</span></button>`;
      }).join('');
      // What is narrowing the table, in words, with one way to undo it all
      const parts = [];
      const quick = MR11_QUICK.find(q => q[0] === (appState.mr11Quick || ''));
      if (quick && quick[0]) parts.push(`Quick view: ${quick[1]}`);
      if (ledgerSearchTerm()) parts.push(`Search: "${$('mr11-search').value.trim()}"`);
      MR11_FILTERS.forEach(([field, label]) => { const v = ledgerFilterValues(field); if (v.length) parts.push(`${label}: ${v.join(', ')}`); });
      if (appState.hiddenGroups.length) parts.push(`${plural(appState.hiddenGroups.length, 'column group')} hidden`);
      if (LEDGER.sort) parts.push(`Sorted by ${LEDGER.sort.key}, ${LEDGER.sort.dir === 'asc' ? 'lowest first' : 'highest first'}`);
      const summary = $('mr11-summary');
      summary.classList.toggle('hidden', !parts.length);
      summary.innerHTML = parts.length ? `<span><b>Showing ${shown.length} of ${plural(allRows.length, 'line')}</b> · ${parts.map(esc).join(' · ')}</span><button type="button" class="sf-btn sf-btn-sm" data-mr11="reset-view">Clear all</button>` : '';
      // Deleted rows (administrators), as before
      const deleted = referenceMR11Projects.filter(r => r.deleted);
      $('mr11-deleted-btn').textContent = `Deleted rows (${deleted.length})`;
      $('mr11-deleted-btn').classList.toggle('hidden', !isAdmin());
      $('mr11-deleted').classList.toggle('hidden', !appState.deletedOpen || !isAdmin());
      $('mr11-deleted').innerHTML = deleted.length ? deleted.map(r => {
        const entry = appState.approvals.find(a => a.type === 'DELETE' && a.row === r.key && a.status === 'APPROVED');
        return `<div class="sf-ledger-deleted"><span><strong>${esc(r.customerProject)}</strong> · ${esc(r.buildingStream)}${entry ? ` · deleted by ${esc(entry.by)}, ${esc(entry.when)}` : ''}</span>${entry ? `<button type="button" class="sf-btn sf-btn-sm sf-primary" onclick="undoApproval(${entry.id})">Restore</button>` : ''}</div>`;
      }).join('') : '<p class="sf-empty">No rows have been deleted.</p>';
      renderMr11Views();
      renderMr11Panel(allRows);
    }

    // ---- The Options panel, as in Phase 1: View, Highlight columns, Filters ----
    function renderMr11Panel(allRows) {
      const panel = $('mr11-panel');
      if (!panel || !LEDGER.panel) return;
      const section = (id, title, badge, body, action = '') => {
        const open = LEDGER.sections[id] !== false;
        return `<section class="sf-pp-sec"><div class="sf-pp-head"><button type="button" class="sf-pp-toggle" data-mr11="section" data-id="${id}" aria-expanded="${open}"><span class="sf-pp-chev">${LEDGER_ICONS.chevron}</span><span class="sf-pp-title">${title}</span>${badge}</button>${action}</div>${open ? `<div class="sf-pp-body">${body}</div>` : ''}</section>`;
      };
      const cols = mr11Columns();
      const groups = Object.entries(MR11_GROUPS).filter(([, g]) => !g.locked);
      const hidden = appState.hiddenGroups.filter(k => MR11_GROUPS[k] && !MR11_GROUPS[k].locked).length;
      const view = `<div class="sf-pp-row"><span class="sf-pp-label">Column groups</span><span><button type="button" class="sf-pp-link" data-mr11="groups" data-to="all">Show all</button><button type="button" class="sf-pp-link" data-mr11="groups" data-to="none">Hide all</button></span></div>
        <ul class="sf-pp-list">${groups.map(([key, g]) => `<li><label class="sf-pp-check"><input type="checkbox" ${appState.hiddenGroups.includes(key) ? '' : 'checked'} onchange="toggleMr11Group('${key}', this.checked)"><span>${esc(g.short)}</span><em>${cols.filter(c => c.group === key).length}</em></label></li>`).join('')}</ul>
        <p class="sf-pp-note">Project name, number, short name and stream always stay visible.</p>`;
      const highlight = `<div class="sf-pp-chips">${DEPT_KEYS.map(k => `<button type="button" class="sf-chip" data-mr11="hl" data-dept="${k}" aria-pressed="${LEDGER.highlights.includes(k)}">${esc(ROLES[k])}</button>`).join('')}</div><p class="sf-pp-note">Outlines each chosen department's columns so you can see what they own.</p>`;
      const active = MR11_FILTERS.reduce((n, [f]) => n + (ledgerFilterValues(f).length ? 1 : 0), 0);
      const filters = MR11_FILTERS.map(([field, label]) => {
        const counts = {};
        allRows.forEach(r => { const v = mr11FilterValue(r, field); counts[v] = (counts[v] || 0) + 1; });
        const values = Object.keys(counts).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const selected = ledgerFilterValues(field);
        const open = LEDGER.openFilters.has(field) || selected.length > 0 && !LEDGER.openFilters.has(`!${field}`);
        const list = values.map(v => { const on = selected.includes(v); return `<li data-value-text="${esc(v.toLowerCase())}"><button type="button" class="sf-pp-value" role="checkbox" aria-checked="${on}" data-mr11="fv" data-field="${field}" data-value="${esc(v)}"><span class="sf-pp-box">${on ? LEDGER_ICONS.check : ''}</span><span class="sf-pp-text">${esc(v)}</span><em>${counts[v]}</em></button></li>`; }).join('');
        return `<div class="sf-pp-filter${open ? ' is-open' : ''}"><button type="button" class="sf-pp-ftoggle" data-mr11="fopen" data-field="${field}" aria-expanded="${open}"><span class="sf-pp-chev">${LEDGER_ICONS.chevron}</span><span>${esc(label)}</span>${selected.length ? `<em class="sf-pp-badge">${selected.length}</em>` : ''}</button>
          ${!open && selected.length ? `<p class="sf-pp-picked">${esc(selected.join(', '))}</p>` : ''}
          ${open ? `${values.length > 8 ? `<input type="search" class="sf-pp-find" placeholder="Find ${esc(label.toLowerCase())}" aria-label="Find a ${esc(label.toLowerCase())}" oninput="filterMr11Values(this)">` : ''}<ul class="sf-pp-values">${list}</ul>` : ''}</div>`;
      }).join('');
      panel.innerHTML = `<div class="sf-pp-top"><span>View, highlight &amp; filters</span></div>
        ${section('view', 'View', hidden ? `<em class="sf-pp-badge is-warn">${hidden} hidden</em>` : '', view)}
        ${section('highlight', 'Highlight columns', LEDGER.highlights.length ? `<em class="sf-pp-badge">${LEDGER.highlights.length}</em>` : '', highlight)}
        ${section('filters', 'Filters', active ? `<em class="sf-pp-badge">${active}</em>` : '', filters, active ? '<button type="button" class="sf-pp-link is-danger" data-mr11="fclear">Clear</button>' : '')}`;
    }
    function filterMr11Values(input) {
      const q = input.value.trim().toLowerCase();
      input.parentElement.querySelectorAll('.sf-pp-values li').forEach(li => { li.hidden = !!q && !li.dataset.valueText.includes(q); });
    }

    // ---- Saved views: a named set of filters, columns, highlight, sort and spacing ----
    function readViews() { return loadPref('mr11.views', []); }
    function currentViewState() {
      return { filters: JSON.parse(JSON.stringify(appState.mr11Filters)), hiddenGroups: [...appState.hiddenGroups], highlights: [...LEDGER.highlights], sort: LEDGER.sort, density: LEDGER.density, freeze: LEDGER.freeze, quick: appState.mr11Quick || '', search: $('mr11-search')?.value || '' };
    }
    function applyViewState(v) {
      appState.mr11Filters = v.filters || {};
      appState.hiddenGroups = v.hiddenGroups || [];
      LEDGER.highlights = v.highlights || [];
      LEDGER.sort = v.sort || null;
      LEDGER.density = v.density || 'comfortable';
      LEDGER.freeze = v.freeze !== false;
      appState.mr11Quick = v.quick || '';
      if ($('mr11-search')) $('mr11-search').value = v.search || '';
      ['hiddenGroups', 'highlights', 'sort', 'density', 'freeze'].forEach(k => savePref(k === 'hiddenGroups' ? 'mr11.hiddenGroups' : `mr11.${k}`, k === 'hiddenGroups' ? appState.hiddenGroups : LEDGER[k]));
      renderMR11PipelineTab();
    }
    function renderMr11Views() {
      const box = $('mr11-views');
      if (!box) return;
      const views = readViews();
      box.innerHTML = `${views.length ? views.map((v, i) => `<div class="sf-menu-row"><button type="button" data-mr11="view-apply" data-index="${i}">${esc(v.name)}</button><button type="button" class="sf-menu-del" data-mr11="view-delete" data-index="${i}" aria-label="Delete the view ${esc(v.name)}">${LEDGER_ICONS.x}</button></div>`).join('') : '<p class="sf-menu-note">No saved views yet.</p>'}
        <button type="button" data-mr11="view-save">Save the current view…</button>
        <button type="button" data-mr11="reset-view">Back to the full table</button>`;
    }

    // ---- Export, copy and print exactly what is on screen ----
    function ledgerGrid() {
      const { cols, rows, all } = ledgerView();
      const head = cols.map(colKey);
      const body = rows.map(r => cols.map(c => ledgerCellValue(c, r, all)));
      const totals = ledgerTotals(cols, rows, all);
      return { head, body, totals, count: rows.length };
    }
    function exportMr11View() {
      if (typeof XLSX === 'undefined') { notify('The Excel library is still loading. Please try again in a moment.', 'error'); return; }
      const { head, body, totals, count } = ledgerGrid();
      const ws = XLSX.utils.aoa_to_sheet([head, ...body, totals.map(t => asNumber(t) ?? t)]);
      ws['!cols'] = head.map(h => ({ wch: Math.min(40, Math.max(10, h.length + 2)) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'MR11 view');
      XLSX.writeFile(wb, `MR11_view_${DEMO_TODAY}.xlsx`);
      logActivity(`Exported the MR11 view (${plural(count, 'contract')})`);
      notify(`Exported ${plural(count, 'contract')} with the columns on screen.`, 'success');
    }
    function copyMr11View() {
      const { head, body, count } = ledgerGrid();
      const tsv = [head, ...body].map(row => row.map(v => String(v).replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
      const done = () => notify(`Copied ${plural(count, 'contract')}. Paste into Excel.`, 'success');
      const fallback = () => { const ta = document.createElement('textarea'); ta.value = tsv; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch { notify('Copy is not available in this browser window.', 'error'); } ta.remove(); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(tsv).then(done, fallback); else fallback();
    }
    function printMr11View() {
      document.body.classList.add('sf-print-ledger');
      const done = () => { document.body.classList.remove('sf-print-ledger'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      window.print();
    }

    // ---- The details panel for one project ----
    function openMr11Drawer(key) {
      LEDGER.drawerKey = key;
      const drawer = $('mr11-drawer');
      drawer.hidden = false;
      renderMr11Drawer();
      drawer.querySelector('.sf-drawer-close')?.focus();
      document.querySelectorAll('#mr11-master-tbody tr').forEach(tr => tr.classList.toggle('is-open', tr.dataset.row === key));
    }
    function closeMr11Drawer() {
      const key = LEDGER.drawerKey;
      LEDGER.drawerKey = null;
      $('mr11-drawer').hidden = true;
      document.querySelectorAll('#mr11-master-tbody tr.is-open').forEach(tr => tr.classList.remove('is-open'));
      document.querySelector(`#mr11-master-tbody [data-mr11="open"][data-key="${CSS.escape(key || '')}"]`)?.focus();
    }
    function renderMr11Drawer() {
      const { rows, all, alerts } = ledgerView();
      const r = all.find(x => lineKeyOf(x) === LEDGER.drawerKey);
      if (!r) { closeMr11Drawer(); return; }
      const cols = mr11Columns();
      const at = rows.indexOf(r);
      const gate = gateFor(r.key);
      const flags = rowAttention(r, alerts);
      const comments = (appState.comments[r.key] || []).length;
      const sections = Object.entries(MR11_GROUPS).map(([key, g]) => {
        const items = cols.filter(c => c.group === key && colKey(c) !== 'Row').map(c => [colKey(c), htmlText(c.cell(r, all.indexOf(r)))]);
        return items.length ? `<section><h3>${esc(g.short || 'Project')}</h3><dl>${items.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v || '—')}</dd></div>`).join('')}</dl></section>` : '';
      }).join('');
      $('mr11-drawer').innerHTML = `<div class="sf-drawer-head">
          <div><h2 id="mr11-drawer-title">${esc(r.customerProject.trim())}</h2><p>${esc(r.projectNo)} · ${esc(r.country)} · ${esc(r.pic)} · ${esc(r.status)}</p>${r._line ? `<p class="sf-drawer-line">Line ${r._lineIndex + 1} of ${r._lineCount}: ${esc(r.buildingStream)} · ${esc(r.formworkSystem)} · ${fmtNum(r.ncaQty)} m²</p><p class="sf-drawer-line">Selling price ${formatUSD(r.basePrice)} / m²${r._ownPrice ? ' (own)' : ''}, final ${formatUSD(r.finalPrice)} / m² · ${esc(r.paymentTerm)}${r._ownTerms ? ' (own)' : ''} · line value ${formatUSD(r._value || 0)}</p>` : ''}</div>
          <button type="button" class="sf-drawer-close" data-mr11="drawer-close" aria-label="Close the project details">${LEDGER_ICONS.x}</button>
        </div>
        <div class="sf-drawer-status">
          <span class="sf-pill" data-tone="${gate.ok ? 'ok' : 'warn'}">${gate.nonPhysical ? 'No dispatch gate (design only)' : gate.green ? 'Dispatch gate met' : gate.released ? 'Released by an administrator' : `Gate not met: ${esc(gate.failed.join(', '))}`}</span>
          ${flags.map(([tone, text]) => `<span class="sf-pill" data-tone="${tone === 'high' ? 'high' : 'warn'}">${esc(text)}</span>`).join('')}
        </div>
        <div class="sf-drawer-actions">
          <button type="button" class="sf-btn sf-btn-sm" onclick="openComments('${esc(r.key)}')">Comments${comments ? ` (${comments})` : ''}</button>
          <button type="button" class="sf-btn sf-btn-sm" data-mr11="drawer-timeline">Open in the timeline</button>
          <span class="sf-drawer-nav"><button type="button" class="sf-btn sf-btn-sm" data-mr11="drawer-nav" data-dir="-1" ${at <= 0 ? 'disabled' : ''} aria-label="Previous contract">Previous</button><button type="button" class="sf-btn sf-btn-sm" data-mr11="drawer-nav" data-dir="1" ${at < 0 || at >= rows.length - 1 ? 'disabled' : ''} aria-label="Next contract">Next</button></span>
        </div>
        <div class="sf-drawer-body">${sections}</div>`;
    }

    // ---- Every control in the ledger and its details panel goes through one listener ----
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-mr11]');
      if (!t || !t.closest('#mr11-card, #mr11-drawer')) return;
      const act = t.dataset.mr11;
      const menu = t.closest('details');
      if (menu && t.tagName !== 'SUMMARY') menu.removeAttribute('open');
      const rerender = () => renderMR11PipelineTab();
      switch (act) {
        case 'panel': LEDGER.panel = !LEDGER.panel; savePref('mr11.panelOpen', LEDGER.panel); rerender(); break;
        case 'rates': LEDGER.rates = !LEDGER.rates; savePref('mr11.ratesOpen', LEDGER.rates); renderMarket(); rerender(); break;
        case 'freeze': LEDGER.freeze = !LEDGER.freeze; savePref('mr11.freeze', LEDGER.freeze); rerender(); break;
        case 'density': LEDGER.density = LEDGER.density === 'compact' ? 'comfortable' : 'compact'; savePref('mr11.density', LEDGER.density); rerender(); break;
        case 'search-clear': $('mr11-search').value = ''; $('mr11-search').focus(); rerender(); break;
        case 'section': LEDGER.sections[t.dataset.id] = LEDGER.sections[t.dataset.id] === false; savePref('mr11.panelSections', LEDGER.sections); rerender(); break;
        case 'groups': appState.hiddenGroups = t.dataset.to === 'none' ? Object.keys(MR11_GROUPS).filter(k => !MR11_GROUPS[k].locked) : []; savePref('mr11.hiddenGroups', appState.hiddenGroups); rerender(); break;
        case 'hl': { const d = t.dataset.dept; LEDGER.highlights = LEDGER.highlights.includes(d) ? LEDGER.highlights.filter(x => x !== d) : [...LEDGER.highlights, d]; savePref('mr11.highlights', LEDGER.highlights); rerender(); break; }
        case 'fopen': { const f = t.dataset.field; const open = t.getAttribute('aria-expanded') === 'true'; LEDGER.openFilters.delete(f); LEDGER.openFilters.delete(`!${f}`); LEDGER.openFilters.add(open ? `!${f}` : f); rerender(); break; }
        case 'fv': { const f = t.dataset.field, v = t.dataset.value; const vals = ledgerFilterValues(f); appState.mr11Filters[f] = vals.includes(v) ? vals.filter(x => x !== v) : [...vals, v]; LEDGER.openFilters.add(f); rerender(); break; }
        case 'fclear': appState.mr11Filters = {}; rerender(); break;
        case 'quick': appState.mr11Quick = t.dataset.quick; rerender(); break;
        case 'reset-view': appState.mr11Filters = {}; appState.mr11Quick = ''; LEDGER.sort = null; savePref('mr11.sort', null); appState.hiddenGroups = []; savePref('mr11.hiddenGroups', []); $('mr11-search').value = ''; rerender(); break;
        case 'sort': {
          const key = t.dataset.key;
          const s = LEDGER.sort;
          LEDGER.sort = !s || s.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null;
          savePref('mr11.sort', LEDGER.sort);
          rerender();
          break;
        }
        case 'open': openMr11Drawer(t.dataset.key); break;
        case 'drawer-close': closeMr11Drawer(); break;
        case 'drawer-timeline': closeMr11Drawer(); switchTab(19); break;
        case 'drawer-nav': {
          const { rows } = ledgerView();
          const at = rows.findIndex(r => lineKeyOf(r) === LEDGER.drawerKey) + Number(t.dataset.dir);
          if (rows[at]) openMr11Drawer(lineKeyOf(rows[at]));
          break;
        }
        case 'view-save':
          askModal({ title: 'Save this view', desc: 'Saves the search, filters, quick view, column groups, highlight, sort and row spacing under a name, in this browser.', label: 'View name', confirm: 'Save view', min: 2,
            onOk: name => { const views = readViews().filter(v => v.name !== name.trim()); views.push({ name: name.trim(), state: currentViewState() }); savePref('mr11.views', views); renderMr11Views(); notify(`Saved the view "${name.trim()}".`, 'success'); } });
          break;
        case 'view-apply': { const v = readViews()[Number(t.dataset.index)]; if (v) { applyViewState(v.state); notify(`Showing the view "${v.name}".`, 'info'); } break; }
        case 'view-delete': { const views = readViews(); const v = views.splice(Number(t.dataset.index), 1)[0]; savePref('mr11.views', views); renderMr11Views(); if (v) notify(`Deleted the view "${v.name}".`, 'info'); break; }
        case 'export-view': exportMr11View(); break;
        case 'copy-view': copyMr11View(); break;
        case 'print-view': printMr11View(); break;
        default: break;
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && LEDGER.drawerKey && !$('sf-cmdk')?.classList.contains('is-open') && !document.querySelector('#reason-modal.flex, #comment-modal.flex')) { e.preventDefault(); closeMr11Drawer(); }
    });
    // Zoom moves in steps of 5%, between 20% and 135%, as in Phase 1
    function setMr11Zoom(step) {
      appState.mr11Zoom = step === 0 ? 100 : Math.min(135, Math.max(20, appState.mr11Zoom + step));
      savePref('mr11.zoom', appState.mr11Zoom);
      renderMR11PipelineTab();
    }
    function setMr11Filter(field, value) { appState.mr11Filters[field] = value ? [value] : []; renderMR11PipelineTab(); }
    function clearMr11Filters() { appState.mr11Filters = {}; appState.mr11Quick = ''; if ($('mr11-search')) $('mr11-search').value = ''; renderMR11PipelineTab(); }
