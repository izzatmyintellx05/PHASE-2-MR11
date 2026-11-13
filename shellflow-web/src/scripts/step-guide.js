    // =========================================================================
    // Step by step. On each workflow page the sections you fill in become numbered steps,
    // shown one at a time: a guide bar at the top lists them, and each step ends with Back
    // and Next (the last one leads to the next page). Read-only summaries stay in view.
    // "Show all" brings back the whole page; the choice is remembered in this browser.
    // =========================================================================
    (function () {
      const STEP_PAGES = [1, 2, 3, 4, 6, 7, 8];
      const NEXT_PAGE = { 1: 2, 2: 3, 3: 4, 4: 6, 6: 7, 7: 8, 8: 9 };
      const current = {};
      let on = true;
      try { on = localStorage.getItem('sf.stepMode') !== '0'; } catch {}
      // The heading's words without its step badge, and without an old "3. " number in front
      const titleOf = card => {
        const h = card.querySelector('.sf-collapse-head h2, .sf-collapse-head h3, .sf-collapse-head h4, h2, h3');
        if (!h) return 'Step';
        const copy = h.cloneNode(true);
        copy.querySelectorAll('.sf-step-no').forEach(b => b.remove());
        return copy.textContent.replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim();
      };
      const stepsOf = panel => [...panel.querySelectorAll('.sf-collapsible')]
        .filter(c => !c.parentElement.closest('.sf-collapsible') && c.querySelector('input:not([type="hidden"]), select, textarea, table'));

      function apply() {
        const page = appState.activeTab;
        const panel = $(`step-panel-${page}`);
        document.querySelectorAll('.step-panel.sf-stepmode').forEach(p => { if (p !== panel || !on) p.classList.remove('sf-stepmode'); });
        if (!panel || !STEP_PAGES.includes(page)) return;
        const steps = stepsOf(panel);
        let guide = panel.querySelector(':scope > .sf-stepguide');
        if (steps.length < 2) { guide?.remove(); panel.classList.remove('sf-stepmode'); return; }
        const at = Math.min(current[page] || 0, steps.length - 1);
        panel.classList.toggle('sf-stepmode', on);
        steps.forEach((card, i) => {
          card.classList.add('sf-stepcard');
          card.classList.toggle('sf-step-current', on && i === at);
          card.classList.toggle('sf-step-done', on && i < at);
          const h = card.querySelector('.sf-collapse-head h2, .sf-collapse-head h3, .sf-collapse-head h4');
          // Old hand-written numbers in headings ("3. Forecast ...") give way to the step number
          if (h && !h.dataset.sfNum) { const t = [...h.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = t.textContent.replace(/^\s*\d+[.)]\s*/, ''); h.dataset.sfNum = '1'; }
          if (h && !h.querySelector('.sf-step-no')) h.insertAdjacentHTML('afterbegin', `<span class="sf-step-no" aria-hidden="true">${i + 1}</span>`);
          else if (h) h.querySelector('.sf-step-no').textContent = String(i + 1);
          let nav = card.querySelector(':scope > .sf-stepnav');
          if (on && i === at) {
            if (card.classList.contains('sf-collapsed')) toggleCollapsed(card, false);
            const next = steps[i + 1];
            const nextPage = NEXT_PAGE[page];
            const html = `${i > 0 ? `<button type="button" class="sf-btn" data-guide-go="${i - 1}">Back</button>` : '<span></span>'}
              <span class="sf-stepnav-count">Step ${i + 1} of ${steps.length}</span>
              ${next ? `<button type="button" class="sf-btn sf-primary" data-guide-go="${i + 1}">Next: ${esc(titleOf(next))}</button>`
                : nextPage && tabAllowed(nextPage) ? `<button type="button" class="sf-btn sf-primary" data-guide-page="${nextPage}">Done here: go to ${esc(PAGES[nextPage]?.name || 'the next page')}</button>` : '<span></span>'}`;
            if (!nav) { nav = document.createElement('div'); nav.className = 'sf-stepnav'; card.appendChild(nav); }
            if (nav.innerHTML !== html) nav.innerHTML = html;
          } else nav?.remove();
        });
        const html = `<ol>${steps.map((card, i) => `<li><button type="button" data-guide-go="${i}" ${on && i === at ? 'aria-current="step"' : ''} class="${on && i < at ? 'is-done' : ''}"><span class="sf-step-no">${i + 1}</span>${esc(titleOf(card))}</button></li>`).join('')}</ol>
          <button type="button" class="sf-btn sf-btn-sm" data-guide-mode>${on ? 'Show all' : 'Step by step'}</button>`;
        if (!guide) { guide = document.createElement('nav'); guide.className = 'sf-stepguide'; guide.setAttribute('aria-label', 'Steps on this page'); panel.prepend(guide); }
        if (guide.innerHTML !== html) guide.innerHTML = html;
      }
      function go(i) {
        const page = appState.activeTab;
        current[page] = i;
        if (!on) { on = true; try { localStorage.setItem('sf.stepMode', '1'); } catch {} }
        apply();
        const card = stepsOf($(`step-panel-${page}`))[i];
        if (card) {
          const y = card.getBoundingClientRect().top + window.scrollY - 130;
          window.scrollTo({ top: Math.max(0, y), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          card.querySelector('.sf-stepnav')?.previousElementSibling && card.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])')?.focus({ preventScroll: true });
        }
      }
      document.addEventListener('click', e => {
        const t = e.target.closest && e.target.closest('[data-guide-go], [data-guide-page], [data-guide-mode], .sf-stepmode .sf-stepcard:not(.sf-step-current) > .sf-collapse-head');
        if (!t) return;
        if (t.matches('[data-guide-mode]')) { on = !on; try { localStorage.setItem('sf.stepMode', on ? '1' : '0'); } catch {} apply(); return; }
        if (t.matches('[data-guide-page]')) { switchTab(Number(t.dataset.guidePage)); return; }
        if (t.matches('[data-guide-go]')) { go(Number(t.dataset.guideGo)); return; }
        // Clicking a waiting step's heading opens that step (but not when the click was on its own fold button)
        if (e.target.closest('.sf-collapse-btn')) return;
        const card = t.parentElement;
        const i = stepsOf(card.closest('.step-panel')).indexOf(card);
        if (i >= 0) go(i);
      });
      window.renderFeatures = (orig => function () { const out = orig.apply(this, arguments); apply(); return out; })(window.renderFeatures);
    })();
