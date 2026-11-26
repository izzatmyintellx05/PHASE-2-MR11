    // =========================================================================
    // Production & Yard and Logistics & Shipping work as one sheet each, with the columns of
    // the department workbooks (production.xlsx, dispatchlocal.xlsx, dispatchoversea.xlsx):
    // every project's MR11 lines, typed into straight away. Each change saves to that
    // project's own record, and MR11 reads it from there. Logistics has two sheets, Local
    // projects and Overseas projects. The forms for the project you are on are folded below.
    // =========================================================================
    (function () {
      const COUNTRY_LOCAL = /malaysia|^my$/i;
      const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const num = v => (v === null || v === undefined || v === '' ? '' : fmtNum(v));
      const n0 = v => Number(v) || 0;
      const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
      const view = { month: thisMonth(), q: { lineProduction: '', lineDispatch: '' }, mode: 'Local' };
      try { view.mode = localStorage.getItem('sf.dispatchMode') === 'Overseas' ? 'Overseas' : 'Local'; } catch {}
      // The days of the month shown, as field names d20261201 ..
      const daysOf = month => {
        const [y, m] = month.split('-').map(Number);
        const count = new Date(y, m, 0).getDate();
        return Array.from({ length: count }, (_, i) => ({ f: `d${y}${String(m).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`, label: `${i + 1}-${MON[m - 1]}-${y}`, iso: `${month}-${String(i + 1).padStart(2, '0')}` }));
      };
      // The five months up to the one shown, as field names np202608 ..
      const monthsBack = (month, count) => {
        const [y, m] = month.split('-').map(Number);
        return Array.from({ length: count }, (_, i) => { const d = new Date(y, m - 1 - (count - 1 - i), 1); return { ym: `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`, mon: d.getMonth() === 8 ? 'Sept' : MON[d.getMonth()] }; });
      };

      // ---- Whose figure is it: the project you are on keeps its own; the others come from the server ----
      const lineIdOf = r => r._line && r._line.id;
      function ownOf(r, key, f) {
        const id = lineIdOf(r);
        if (!id) return undefined;
        const store = r.isLive ? appState[key] : (typeof window.mr11TrackOf === 'function' ? window.mr11TrackOf(r.key, key) : {});
        const v = store?.[id]?.[f];
        return v === undefined || v === null || v === '' ? undefined : v;
      }
      const entryOf = (r, key) => (r.isLive ? appState[key] : (typeof window.mr11TrackOf === 'function' ? window.mr11TrackOf(r.key, key) : {}))?.[lineIdOf(r)] || {};
      const modeOf = r => ownOf(r, 'lineDispatch', 'shipMode') || (COUNTRY_LOCAL.test(String(r.country || '').trim()) ? 'Local' : 'Overseas');
      const monthSum = (r, key, month) => { const e = entryOf(r, key); return daysOf(month).reduce((a, d) => a + n0(e[d.f]), 0); };
      const ETD_FIELDS = ['etd7', 'etd6', 'etd5', 'etd4', 'etd3', 'etd2', 'etd1', 'etaPol', 'etd'];

      // ---- Every line carries its own figures, also another project's edited from here ----
      function overlay(r) {
        if (!r || !r._line || !(r.isLive || r._otherProject)) return r;
        const o = (k, f) => ownOf(r, k, f);
        const x = { ...r };
        if (o('lineProduction', 'processedM2') !== undefined) x._ownProcessed = o('lineProduction', 'processedM2');
        if (o('lineProduction', 'processedDate') !== undefined) x.processedDate = o('lineProduction', 'processedDate');
        if (o('lineProduction', 'producedM2') !== undefined) x.producedM2 = o('lineProduction', 'producedM2');
        if (o('lineProduction', 'producedDate') !== undefined) x.producedDate = o('lineProduction', 'producedDate');
        if (o('lineDispatch', 'shippedM2') !== undefined) { x.shippedM2 = o('lineDispatch', 'shippedM2'); x.pendingM2 = Math.max(0, (x.ncaQty || 0) - x.shippedM2); }
        if (o('lineDispatch', 'dispatchDate') !== undefined) x.dispatchDate = o('lineDispatch', 'dispatchDate');
        const etd = ETD_FIELDS.map(f => o('lineDispatch', f)).find(v => v !== undefined);
        if (etd !== undefined) x.etd = etd;
        if (o('lineDispatch', 'atd') !== undefined) x.atd = o('lineDispatch', 'atd');
        if (o('lineDispatch', 'sailedM2') !== undefined) x._ownSailed = o('lineDispatch', 'sailedM2');
        if (o('lineDispatch', 'incoterms') !== undefined) x.incoterms = o('lineDispatch', 'incoterms');
        return x;
      }
      window.mr11Lines = (orig => function () { return orig.apply(this, arguments).map(overlay); })(window.mr11Lines);
      window.sailedOf = (orig => r => (r && r._ownSailed !== undefined ? r._ownSailed : orig(r)))(window.sailedOf);

      // ---- The workbook columns ----
      // type: show (worked out), number, date, text, select; first: only on a project's first line
      function identity(key) {
        const other = key === 'lineProduction' ? null : 'lineProduction';
        return [
          { label: 'Project Shortname', type: 'show', text: true, first: true, stick: true, value: r => r.shortName || r.projectNo || '' },
          { label: 'Project Name', type: 'show', text: true, first: true, wide: true, value: r => r.customerProject.trim() },
          { label: 'Stream', type: 'show', text: true, value: r => r._line.stream || '' },
          { label: 'Building Name', type: 'show', text: true, value: r => r._line.blocks || '' },
          { f: 'bType', label: 'Building Type', type: 'text', def: r => (other ? ownOf(r, other, 'bType') : '') || '' },
          { f: 'track', label: 'Output Tracking', type: 'select', options: ['Normal', 'Spec', 'Refurbished'], def: r => (other ? ownOf(r, other, 'track') : '') || '' },
          { label: 'Product type', type: 'show', text: true, value: r => r._line.product || r.product || '' },
          { label: 'Formwork Type', type: 'show', text: true, value: r => r._line.formwork || r.formworkSystem || '' },
          { label: 'Total Area m2', type: 'show', value: r => r.ncaQty, sum: true },
          { f: key === 'lineProduction' ? 'prodRemarks' : 'dispRemarks', label: 'Remarks', type: 'text' }
        ];
      }
      function productionCols() {
        const days = daysOf(view.month);
        const back = monthsBack(view.month, 5);
        return [...identity('lineProduction'),
          { label: 'Grand Total M2', type: 'show', value: r => r.ncaQty, sum: true },
          { f: 'producedM2', label: 'Cumulative Produced (Project)', type: 'number', def: r => r.producedM2, sum: true },
          { label: 'Current Produced (Month)', type: 'show', value: r => monthSum(r, 'lineProduction', view.month), sum: true },
          ...days.map(d => ({ f: d.f, label: d.label, type: 'number', day: true, sum: true })),
          ...back.map(b => ({ f: `np${b.ym}`, label: `(${b.mon}) Not Produced`, type: 'number', sum: true })),
          { label: 'Total not Produced', type: 'show', value: r => back.reduce((a, b) => a + n0(ownOf(r, 'lineProduction', `np${b.ym}`)), 0), sum: true },
          { f: 'npReason', label: 'Reason (Not Produced)', type: 'text' },
          { f: 'processedM2', label: 'Processed m² (Planning)', type: 'number', def: r => processedOf(r), sum: true },
          { f: 'processedDate', label: 'Processed on', type: 'date', def: r => r.processedDate }
        ];
      }
      const modeCol = { f: 'shipMode', label: 'Local / Overseas', type: 'select', options: ['Local', 'Overseas'], def: r => modeOf(r) };
      function localCols() {
        return [...identity('lineDispatch'),
          { label: 'Produced Total M2', type: 'show', value: r => r.producedM2, sum: true },
          { f: 'shippedM2', label: 'Cumulative Dispatched (Project)', type: 'number', def: r => r.shippedM2, sum: true },
          { label: 'Dispatched Previous Months', type: 'show', value: r => Math.max(0, n0(r.shippedM2) - monthSum(r, 'lineDispatch', view.month)), sum: true },
          { label: 'Current Dispatched (Month)', type: 'show', value: r => monthSum(r, 'lineDispatch', view.month), sum: true },
          ...daysOf(view.month).map(d => ({ f: d.f, label: d.label, type: 'number', day: true, sum: true })),
          modeCol];
      }
      function overseasCols() {
        const dm = `dm${view.month.replace('-', '')}`;
        return [...identity('lineDispatch'),
          { label: 'Grand Total M2', type: 'show', value: r => r.ncaQty, sum: true },
          { f: 'shippedM2', label: 'Cumulative Dispatched (Project)', type: 'number', def: r => r.shippedM2, sum: true },
          { label: 'Dispatched Previous Months', type: 'show', value: r => Math.max(0, n0(r.shippedM2) - n0(ownOf(r, 'lineDispatch', dm))), sum: true },
          { f: dm, label: 'Current Dispatched (Month)', type: 'number', sum: true },
          { f: 'scpValue', label: 'SCP Value MYR', type: 'number', sum: true },
          { f: 'pod', label: 'POD', type: 'text' },
          { f: 'portPct', label: 'Delivery to Port (%)', type: 'number' },
          { f: 'etaPol', label: 'ETA POL', type: 'date' },
          ...['', ' 2', ' 3', ' 4', ' 5', ' 6', ' 7'].map((s, i) => ({ f: `etd${i + 1}`, label: `Rev${s} ETD`, type: 'date' })),
          { f: 'atd', label: 'ATD', type: 'date', def: r => (/^\d{4}-/.test(r.atd || '') ? r.atd : '') },
          { f: 'sailedM2', label: 'Formwork Quantity Sailed (m2)', type: 'number', def: r => sailedOf(r), sum: true },
          { f: 'scpSailed', label: 'SCP Value Sailed MYR', type: 'number', sum: true },
          { f: 'incoterms', label: 'Incoterms', type: 'text', def: r => r.incoterms || '' },
          { f: 'ctr40', label: '40ft/ctr', type: 'number', sum: true },
          { f: 'ctr20', label: '20ft/ctr', type: 'number', sum: true },
          { f: 'vessel', label: 'Feeder Vessel / Mother Vessel', type: 'text' },
          { f: 'totalCost', label: 'Total Cost', type: 'number', sum: true },
          { label: 'Per M2', type: 'show', value: r => { const s = n0(ownOf(r, 'lineDispatch', 'sailedM2') ?? sailedOf(r)); const c = n0(ownOf(r, 'lineDispatch', 'totalCost')); return s > 0 && c > 0 ? c / s : ''; } },
          modeCol];
      }
      const TABLES = {
        lineProduction: { page: 4, roles: ['PLANNING', 'PRODUCTION'], title: 'Production', cols: productionCols },
        lineDispatch: { page: 7, roles: ['DISPATCH'], title: 'Dispatch', modes: true, cols: () => (view.mode === 'Overseas' ? overseasCols() : localCols()) }
      };

      // ---- The sheet ----
      const allLines = () => mr11Lines(allMr11Rows().filter(r => r.isLive || r._otherProject)).filter(r => !window.sfInScope || window.sfInScope(r));
      const valueOf = (t, c, r) => (c.type === 'show' ? c.value(r) : (ownOf(r, t.key, c.f) ?? (c.def ? c.def(r) : '')));
      function cell(t, c, r, editable, first) {
        const cls = [c.stick ? 'sf-dt-stick' : '', c.wide ? 'sf-dt-wide' : ''].filter(Boolean).join(' ');
        if (c.type === 'show') {
          if (c.first && !first) return `<td class="${cls}"></td>`;
          const v = c.value(r);
          return c.text ? `<td class="sf-dt-txt ${cls}" title="${esc(v)}">${esc(v)}</td>` : `<td class="sf-dt-num ${cls}">${num(v)}</td>`;
        }
        const own = ownOf(r, t.key, c.f);
        const def = c.def ? c.def(r) : '';
        const live = r.isLive;
        const attrs = `data-dt="${t.key}" data-proj="${esc(live ? 'LIVE' : r.key)}" ${live ? `data-id="${esc(lineIdOf(r))}"` : `data-oid="${esc(lineIdOf(r))}"`} data-line="${esc(lineIdOf(r))}" data-f="${c.f}" data-type="${c.type}" aria-label="${esc(c.label)}, ${esc(r.customerProject.trim())} ${esc(r._line.stream || '')} ${esc(r._line.blocks || '')}" ${editable ? '' : 'disabled'}`;
        if (c.type === 'select') {
          const cur = own !== undefined ? own : (def || '');
          return `<td><select ${attrs} class="sf-dt-in">${cur ? '' : '<option value="">—</option>'}${c.options.map(o => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></td>`;
        }
        const value = own !== undefined ? own : '';
        if (c.type === 'text') return `<td><input type="text" maxlength="40" value="${esc(value)}" placeholder="${esc(def || '')}" ${attrs} class="sf-dt-in sf-dt-text"></td>`;
        const place = c.type === 'number' ? num(def) : (def || '');
        return `<td><input type="${c.type}" ${c.type === 'number' ? 'min="0" step="0.01" inputmode="decimal"' : ''} value="${esc(value)}" placeholder="${esc(place)}" ${attrs} class="sf-dt-in ${c.type === 'number' ? 'sf-dt-numin' : ''} ${c.day ? 'sf-dt-day' : ''}"></td>`;
      }
      function render(t, box) {
        if (view.autoMonth !== false && view.month !== thisMonth()) view.month = thisMonth();
        const editable = can(...t.roles);
        const q = (view.q[t.key] || '').trim().toLowerCase();
        let rows = allLines();
        const counts = { Local: rows.filter(r => modeOf(r) === 'Local').length, Overseas: rows.filter(r => modeOf(r) === 'Overseas').length };
        if (t.modes) rows = rows.filter(r => modeOf(r) === view.mode);
        if (q) rows = rows.filter(r => [r.customerProject, r.projectNo, r.shortName, r.country, r._line.stream, r._line.blocks, r._line.formwork].some(x => String(x ?? '').toLowerCase().includes(q)));
        const cols = t.cols();
        const projects = new Set(rows.map(r => (r.isLive ? 'LIVE' : r.key)));
        const sum = (c, list) => list.reduce((a, r) => a + n0(valueOf(t, c, r)), 0);
        const head = `<tr>${cols.map(c => `<th class="${[c.stick ? 'sf-dt-stick' : '', c.type === 'number' || (c.type === 'show' && !c.text) ? 'text-right' : '', c.day ? 'sf-dt-dayh' : ''].join(' ')}">${esc(c.label)}</th>`).join('')}</tr>`;
        let lastProject = null;
        const body = rows.map(r => {
          const k = r.isLive ? 'LIVE' : r.key;
          const first = k !== lastProject;
          lastProject = k;
          return `<tr class="sf-dt-row ${first ? 'sf-dt-first' : ''}">${cols.map(c => cell(t, c, r, editable, first)).join('')}</tr>`;
        }).join('');
        const foot = rows.length ? `<tr class="sf-dt-total">${cols.map((c, i) => (i === 0 ? `<td class="sf-dt-stick">Total</td>` : `<td class="sf-dt-num">${c.sum ? fmtNum(sum(c, rows)) : ''}</td>`)).join('')}</tr>` : '';
        const modes = t.modes ? `<div class="sf-seg sf-dt-modes" role="tablist" aria-label="Local or overseas projects">${['Local', 'Overseas'].map(m => `<button type="button" role="tab" data-dt-mode="${m}" aria-selected="${view.mode === m}" aria-pressed="${view.mode === m}">${m} projects <span class="sf-dt-count">${counts[m]}</span></button>`).join('')}</div>` : '';
        const keep = document.activeElement && box.contains(document.activeElement) && document.activeElement.matches('[data-dt-q]');
        const title = t.modes ? `${view.mode} projects` : t.title;
        box.innerHTML = `${modes}<div class="flex flex-wrap items-center justify-between gap-3">
            <div><h3 class="text-sm font-bold text-slate-900">${esc(title)}</h3><p class="text-xs text-slate-500">${projects.size} ${projects.size === 1 ? 'project' : 'projects'} · ${plural(rows.length, 'line')}${editable ? '' : ' · View only'} · Grey = estimate</p></div>
            <div class="flex flex-wrap items-center gap-2">
              <label class="sf-dt-month">Month <input type="month" data-dt-month value="${esc(view.month)}"></label>
              <input type="search" data-dt-q="${t.key}" value="${esc(view.q[t.key] || '')}" placeholder="Find a project" aria-label="Find a project" class="sf-dt-search">
              <button type="button" class="sf-btn sf-btn-sm" data-dt-full="${t.key}">Full screen</button></div></div>
          <div class="sf-dt-wrap"><table class="sf-dt"><thead>${head}</thead><tbody>${body || `<tr><td colspan="${cols.length}" class="text-slate-500 sf-dt-txt">No ${t.modes ? view.mode.toLowerCase() + ' ' : ''}project${q ? ' matches' : ' yet'}.</td></tr>`}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div>`;
        if (keep) { const s = box.querySelector('[data-dt-q]'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
        return true;
      }
      // Line tracking draws this sheet in place of the one-project tracker on these two pages
      window.renderAllProjectTable = (t, box) => (TABLES[t.key] ? render({ key: t.key, ...TABLES[t.key] }, box) : false);
      const redraw = key => { const box = $(`lt-${key}`); if (box) render({ key, ...TABLES[key] }, box); };

      // ---- The page: the sheet first, the one-project forms folded underneath ----
      Object.entries(TABLES).forEach(([key, t]) => {
        const panel = $(`step-panel-${t.page}`);
        const box = $(`lt-${key}`);
        if (!panel || !box) return;
        box.classList.add('sf-dt-card');
        const rest = [...panel.children].filter(el => el !== box && !el.matches('.sf-stepguide'));
        const more = document.createElement('details');
        more.className = 'sf-dt-more';
        more.innerHTML = `<summary>${t.page === 4 ? 'More: panels, yard photos, planning' : 'More: lorries, shipping form, ETD log'} (<span data-dt-proj></span>)</summary>`;
        rest.forEach(el => more.appendChild(el));
        panel.append(box, more);
      });

      // ---- Saving a change: daily and monthly figures also move the running total ----
      async function save(proj, key, line, patch) {
        if (proj === 'LIVE') {
          const store = appState[key] = { ...(appState[key] || {}) };
          const entry = { ...(store[line] || {}) };
          Object.entries(patch).forEach(([f, v]) => { if (v === null) delete entry[f]; else entry[f] = v; });
          store[line] = entry;
          refreshAll();
          return;
        }
        if (typeof window.mr11SaveOtherTrack !== 'function') return;
        await window.mr11SaveOtherTrack(proj, key, line, patch);
        refreshAll();
      }
      document.addEventListener('change', async e => {
        const el = e.target;
        if (!el.dataset || !el.dataset.dt) return;
        const key = el.dataset.dt, t = TABLES[key];
        if (!t || !guard(t.roles, 'change these figures')) { refreshAll(); return; }
        const { proj, line, f, type } = el.dataset;
        let value;
        if (type === 'number') { const n = parseFloat(el.value); value = Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : null; }
        else value = el.value.trim().slice(0, 40) || null;
        const row = allLines().find(r => (r.isLive ? 'LIVE' : r.key) === proj && lineIdOf(r) === line);
        if (!row) return;
        const patch = { [f]: value };
        // A day's or a month's figure adds to the cumulative total (and a day sets the latest date)
        if (/^(d\d{8}|dm\d{6})$/.test(f)) {
          const total = key === 'lineProduction' ? 'producedM2' : 'shippedM2';
          const before = n0(ownOf(row, key, f));
          const base = ownOf(row, key, total) ?? n0(row[total]);
          patch[total] = Math.max(0, Math.round((base + n0(value) - before) * 100) / 100);
          if (f[0] === 'd' && f[1] !== 'm') {
            const entry = { ...entryOf(row, key), [f]: value };
            const latest = Object.keys(entry).filter(k => /^d\d{8}$/.test(k) && n0(entry[k]) > 0).sort().pop();
            patch[key === 'lineProduction' ? 'producedDate' : 'dispatchDate'] = latest ? `${latest.slice(1, 5)}-${latest.slice(5, 7)}-${latest.slice(7, 9)}` : null;
          }
        }
        const label = t.cols().find(c => c.f === f)?.label || f;
        logActivity(`${t.title}: ${row.customerProject.trim()}, ${[row._line.stream, row._line.blocks].filter(Boolean).join(' ')} ${label} ${value === null ? 'cleared' : `set to ${value}`}`);
        el.classList.add('is-saving');
        await save(proj, key, line, patch);
        el.classList.remove('is-saving');
      });
      // Enter goes down a row, as in a spreadsheet
      document.addEventListener('keydown', e => {
        const el = e.target;
        if (e.key !== 'Enter' || !el.dataset || !el.dataset.dt || el.tagName === 'SELECT') return;
        e.preventDefault();
        const pick = `[data-dt="${el.dataset.dt}"][data-f="${el.dataset.f}"]:not([disabled])`;
        const at = [...document.querySelectorAll(pick)].indexOf(el) + (e.shiftKey ? -1 : 1);
        el.blur();
        // The sheet may have been drawn again on blur, so find the cell afresh
        setTimeout(() => { const next = document.querySelectorAll(pick)[at]; if (next && at >= 0) { next.focus(); next.select?.(); } }, 0);
      });
      // Leaving the sheet brings its totals up to date
      document.addEventListener('focusout', e => {
        const box = e.target.closest && e.target.closest('.sf-dt-card');
        if (!box || !e.target.dataset.dt) return;
        setTimeout(() => { if (!box.contains(document.activeElement)) redraw(box.id.replace(/^lt-/, '')); }, 0);
      });
      document.addEventListener('input', e => {
        const s = e.target.closest && e.target.closest('[data-dt-q]');
        if (!s) return;
        view.q[s.dataset.dtQ] = s.value;
        redraw(s.dataset.dtQ);
      });
      document.addEventListener('change', e => {
        const m = e.target.closest && e.target.closest('[data-dt-month]');
        if (!m || !/^\d{4}-\d{2}$/.test(m.value)) return;
        view.month = m.value;
        view.autoMonth = m.value === thisMonth();
        Object.keys(TABLES).forEach(redraw);
      });
      // The sheet follows the calendar: when a new month starts, its dates replace the old ones
      setInterval(() => {
        if (view.autoMonth !== false && view.month !== thisMonth()) { view.month = thisMonth(); Object.keys(TABLES).forEach(redraw); }
      }, 60000);
      document.addEventListener('click', e => {
        const m = e.target.closest && e.target.closest('[data-dt-mode]');
        if (m) {
          view.mode = m.dataset.dtMode;
          try { localStorage.setItem('sf.dispatchMode', view.mode); } catch {}
          redraw('lineDispatch');
          return;
        }
        const fb = e.target.closest && e.target.closest('[data-dt-full]');
        if (fb) {
          const box = $(`lt-${fb.dataset.dtFull}`);
          if (document.fullscreenElement) document.exitFullscreen?.();
          else box?.requestFullscreen?.().catch(() => notify('This browser would not open full screen.', 'error'));
        }
      });
      document.addEventListener('fullscreenchange', () => {
        document.querySelectorAll('[data-dt-full]').forEach(b => { b.textContent = document.fullscreenElement && document.fullscreenElement.contains(b) ? 'Exit full screen' : 'Full screen'; });
      });
      window.refreshAll = (orig => function () {
        const out = orig.apply(this, arguments);
        document.querySelectorAll('[data-dt-proj]').forEach(s => { s.textContent = appState.projectName || ''; });
        return out;
      })(window.refreshAll);
    })();
