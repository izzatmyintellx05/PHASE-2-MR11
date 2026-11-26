    // =========================================================================
    // MR11 first. The MR11 Master Schedule is home; the department pages are not a tab row
    // any more. People reach their department's page from MR11 (Edit on a line, Edit project,
    // or Add project for BD), and a slim bar there leads back to MR11.
    // =========================================================================
    (function () {
      const bar = $('step-bar');
      if (!bar) return;
      const crumbs = document.createElement('div');
      crumbs.className = 'sf-crumbs';
      bar.prepend(crumbs);
      const DEPT_PAGES = [1, 2, 3, 4, 6, 7, 8];
      function render() {
        const t = appState.activeTab;
        const name = (PAGES[t] && PAGES[t].name) || '';
        const html = t === 9
          ? `<span class="sf-crumb-page">MR11 Master Schedule</span>`
          : `<button type="button" class="sf-btn sf-btn-sm" data-back-mr11>← Back to MR11</button><span class="sf-crumb-sep" aria-hidden="true">/</span><span class="sf-crumb-page">${esc(name)}</span>${DEPT_PAGES.includes(t) ? `<span class="sf-crumb-hint">Editing ${esc(appState.projectName || 'the project')}</span>` : ''}`;
        if (crumbs.innerHTML !== html) crumbs.innerHTML = html;
      }
      document.addEventListener('click', e => {
        if (e.target.closest && e.target.closest('[data-back-mr11]')) switchTab(9);
        const ep = e.target.closest && e.target.closest('[data-edit-page]');
        if (ep) { ep.closest('details')?.removeAttribute('open'); switchTab(Number(ep.dataset.editPage)); }
      });
      window.refreshAll = (orig => function () { const out = orig.apply(this, arguments); if (appState.ready) render(); return out; })(window.refreshAll);
    })();

    // ---- Phones and tablets: the tool pages (My Work, Alerts, Reports ...) sit behind one
    // "More pages" button, so a department's own sheet comes straight after the steps ----
    (function () {
      const tools = document.querySelector('.sf-tools');
      if (!tools) return;
      if (!tools.id) tools.id = 'sf-tools';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sf-more-btn';
      btn.setAttribute('aria-controls', tools.id);
      btn.setAttribute('aria-expanded', 'false');
      tools.parentNode.insertBefore(btn, tools);
      let last = '';
      function label() {
        const on = tools.querySelector('.sf-tool.step-btn-active > span:not(.sf-count)');
        const n = Number(($('sf-mywork-count')?.textContent || '').trim()) || 0;
        const html = `${icon('layout-grid')}<span>${on ? `More pages · ${esc(on.textContent.trim())}` : 'More pages'}</span>${n ? `<span class="sf-count">${n}</span>` : ''}<span class="sf-more-chev" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>`;
        if (html === last) return;
        last = html;
        btn.innerHTML = html;
        if (typeof refreshIcons === 'function') refreshIcons();
      }
      const setOpen = on => { tools.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', String(on)); };
      btn.addEventListener('click', () => setOpen(!tools.classList.contains('is-open')));
      tools.addEventListener('click', e => { if (e.target.closest('.sf-tool')) setOpen(false); });
      window.switchTab = (orig => function () { const out = orig.apply(this, arguments); label(); return out; })(window.switchTab);
      window.refreshAll = (orig => function () { const out = orig.apply(this, arguments); label(); return out; })(window.refreshAll);
      label();
    })();
