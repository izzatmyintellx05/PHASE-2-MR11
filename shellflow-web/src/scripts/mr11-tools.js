    // =========================================================================
    // MR11 tools drawer, on the very right of the site and apart from the filters beside the table.
    // It shows on the MR11 page (and in full screen), and stays open or shut as you left it.
    // =========================================================================
    (function () {
      const side = $('mr11-side');
      const card = $('mr11-card');
      if (!side || !card) return;
      let open = loadPref('mr11.toolsOpen', window.innerWidth >= 1024);
      document.body.appendChild(side);

      function placeTools() {
        const full = document.fullscreenElement === card;
        const onPage = full || !$('step-panel-9')?.classList.contains('hidden');
        const home = full ? card : document.body;
        if (side.parentNode !== home) home.appendChild(side);
        side.hidden = !onPage;
        side.classList.toggle('is-shut', !open);
        document.body.classList.toggle('sf-rtools-open', onPage && open && !full);
        card.classList.toggle('sf-has-tools', full && open);
        $('mr11-tools-btn')?.setAttribute('aria-pressed', String(open));
        side.querySelectorAll('[data-tools="toggle"]').forEach(b => b.setAttribute('aria-expanded', String(open)));
        const fb = $('mr11-full-btn');
        if (fb) { fb.querySelector('span').textContent = full ? 'Exit full screen' : 'Full screen'; fb.setAttribute('aria-pressed', String(full)); }
      }
      window.mr11PlaceTools = placeTools;

      document.addEventListener('click', e => {
        if (!e.target.closest || !e.target.closest('[data-tools="toggle"]')) return;
        open = !open;
        savePref('mr11.toolsOpen', open);
        placeTools();
        if (open) setTimeout(() => $('mr11-search')?.focus({ preventScroll: true }), 230);
      });
      document.addEventListener('fullscreenchange', placeTools);
      window.switchTab = (orig => function () { const out = orig.apply(this, arguments); placeTools(); return out; })(window.switchTab);
      window.refreshAll = (orig => function () { const out = orig.apply(this, arguments); placeTools(); return out; })(window.refreshAll);
      placeTools();
    })();
