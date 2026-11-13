    // =========================================================================
    // Each MR11 line is tracked on its own across the steps. Every department keeps its
    // figures per line (stream, blocks and formwork type) on its own page; a line nobody has
    // entered yet shows its share of the project figure as a grey hint and uses that. MR11,
    // the workbooks and the readiness view read each line's own figures.
    // =========================================================================
    const LINE_TRACKS = [
      { key: 'lineFinance', page: 2, roles: ['FINANCE'], title: 'Payments by MR11 line', hint: 'Each line has its own advance from its own price and terms. Tick a line when its advance is in.',
        cols: [
          { f: 'advancePaid', label: 'Advance received', type: 'check', def: r => /CLEARED/.test(r.advStatus) },
          { f: 'paidDate', label: 'Date received', type: 'date', def: r => r.paymentDate }
        ],
        info: r => `${esc(r.paymentTerm)} · advance due ${formatUSD((r._value || 0) * (r.advancePct || 0) / 100)}` },
      { key: 'lineDesign', page: 3, roles: ['SHELLPLAN', 'DESIGN'], title: 'Design by MR11 line', hint: 'Release design line by line; a line counts as designed when its status is Completed.',
        cols: [
          { f: 'designStatus', label: 'Design status', type: 'select', options: ['Not started', 'Ongoing', 'Completed'], def: r => r.designStatus },
          { f: 'designM2', label: 'Design m²', type: 'number', def: r => r.designFinal },
          { f: 'designDate', label: 'Released on', type: 'date', def: r => (/^\d{4}-/.test(r.designDate) ? r.designDate : '') }
        ] },
      { key: 'lineProduction', page: 4, roles: ['PLANNING', 'PRODUCTION'], title: 'Production by MR11 line', hint: 'Processed and produced m² for each line.',
        cols: [
          { f: 'processedM2', label: 'Processed m²', type: 'number', def: r => processedOf(r) },
          { f: 'producedM2', label: 'Produced m²', type: 'number', def: r => r.producedM2 },
          { f: 'producedDate', label: 'Produced on', type: 'date', def: r => r.producedDate }
        ] },
      { key: 'lineDispatch', page: 7, roles: ['DISPATCH'], title: 'Dispatch by MR11 line', hint: 'Shipped m² and the dispatch date for each line.',
        cols: [
          { f: 'shippedM2', label: 'Shipped m²', type: 'number', def: r => r.shippedM2 },
          { f: 'dispatchDate', label: 'Dispatched on', type: 'date', def: r => r.dispatchDate }
        ] },
      { key: 'lineSite', page: 8, roles: ['DISPATCH'], title: 'Site receiving by MR11 line', hint: 'What the site has received for each line.',
        cols: [
          { f: 'receivedM2', label: 'Received m²', type: 'number', def: r => (appState.siteProgressM2 || 0) * (r._share ?? 1) },
          { f: 'receivedDate', label: 'Received on', type: 'date', def: () => '' }
        ] }
    ];
    LINE_TRACKS.forEach(t => { if (!appState[t.key] || typeof appState[t.key] !== 'object') appState[t.key] = {}; });
    const lineOwn = (key, id, f) => { const v = appState[key]?.[id]?.[f]; return v === undefined || v === null || v === '' ? undefined : v; };

    // ---- A line's own figures replace its share of the project's ----
    const splitLines = window.mr11Lines;
    function trackLine(r) {
      if (!r || !r.isLive || !r._line) return r;
      const id = r._line.id;
      const o = (k, f) => lineOwn(k, id, f);
      const x = { ...r, _split: { designFinal: r.designFinal, producedM2: r.producedM2, shippedM2: r.shippedM2 } };
      if (o('lineDesign', 'designStatus') !== undefined) x.designStatus = o('lineDesign', 'designStatus');
      if (o('lineDesign', 'designM2') !== undefined) x.designFinal = o('lineDesign', 'designM2');
      if (o('lineDesign', 'designDate') !== undefined) x.designDate = o('lineDesign', 'designDate');
      if (o('lineProduction', 'processedM2') !== undefined) x._ownProcessed = o('lineProduction', 'processedM2');
      if (o('lineProduction', 'producedM2') !== undefined) x.producedM2 = o('lineProduction', 'producedM2');
      if (o('lineProduction', 'producedDate') !== undefined) x.producedDate = o('lineProduction', 'producedDate');
      if (o('lineDispatch', 'shippedM2') !== undefined) { x.shippedM2 = o('lineDispatch', 'shippedM2'); x.pendingM2 = Math.max(0, x.ncaQty - x.shippedM2); }
      if (o('lineDispatch', 'dispatchDate') !== undefined) x.dispatchDate = o('lineDispatch', 'dispatchDate');
      if (o('lineFinance', 'paidDate') !== undefined) x.paymentDate = o('lineFinance', 'paidDate');
      const paid = o('lineFinance', 'advancePaid');
      if (paid !== undefined) {
        x._ownPaid = !!paid;
        x.advStatus = paid ? `CLEARED (${fmtNum(x.advancePct || 0, 0)}%)` : 'HOLD (Awaiting Advance)';
      }
      if (o('lineSite', 'receivedM2') !== undefined) x._receivedM2 = o('lineSite', 'receivedM2');
      return x;
    }
    window.mr11Lines = function () { return splitLines.apply(this, arguments).map(trackLine); };
    window.processedOf = (orig => r => (r && r._ownProcessed !== undefined ? r._ownProcessed : orig(r)))(window.processedOf);
    window.actualReceivedOf = (orig => r => (r && r._ownPaid !== undefined ? (r._ownPaid ? (r._value || 0) * (r.advancePct || 0) / 100 : 0) : orig(r)))(window.actualReceivedOf);
    const liveLineRows = () => splitLines(allMr11Rows().filter(r => r.isLive)).filter(r => !window.sfLineInScope || window.sfLineInScope(r));

    // ---- The tracker on each department's page ----
    function lineLabel(r, i) {
      const l = r._line;
      return `<span class="font-bold text-slate-900">Line ${i + 1}</span><span class="block text-slate-500">${esc([l.stream, l.blocks].filter(Boolean).join(' · '))}</span><span class="block text-slate-500">${esc(l.formwork || '')}</span>`;
    }
    function trackerCell(t, c, split, i) {
      const id = split._line.id;
      const own = lineOwn(t.key, id, c.f);
      const dis = can(...t.roles) ? '' : 'disabled';
      const attrs = `data-lt="${t.key}" data-id="${esc(id)}" data-f="${c.f}" data-type="${c.type}" aria-label="${esc(c.label)}, line ${i + 1}" ${dis}`;
      const def = c.def(split);
      if (c.type === 'check') {
        const on = own !== undefined ? !!own : !!def;
        return `<label class="inline-flex items-center gap-2"><input type="checkbox" ${attrs} ${on ? 'checked' : ''}><span>${on ? 'Received' : 'Waiting'}</span>${own === undefined ? '<span class="text-slate-400">(from the project)</span>' : ''}</label>`;
      }
      if (c.type === 'select') {
        const cur = own !== undefined ? own : '';
        return `<select ${attrs} class="w-full px-2 py-1.5 border border-slate-300 rounded-lg"><option value="">${esc(def ? `${def} (project)` : 'Choose')}</option>${c.options.map(o => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      }
      const place = c.type === 'number' ? (def === null || def === undefined || def === '' ? '' : fmtNum(def)) : (def || '');
      const value = own !== undefined ? own : '';
      return `<input type="${c.type === 'number' ? 'number' : 'date'}" ${c.type === 'number' ? 'min="0" step="0.01"' : ''} value="${esc(value)}" placeholder="${esc(place)}" ${attrs} class="w-full min-w-[120px] px-2 py-1.5 border border-slate-300 rounded-lg ${c.type === 'number' ? 'text-right' : ''}">`;
    }
    function renderLineTracker(t) {
      const box = $(`lt-${t.key}`);
      if (!box || box.contains(document.activeElement)) return;
      const rows = liveLineRows();
      const editable = can(...t.roles);
      box.innerHTML = `<div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div><h3 class="text-sm font-bold text-slate-900">${esc(t.title)}</h3><p class="text-xs text-slate-500">${esc(t.hint)} Grey figures are the line's share of the project until someone enters the line's own.</p></div>
          <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">${plural(rows.length, 'line')}</span></div>
        <div class="overflow-x-auto"><table class="w-full text-xs border-collapse sf-table">
          <thead><tr><th>Line</th><th class="text-right">NCA m²</th>${t.info ? '<th>Terms and advance</th>' : ''}${t.cols.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r, i) => `<tr class="align-top"><td>${lineLabel(r, i)}</td><td class="text-right font-semibold">${fmtNum(r.ncaQty)}</td>${t.info ? `<td>${t.info(r)}</td>` : ''}${t.cols.map(c => `<td>${trackerCell(t, c, r, i)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
        ${editable ? '' : `<p class="text-[11px] text-slate-500">${esc(t.roles.map(k => ROLES[k]).join(' or '))} keeps these figures; you can view them.</p>`}`;
    }

    // ---- Readiness: every line's state in one read-only view ----
    function renderLineReadiness() {
      const box = $('lt-lineReadiness');
      if (!box) return;
      const rows = mr11Lines(allMr11Rows().filter(r => r.isLive)).filter(r => !window.sfLineInScope || window.sfLineInScope(r));
      const tick = (ok, yes, no) => `<span class="sf-cond" data-met="${ok}">${esc(ok ? yes : no)}</span>`;
      box.innerHTML = `<div class="border-b border-slate-100 pb-3"><h3 class="text-sm font-bold text-slate-900">Readiness by MR11 line</h3>
          <p class="text-xs text-slate-500">Each line moves on its own: paid, designed, produced and shipped. A line is ready to dispatch once its advance is in, its design is complete and its stock is produced.</p></div>
        <div class="overflow-x-auto"><table class="w-full text-xs border-collapse sf-table">
          <thead><tr><th>Line</th><th class="text-right">NCA m²</th><th>Advance</th><th>Design</th><th class="text-right">Produced m²</th><th class="text-right">Shipped m²</th><th>State</th></tr></thead>
          <tbody>${rows.map((r, i) => {
            const paid = /CLEARED/.test(r.advStatus);
            const designed = /complet/i.test(r.designStatus || '');
            const produced = r.producedM2 >= r.ncaQty - 0.01;
            const shipped = r.shippedM2 >= r.ncaQty - 0.01;
            const state = shipped ? tick(true, 'Shipped', '') : paid && designed && r.producedM2 > r.shippedM2 ? tick(true, 'Ready to dispatch', '') : tick(false, '', !paid ? 'Waiting on advance' : !designed ? 'Waiting on design' : 'Waiting on production');
            return `<tr class="align-top"><td>${lineLabel(r, i)}</td><td class="text-right font-semibold">${fmtNum(r.ncaQty)}</td><td>${tick(paid, 'Received', 'Waiting')}</td><td>${esc(r.designStatus || 'Not started')}</td><td class="text-right">${fmtNum(r.producedM2)}${produced ? '' : ` <span class="text-slate-500">of ${fmtNum(r.ncaQty)}</span>`}</td><td class="text-right">${fmtNum(r.shippedM2)}</td><td>${state}</td></tr>`;
          }).join('')}</tbody>
        </table></div>`;
    }

    // ---- Place one tracker on each page, just under the page's opening card ----
    [...LINE_TRACKS, { key: 'lineReadiness', page: 6 }].forEach(t => {
      const panel = $(`step-panel-${t.page}`);
      if (!panel || $(`lt-${t.key}`)) return;
      const box = document.createElement('div');
      box.id = `lt-${t.key}`;
      box.className = 'bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-3';
      panel.insertBefore(box, panel.children[1] || null);
    });
    (orig => {
      window.refreshAll = function () {
        const out = orig.apply(this, arguments);
        if (!appState.ready) return out;
        LINE_TRACKS.forEach(t => { if (appState.activeTab === t.page) renderLineTracker(t); });
        if (appState.activeTab === 6) renderLineReadiness();
        return out;
      };
    })(window.refreshAll);

    // ---- From MR11 to your own page: each line's Edit button opens the department page that edits it ----
    const EDIT_PAGES = [{ roles: ['BD'], page: 1, name: 'BD & Commercial' }, ...LINE_TRACKS.map(t => ({ roles: t.roles, page: t.page, name: PAGES[t.page]?.name || t.title, key: t.key }))];
    // The pages for the role you are working as; an administrator can open any of them
    const editPagesFor = () => (appState.role === 'ADMIN' ? EDIT_PAGES : EDIT_PAGES.filter(p => p.roles.includes(appState.role)));
    function openLineEditor(lineId, page) {
      const target = EDIT_PAGES.find(p => p.page === page);
      if (!target || !tabAllowed(page)) { notify('Your role cannot edit that page. Ask an administrator for access.', 'error'); return; }
      switchTab(page);
      const index = appState.mr11Lines.findIndex(l => l.id === lineId);
      const row = target.key ? document.querySelector(`#lt-${target.key} [data-id="${CSS.escape(lineId)}"]`)?.closest('tr') : document.querySelector(`#bd-lines tr[data-line="${index}"]`);
      if (!row) return;
      row.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      row.classList.remove('sf-flash'); void row.offsetWidth; row.classList.add('sf-flash');
      row.querySelector('input:not([disabled]), select:not([disabled])')?.focus({ preventScroll: true });
    }
    window.openLineEditor = openLineEditor;
    function decorateLedger() {
      const pages = editPagesFor();
      document.querySelectorAll('#mr11-master-tbody [data-mr11="open"][data-key^="LIVE~"]').forEach(btn => {
        const cell = btn.closest('tr')?.querySelector('td');
        if (!cell || cell.querySelector('.sf-edit-line, .sf-edit-menu') || !pages.length) return;
        const id = btn.dataset.key.split('~')[1];
        const n = appState.mr11Lines.findIndex(l => l.id === id) + 1;
        cell.insertAdjacentHTML('beforeend', pages.length === 1
          ? `<br><button type="button" class="sf-edit-line" data-edit-line="${esc(id)}" data-page="${pages[0].page}" title="Edit line ${n} on ${esc(pages[0].name)}">Edit</button>`
          : `<br><details class="sf-edit-menu"><summary aria-label="Edit line ${n}">Edit</summary><div>${pages.map(p => `<button type="button" data-edit-line="${esc(id)}" data-page="${p.page}">On ${esc(p.name)}</button>`).join('')}</div></details>`);
      });
      // BD adds and sets up the project on the BD page; everyone else sees MR11 as it is
      const head = document.querySelector('#mr11-card .sf-ledger-title')?.parentElement;
      if (head && !head.querySelector('.sf-add-project')) head.insertAdjacentHTML('beforeend', '<button type="button" class="sf-btn sf-btn-sm sf-primary sf-add-project" onclick="openProjectEntry()">Add project</button>');
      head?.querySelector('.sf-add-project')?.classList.toggle('hidden', !['BD', 'ADMIN'].includes(appState.role));
      if (head) {
        let ep = head.querySelector('.sf-edit-project');
        if (!ep) { head.insertAdjacentHTML('beforeend', '<span class="sf-edit-project"></span>'); ep = head.querySelector('.sf-edit-project'); }
        const html = !pages.length ? ''
          : pages.length === 1 ? `<button type="button" class="sf-btn sf-btn-sm" data-edit-page="${pages[0].page}" title="Open ${esc(pages[0].name)} for this project">Edit project</button>`
          : `<details class="sf-edit-menu sf-edit-menu-btn"><summary class="sf-btn sf-btn-sm">Edit project</summary><div>${pages.map(p => `<button type="button" data-edit-page="${p.page}">On ${esc(p.name)}</button>`).join('')}</div></details>`;
        if (ep.innerHTML !== html) ep.innerHTML = html;
      }
    }
    window.openProjectEntry = function () {
      if (!guard(['BD'], 'add a project')) return;
      switchTab(1);
      const name = $('bd-project-name');
      if (name) { name.scrollIntoView({ block: 'center' }); name.focus(); }
      notify('Project entry is in section 1 of BD & Commercial: name, PO, NCA, then one MR11 line per stream.', 'info');
    };
    window.renderMR11PipelineTab = (orig => function () { const out = orig.apply(this, arguments); decorateLedger(); return out; })(window.renderMR11PipelineTab);
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-edit-line]');
      if (!b) return;
      b.closest('details')?.removeAttribute('open');
      openLineEditor(b.dataset.editLine, Number(b.dataset.page));
    });

    document.addEventListener('change', e => {
      const el = e.target;
      if (!el.dataset || !el.dataset.lt) return;
      const t = LINE_TRACKS.find(x => x.key === el.dataset.lt);
      if (!t || !guard(t.roles, 'update this line')) { refreshAll(); return; }
      const { id, f, type } = el.dataset;
      let value;
      if (type === 'check') value = el.checked;
      else if (type === 'number') { const n = parseFloat(el.value); value = Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : null; }
      else value = el.value.trim() || null;
      const store = appState[t.key] = { ...(appState[t.key] || {}) };
      store[id] = { ...(store[id] || {}), [f]: value };
      if (value === null) delete store[id][f];
      const n = appState.mr11Lines.findIndex(l => l.id === id) + 1;
      const label = t.cols.find(c => c.f === f)?.label || f;
      logActivity(`${t.title}: line ${n} ${label} ${value === null ? 'set back to the project figure' : `set to ${value === true ? 'received' : value === false ? 'waiting' : value}`}`);
      refreshAll();
    });
