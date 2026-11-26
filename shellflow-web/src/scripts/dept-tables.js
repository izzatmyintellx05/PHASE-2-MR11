    // =========================================================================
    // Production & Yard and Logistics & Shipping work as one table each, as the department
    // workbooks did in Phase 1: every project's MR11 lines in one sheet, and only the columns
    // that department keeps. Type straight into a cell; it saves to that project's own record,
    // and MR11, the CEO hub and alerts read it from there. The forms for the project you are on
    // (panels, yard photos, lorries, the shipping form) are still there, folded under the table.
    // =========================================================================
    (function () {
      const COUNTRY_LOCAL = /malaysia|^my$/i;
      const num = v => (v === null || v === undefined || v === '' ? '' : fmtNum(v));
      const TABLES = {
        lineProduction: {
          page: 4, roles: ['PLANNING', 'PRODUCTION'], title: 'Production: all projects',
          hint: 'Planning keeps processed m², Production keeps produced m² and the yard. One row per MR11 line, for every project.',
          cols: [
            { f: 'designM2', label: 'Design m²', type: 'show', value: r => r.designFinal },
            { f: 'processedM2', label: 'Processed m²', type: 'number', def: r => processedOf(r), sum: true },
            { f: 'processedDate', label: 'Processed on', type: 'date', def: r => r.processedDate },
            { f: 'producedM2', label: 'Produced m²', type: 'number', def: r => r.producedM2, sum: true },
            { f: 'producedDate', label: 'Produced on', type: 'date', def: r => r.producedDate },
            { f: 'toProduce', label: 'To produce m²', type: 'show', value: r => Math.max(0, (r.ncaQty || 0) - (r.producedM2 || 0)), sum: true },
            { f: 'yardStatus', label: 'Yard', type: 'select', options: ['Not in yard', 'In yard', 'Packed', 'Ready to dispatch'] },
            { f: 'prodRemarks', label: 'Remarks', type: 'text' }
          ]
        },
        lineDispatch: {
          page: 7, roles: ['DISPATCH'], title: 'Logistics & shipping: all projects',
          hint: 'Dispatch keeps what has left the yard and, for overseas projects, the sailing. One row per MR11 line, for every project.',
          modes: true,
          cols: [
            { f: 'producedM2', label: 'Produced m²', type: 'show', value: r => r.producedM2, sum: true },
            { f: 'shipMode', label: 'Local / Overseas', type: 'select', options: ['Local', 'Overseas'], def: r => modeOf(r) },
            { f: 'shippedM2', label: 'Dispatched m²', type: 'number', def: r => r.shippedM2, sum: true },
            { f: 'dispatchDate', label: 'Dispatched on', type: 'date', def: r => r.dispatchDate },
            { f: 'etd', label: 'ETD', type: 'date', def: r => (/^\d{4}-/.test(r.etd || '') ? r.etd : ''), overseas: true },
            { f: 'atd', label: 'ATD', type: 'date', def: r => (/^\d{4}-/.test(r.atd || '') ? r.atd : ''), overseas: true },
            { f: 'sailedM2', label: 'Sailed m²', type: 'number', def: r => sailedOf(r), sum: true, overseas: true },
            { f: 'pod', label: 'POD', type: 'text', overseas: true },
            { f: 'containers', label: 'Containers', type: 'text', overseas: true },
            { f: 'vessel', label: 'Vessel', type: 'text', overseas: true },
            { f: 'toShip', label: 'To dispatch m²', type: 'show', value: r => Math.max(0, (r.ncaQty || 0) - (r.shippedM2 || 0)), sum: true },
            { f: 'dispRemarks', label: 'Remarks', type: 'text' }
          ]
        }
      };
      const view = { lineProduction: { q: '' }, lineDispatch: { q: '', mode: '' } };
      try { view.lineDispatch.mode = localStorage.getItem('sf.dispatchMode') || ''; } catch {}

      // ---- Whose figure is it: the project you are on keeps its own; the others come from the server ----
      const projectOf = r => (r.isLive ? (window.MR11_ACTIVE_PROJECT || 'P1') : r.key);
      const lineIdOf = r => r._line && r._line.id;
      function ownOf(r, key, f) {
        const id = lineIdOf(r);
        if (!id) return undefined;
        const store = r.isLive ? appState[key] : (typeof window.mr11TrackOf === 'function' ? window.mr11TrackOf(r.key, key) : {});
        const v = store?.[id]?.[f];
        return v === undefined || v === null || v === '' ? undefined : v;
      }
      function modeOf(r) {
        const own = ownOf(r, 'lineDispatch', 'shipMode');
        return own || (COUNTRY_LOCAL.test(String(r.country || '').trim()) ? 'Local' : 'Overseas');
      }

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
        if (o('lineDispatch', 'etd') !== undefined) x.etd = o('lineDispatch', 'etd');
        if (o('lineDispatch', 'atd') !== undefined) x.atd = o('lineDispatch', 'atd');
        if (o('lineDispatch', 'sailedM2') !== undefined) x._ownSailed = o('lineDispatch', 'sailedM2');
        return x;
      }
      window.mr11Lines = (orig => function () { return orig.apply(this, arguments).map(overlay); })(window.mr11Lines);
      window.sailedOf = (orig => r => (r && r._ownSailed !== undefined ? r._ownSailed : orig(r)))(window.sailedOf);

      // ---- The table ----
      const allLines = () => mr11Lines(allMr11Rows().filter(r => r.isLive || r._otherProject)).filter(r => !window.sfInScope || window.sfInScope(r));
      function cell(t, c, r, editable) {
        if (c.type === 'show') return `<td class="sf-dt-num">${num(c.value(r))}</td>`;
        const own = ownOf(r, t.key, c.f);
        const def = c.def ? c.def(r) : '';
        const live = r.isLive;
        const attrs = `data-dt="${t.key}" data-proj="${esc(live ? 'LIVE' : r.key)}" ${live ? `data-id="${esc(lineIdOf(r))}"` : `data-oid="${esc(lineIdOf(r))}"`} data-line="${esc(lineIdOf(r))}" data-f="${c.f}" data-type="${c.type}" aria-label="${esc(c.label)}, ${esc(r.customerProject.trim())} ${esc(r._line.stream || '')} ${esc(r._line.blocks || '')}" ${editable ? '' : 'disabled'}`;
        if (c.type === 'select') {
          const cur = own !== undefined ? own : (def || '');
          return `<td><select ${attrs} class="sf-dt-in">${cur ? '' : '<option value="">—</option>'}${c.options.map(o => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></td>`;
        }
        const value = own !== undefined ? own : '';
        if (c.type === 'text') return `<td><input type="text" maxlength="40" value="${esc(value)}" ${attrs} class="sf-dt-in sf-dt-text"></td>`;
        const place = c.type === 'number' ? num(def) : (def || '');
        return `<td><input type="${c.type}" ${c.type === 'number' ? 'min="0" step="0.01" inputmode="decimal"' : ''} value="${esc(value)}" placeholder="${esc(place)}" ${attrs} class="sf-dt-in ${c.type === 'number' ? 'sf-dt-numin' : ''}"></td>`;
      }
      function render(t, box) {
        const v = view[t.key];
        const editable = can(...t.roles);
        const q = v.q.trim().toLowerCase();
        let rows = allLines();
        const total = rows.length;
        if (t.modes && v.mode) rows = rows.filter(r => modeOf(r) === v.mode);
        if (q) rows = rows.filter(r => [r.customerProject, r.projectNo, r.shortName, r.country, r._line.stream, r._line.blocks, r._line.formwork].some(x => String(x ?? '').toLowerCase().includes(q)));
        const cols = t.cols.filter(c => !(t.modes && v.mode === 'Local' && c.overseas));
        // Rows grouped by project, the project you are on first
        const groups = [];
        rows.forEach(r => { const k = r.isLive ? 'LIVE' : r.key; let g = groups.find(x => x.k === k); if (!g) groups.push(g = { k, rows: [] }); g.rows.push(r); });
        const sums = list => cols.map(c => (c.sum ? list.reduce((a, r) => a + (Number(c.type === 'show' ? c.value(r) : (ownOf(r, t.key, c.f) ?? c.def(r))) || 0), 0) : null));
        const sumCells = s => s.map(x => `<td class="sf-dt-num">${x === null ? '' : fmtNum(x)}</td>`).join('');
        const head = `<tr><th class="sf-dt-stick">Project / line</th><th>Formwork</th><th class="text-right">NCA m²</th>${cols.map(c => `<th class="${c.type === 'number' || c.type === 'show' ? 'text-right' : ''}">${esc(c.label)}</th>`).join('')}</tr>`;
        const body = groups.map(g => {
          const p = g.rows[0];
          const nca = g.rows.reduce((a, r) => a + (r.ncaQty || 0), 0);
          const title = `<tr class="sf-dt-group"><td class="sf-dt-stick"><strong>${esc(p.customerProject.trim())}</strong><span>${esc([p.projectNo, p.country].filter(Boolean).join(' · '))}${p.isLive ? ' · open now' : ''}</span></td><td></td><td class="sf-dt-num">${fmtNum(nca)}</td>${sumCells(sums(g.rows))}</tr>`;
          return title + g.rows.map(r => `<tr class="sf-dt-row"><td class="sf-dt-stick">${esc([r._line.stream, r._line.blocks].filter(Boolean).join(' · ') || 'Line')}</td><td class="sf-dt-fw">${esc(r._line.formwork || r.formworkSystem || '')}</td><td class="sf-dt-num">${fmtNum(r.ncaQty)}</td>${cols.map(c => cell(t, c, r, editable)).join('')}</tr>`).join('');
        }).join('');
        const foot = rows.length ? `<tr class="sf-dt-total"><td class="sf-dt-stick">Total, ${plural(groups.length, 'project')}</td><td></td><td class="sf-dt-num">${fmtNum(rows.reduce((a, r) => a + (r.ncaQty || 0), 0))}</td>${sumCells(sums(rows))}</tr>` : '';
        const modes = t.modes ? `<div class="sf-seg" role="group" aria-label="Local or overseas">${[['', 'All'], ['Local', 'Local'], ['Overseas', 'Overseas']].map(([m, l]) => `<button type="button" data-dt-mode="${m}" aria-pressed="${v.mode === m}">${l}</button>`).join('')}</div>` : '';
        const focused = document.activeElement && box.contains(document.activeElement) && document.activeElement.matches('[data-dt-q]');
        box.innerHTML = `<div class="flex flex-wrap items-start justify-between gap-3">
            <div><h3 class="text-sm font-bold text-slate-900">${esc(t.title)}</h3><p class="text-xs text-slate-500">${esc(t.hint)} Grey figures are worked out from the project until someone types the line's own. Each change saves to that project.</p></div>
            <div class="flex flex-wrap items-center gap-2">${modes}
              <input type="search" data-dt-q="${t.key}" value="${esc(v.q)}" placeholder="Find a project or line" aria-label="Find a project or line" class="sf-dt-search">
              <button type="button" class="sf-btn sf-btn-sm" data-dt-full="${t.key}">Full screen</button></div></div>
          <p class="text-[11px] text-slate-500">${plural(groups.length, 'project')} · ${plural(rows.length, 'line')}${rows.length !== total ? ` of ${total}` : ''}${editable ? '' : ` · ${esc(t.roles.map(k => ROLES[k]).join(' or '))} keeps these figures; you can view them.`}</p>
          <div class="sf-dt-wrap"><table class="sf-dt"><thead>${head}</thead><tbody>${body || `<tr><td colspan="${cols.length + 3}" class="text-slate-500">No line matches.</td></tr>`}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div>`;
        if (focused) { const s = box.querySelector('[data-dt-q]'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
        return true;
      }
      // Line tracking draws this table in place of the one-project tracker on these two pages
      window.renderAllProjectTable = (t, box) => (TABLES[t.key] ? render({ key: t.key, ...TABLES[t.key] }, box) : false);
      const redraw = key => { const box = $(`lt-${key}`); if (box) render({ key, ...TABLES[key] }, box); };

      // ---- The page: the table first, the one-project forms folded underneath ----
      Object.entries(TABLES).forEach(([key, t]) => {
        const panel = $(`step-panel-${t.page}`);
        const box = $(`lt-${key}`);
        if (!panel || !box) return;
        box.classList.add('sf-dt-card');
        const rest = [...panel.children].filter(el => el !== box && !el.matches('.sf-stepguide'));
        const more = document.createElement('details');
        more.className = 'sf-dt-more';
        more.innerHTML = `<summary>${t.page === 4 ? 'Panels, yard photos and planning series' : 'Lorries, shipping form and ETD log'} for the project you are on: <span data-dt-proj></span></summary>`;
        rest.forEach(el => more.appendChild(el));
        panel.append(box, more);
      });

      // ---- Typing in a cell ----
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
        const where = row ? `${row.customerProject.trim()}, ${[row._line.stream, row._line.blocks].filter(Boolean).join(' ')}` : line;
        const label = t.cols.find(c => c.f === f)?.label || f;
        logActivity(`${t.title.split(':')[0]}: ${where} ${label} ${value === null ? 'cleared' : `set to ${value}`}`);
        if (proj === 'LIVE') {
          const store = appState[key] = { ...(appState[key] || {}) };
          store[line] = { ...(store[line] || {}), [f]: value };
          if (value === null) delete store[line][f];
          refreshAll();
          return;
        }
        if (typeof window.mr11SaveOtherTrack !== 'function') return;
        el.classList.add('is-saving');
        await window.mr11SaveOtherTrack(proj, key, line, f, value);
        el.classList.remove('is-saving');
        refreshAll();
      });
      // Enter goes down a row, as in a spreadsheet
      document.addEventListener('keydown', e => {
        const el = e.target;
        if (e.key !== 'Enter' || !el.dataset || !el.dataset.dt || el.tagName === 'SELECT') return;
        e.preventDefault();
        const pick = `[data-dt="${el.dataset.dt}"][data-f="${el.dataset.f}"]:not([disabled])`;
        const at = [...document.querySelectorAll(pick)].indexOf(el) + (e.shiftKey ? -1 : 1);
        el.blur();
        // The table may have been drawn again on blur, so find the cell afresh
        setTimeout(() => { const next = document.querySelectorAll(pick)[at]; if (next && at >= 0) { next.focus(); next.select?.(); } }, 0);
      });
      // Leaving the table brings its totals up to date
      document.addEventListener('focusout', e => {
        const box = e.target.closest && e.target.closest('.sf-dt-card');
        if (!box || !e.target.dataset.dt) return;
        setTimeout(() => { if (!box.contains(document.activeElement)) redraw(box.id.replace(/^lt-/, '')); }, 0);
      });
      document.addEventListener('input', e => {
        const s = e.target.closest && e.target.closest('[data-dt-q]');
        if (!s) return;
        view[s.dataset.dtQ].q = s.value;
        redraw(s.dataset.dtQ);
      });
      document.addEventListener('click', e => {
        const m = e.target.closest && e.target.closest('[data-dt-mode]');
        if (m) {
          view.lineDispatch.mode = m.dataset.dtMode;
          try { localStorage.setItem('sf.dispatchMode', m.dataset.dtMode); } catch {}
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
