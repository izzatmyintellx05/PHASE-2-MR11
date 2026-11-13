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
          ? `<span class="sf-crumb-page">MR11 Master Schedule</span><span class="sf-crumb-hint">Start here. To change something, use <b>Edit</b> on a line or <b>Edit project</b>; it opens your department's page.</span>`
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
