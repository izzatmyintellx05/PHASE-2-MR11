    // =========================================================================
    // Many projects. Each project keeps its own data on the server; this page works on one of
    // them at a time (your own choice). The project you are on keeps a summary of its MR11
    // lines up to date, so everyone's MR11 lists every project. Edit on another project's line
    // switches to it and opens your department's page; Add project starts a new one and keeps
    // the others. (The single-file version holds one project.)
    // =========================================================================
    (function () {
      const ROLE_PAGE = { BD: 1, FINANCE: 2, SHELLPLAN: 3, DESIGN: 3, PLANNING: 4, PRODUCTION: 4, DISPATCH: 7, ADMIN: 1 };
      const active = () => window.MR11_ACTIVE_PROJECT || 'P1';
      const plain = o => JSON.parse(JSON.stringify(o));

      // The summary this project shares: its MR11 row and its lines, with the figures as they stand
      window.mr11Summary = function () {
        if (!appState.ready) return {};
        const live = allMr11Rows().find(r => r.isLive);
        if (!live) return {};
        const id = active();
        const lines = mr11Lines([live]).map(r => ({ ...plain(r), key: id, lineKey: `${id}~${r._line.id}`, isLive: false, _otherProject: true, _ownProcessed: processedOf(r) }));
        const project = { ...plain(live), key: id, isLive: false, _otherProject: true, freightRef: appState.freightRef || '', deleted: false };
        return { name: live.customerProject.trim(), project, lines };
      };

      // Other projects join MR11 (and the CEO hub, alerts and bank matching) like reference rows
      window.mr11InjectOthers = function () {
        for (let i = referenceMR11Projects.length - 1; i >= 0; i--) if (referenceMR11Projects[i]._otherProject) referenceMR11Projects.splice(i, 1);
        Object.entries(window.MR11_OTHERS || {}).forEach(([id, s]) => {
          if (!s || !s.project || id === active()) return;
          referenceMR11Projects.push({ ...s.project, key: id, isLive: false, _otherProject: true, _cachedLines: s.lines || [] });
        });
      };
      // Their lines come from their summary, exactly as their own project worked them out
      window.mr11Lines = (orig => function (projects) {
        const list = projects || allMr11Rows();
        const out = [];
        let batch = [];
        const flush = () => { if (batch.length) { out.push(...orig.call(this, batch)); batch = []; } };
        list.forEach(p => { if (p && p._cachedLines) { flush(); out.push(...p._cachedLines.map(l => ({ ...l }))); } else batch.push(p); });
        flush();
        return out;
      })(window.mr11Lines);

      // One MR11 line per stream: a project's lines on the same stream show as one line
      // (m² and money added up, blocks listed together). Lines saved that way before the rule
      // are shown combined; the first line keeps its own figures and department entries.
      const streamKey = r => String((r._line && r._line.stream) || r.stream || '').replace(/[^0-9.]/g, '') || '1';
      const SUM = ['ncaQty', 'designFinal', 'totalForecastM2', 'producedM2', 'shippedM2', 'pendingM2', '_share', '_value', '_ownProcessed'];
      window.mr11OneLinePerStream = function (rows) {
        const out = [];
        const seen = new Map();
        rows.forEach(r => {
          if (!r || !r._line) { out.push(r); return; }
          const k = `${r.isLive ? 'LIVE' : r.key}|${streamKey(r)}`;
          const first = seen.get(k);
          if (!first) { const copy = { ...r, _line: { ...r._line } }; seen.set(k, copy); out.push(copy); return; }
          SUM.forEach(f => { if (typeof r[f] === 'number') first[f] = (Number(first[f]) || 0) + r[f]; });
          if (Array.isArray(r.monthsM2)) first.monthsM2 = (first.monthsM2 || []).map((v, i) => (Number(v) || 0) + (Number(r.monthsM2[i]) || 0));
          const blocks = [...new Set([first._line.blocks, r._line.blocks].flatMap(b => String(b || '').split(',')).map(b => b.trim()).filter(Boolean))].join(', ');
          first._line.blocks = blocks;
          first._line.m2 = (Number(first._line.m2) || 0) + (Number(r._line.m2) || 0);
          first._merged = (first._merged || 1) + 1;
          first.buildingStream = [first._line.stream, blocks].filter(Boolean).join(' / ');
        });
        // Line numbers within each project follow the combined list
        const count = {};
        out.forEach(r => { if (r && r._line) { const p = r.isLive ? 'LIVE' : r.key; r._lineIndex = count[p] = (count[p] ?? -1) + 1; } });
        out.forEach(r => { if (r && r._line) r._lineCount = count[r.isLive ? 'LIVE' : r.key] + 1; });
        return out;
      };
      window.mr11Lines = (orig => function () { return window.mr11OneLinePerStream(orig.apply(this, arguments)); })(window.mr11Lines);

      // Edit on another project's line: switch to that project and open your department's page there
      function decorateOthers() {
        const others = new Set(Object.keys(window.MR11_OTHERS || {}));
        const page = ROLE_PAGE[appState.role];
        document.querySelectorAll('#mr11-master-tbody [data-mr11="open"][data-key]').forEach(btn => {
          const [id, line] = String(btn.dataset.key).split('~');
          if (!others.has(id) || id === active() || !page || typeof window.mr11SwitchProject !== 'function') return;
          const cell = btn.closest('tr')?.querySelector('td');
          if (!cell || cell.querySelector('[data-open-project]')) return;
          cell.insertAdjacentHTML('beforeend', `<br><button type="button" class="sf-edit-line" data-open-project="${esc(id)}" data-line="${esc(line)}" data-page="${page}" title="Switch to this project and open your page">Edit</button>`);
        });
      }
      window.renderMR11PipelineTab = (orig => function () { const out = orig.apply(this, arguments); decorateOthers(); return out; })(window.renderMR11PipelineTab);
      document.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-open-project]');
        if (!b) return;
        e.stopPropagation();
        notify('Opening that project…', 'info');
        window.mr11SwitchProject(b.dataset.openProject, { page: Number(b.dataset.page), line: b.dataset.line });
      }, true);

      // Add project: a name and the contract NCA, then a clean start; the other projects are kept
      const dialog = document.createElement('div');
      dialog.id = 'project-modal';
      dialog.className = 'fixed inset-0 bg-slate-900/60 z-50 hidden items-center justify-center p-4';
      dialog.innerHTML = `<div class="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
          <h2 id="project-modal-title" class="text-base font-bold text-slate-900">Add a project</h2>
          <p class="text-xs text-slate-500">Your other projects are kept.</p>
          <label class="block text-xs font-semibold text-slate-700">Project name<input id="pm-name" type="text" maxlength="120" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Tower B Phase 1"></label>
          <label class="block text-xs font-semibold text-slate-700">Contract NCA m²<input id="pm-nca" type="number" min="1" step="0.01" class="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. 1200"></label>
          <p id="pm-error" class="text-xs text-rose-700"></p>
          <div class="flex justify-end gap-2"><button type="button" class="sf-btn" data-pm="cancel">Cancel</button><button type="button" class="sf-btn sf-primary" data-pm="create">Add project</button></div>
        </div>`;
      document.body.appendChild(dialog);
      const closeDialog = () => { dialog.classList.add('hidden'); dialog.classList.remove('flex'); };
      dialog.addEventListener('click', async e => {
        const act = e.target.closest('[data-pm]')?.dataset.pm;
        if (e.target === dialog || act === 'cancel') { closeDialog(); return; }
        if (act !== 'create') return;
        const name = $('pm-name').value.trim();
        const nca = parseFloat($('pm-nca').value);
        if (!name) { $('pm-error').textContent = 'Give the project a name.'; return; }
        if (!(nca > 0)) { $('pm-error').textContent = 'Enter the contract NCA in m² (more than 0).'; return; }
        const list = (window.MR11_PROJECTS || []).slice();
        if (!list.some(p => p.id === 'P1')) list.unshift({ id: 'P1', name: active() === 'P1' ? appState.projectName : 'Project 1', createdAt: '' });
        if (!list.some(p => p.id === active())) list.push({ id: active(), name: appState.projectName, createdAt: '' });
        const id = `P${Date.now().toString(36).toUpperCase()}`;
        list.push({ id, name, createdAt: DEMO_TODAY });
        window.MR11_PROJECTS = list;
        try { sessionStorage.setItem('mr11.newProject', JSON.stringify({ name, nca })); } catch {}
        logActivity(`Added project "${name}" (NCA ${fmtNum(nca)} m²)`);
        closeDialog();
        await window.mr11SwitchProject(id, { page: 1 });
      });
      window.openProjectEntry = function () {
        if (!guard(['BD'], 'add a project')) return;
        if (typeof window.mr11SwitchProject !== 'function') { notify('Several projects need the hosted site; this single file holds one project.', 'info'); switchTab(1); return; }
        $('pm-name').value = ''; $('pm-nca').value = ''; $('pm-error').textContent = '';
        dialog.classList.remove('hidden'); dialog.classList.add('flex');
        setTimeout(() => $('pm-name').focus(), 50);
      };
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && !dialog.classList.contains('hidden')) closeDialog(); });
    })();
