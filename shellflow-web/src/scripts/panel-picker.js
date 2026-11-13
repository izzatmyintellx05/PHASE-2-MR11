    // =========================================================================
    // Panel codes: a searchable dropdown instead of a typed list. It shows the panels in the
    // Panel Register with their block, m² and current stage; panels that already reached the
    // chosen stage cannot be picked. Picked panels show as chips. Typing a range such as
    // "W-041 to W-045" and pressing Enter still works. The original field keeps the value,
    // so recording works exactly as before.
    // =========================================================================
    (function () {
      const field = $('prod-serial-input');
      if (!field) return;
      field.type = 'hidden';
      const box = document.createElement('div');
      box.className = 'sf-picker';
      box.innerHTML = `<div class="sf-picker-control" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="sf-picker-list">
          <div class="sf-picker-chips"></div>
          <input type="text" class="sf-picker-search" placeholder="Search panel codes, e.g. W-04" aria-label="Search panel codes" autocomplete="off">
        </div>
        <div class="sf-picker-menu" hidden>
          <div class="sf-picker-tools"><span class="sf-picker-count"></span><button type="button" data-pick="all">Pick all shown</button><button type="button" data-pick="none">Clear</button></div>
          <ul id="sf-picker-list" role="listbox" aria-multiselectable="true"></ul>
        </div>`;
      field.insertAdjacentElement('afterend', box);
      const search = box.querySelector('.sf-picker-search');
      const menu = box.querySelector('.sf-picker-menu');
      const list = box.querySelector('ul');
      const control = box.querySelector('.sf-picker-control');
      const picked = () => expandCodes(field.value);
      const setPicked = codes => { field.value = [...new Set(codes)].join(', '); drawChips(); drawList(); };
      const targetStage = () => $('prod-state-select')?.value || 'PRODUCED';
      const blocked = p => PANEL_STAGES.indexOf(p.stage) >= PANEL_STAGES.indexOf(targetStage());

      function drawChips() {
        const codes = picked();
        box.querySelector('.sf-picker-chips').innerHTML = codes.map(c => `<span class="sf-chip-code">${esc(c)}<button type="button" data-unpick="${esc(c)}" aria-label="Remove ${esc(c)}">×</button></span>`).join('');
        search.placeholder = codes.length ? 'Add more…' : 'Search panel codes, e.g. W-04';
      }
      function shownPanels() {
        const q = search.value.trim().toUpperCase();
        return appState.panels.filter(p => !q || p.code.includes(q) || String(p.block || '').toUpperCase().includes(q))
          .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      }
      function drawList() {
        const codes = picked();
        const rows = shownPanels();
        box.querySelector('.sf-picker-count').textContent = `${rows.length} panel${rows.length === 1 ? '' : 's'}${codes.length ? ` · ${codes.length} picked` : ''}`;
        list.innerHTML = rows.slice(0, 200).map(p => {
          const on = codes.includes(p.code), off = blocked(p) && !on;
          return `<li role="option" aria-selected="${on}" aria-disabled="${off}" data-code="${esc(p.code)}" class="${on ? 'is-on' : ''} ${off ? 'is-off' : ''}">
            <span class="sf-picker-check" aria-hidden="true">${on ? '✓' : ''}</span><strong>${esc(p.code)}</strong>
            <span>${esc(p.block || '')}</span><span>${fmtNum(p.m2)} m²</span><span class="sf-picker-stage">${off ? `already ${esc(p.stage)}` : esc(p.stage)}</span></li>`;
        }).join('') || '<li class="is-empty">No panel matches. Add it to the Panel Register first.</li>';
      }
      const open = () => { menu.hidden = false; control.setAttribute('aria-expanded', 'true'); drawList(); };
      const close = () => { menu.hidden = true; control.setAttribute('aria-expanded', 'false'); };

      control.addEventListener('click', () => { search.focus(); open(); });
      search.addEventListener('input', () => { open(); drawList(); });
      search.addEventListener('keydown', e => {
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'Backspace' && !search.value) { const c = picked(); c.pop(); setPicked(c); return; }
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const typed = search.value.trim();
        if (!typed) return;
        // A typed code or range ("W-041 to W-045") is added when every code is in the register
        const codes = expandCodes(typed);
        const known = codes.filter(c => appState.panels.some(p => p.code === c));
        if (known.length === codes.length) { setPicked([...picked(), ...known]); search.value = ''; drawList(); }
        else {
          const rows = shownPanels().filter(p => !blocked(p));
          if (rows.length === 1) { setPicked([...picked(), rows[0].code]); search.value = ''; drawList(); }
          else notify(`Not in the Panel Register: ${codes.filter(c => !known.includes(c)).join(', ')}`, 'error');
        }
      });
      box.addEventListener('click', e => {
        const un = e.target.closest('[data-unpick]');
        if (un) { e.stopPropagation(); setPicked(picked().filter(c => c !== un.dataset.unpick)); return; }
        const tool = e.target.closest('[data-pick]');
        if (tool) {
          e.stopPropagation();
          if (tool.dataset.pick === 'none') setPicked([]);
          else setPicked([...picked(), ...shownPanels().filter(p => !blocked(p)).map(p => p.code)]);
          return;
        }
        const li = e.target.closest('li[data-code]');
        if (!li || li.classList.contains('is-off')) return;
        e.stopPropagation();
        const code = li.dataset.code;
        setPicked(picked().includes(code) ? picked().filter(c => c !== code) : [...picked(), code]);
      });
      document.addEventListener('click', e => { if (!box.contains(e.target)) close(); });
      $('prod-state-select')?.addEventListener('change', drawList);
      // Keep the chips in step when the page clears or fills the field itself
      window.refreshAll = (orig => function () { const out = orig.apply(this, arguments); drawChips(); if (!menu.hidden) drawList(); return out; })(window.refreshAll);
      drawChips();
    })();
