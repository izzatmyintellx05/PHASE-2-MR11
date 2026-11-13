    // =========================================================================
    // One project. Every page follows the one project BD keeps on the BD page. The four
    // sample contracts (Gamuda, Ayala, Marina View, Hyderabad), the sample history in the CEO
    // hub and the sample records tied to them (items, bank advice, incidents, updates,
    // comments) are set aside, unless an administrator switches "Show the sample projects"
    // on in Rules for a demonstration.
    // =========================================================================
    (function () {
      const stash = referenceMR11Projects.slice();
      const ceoStash = JSON.parse(JSON.stringify(CEO_HISTORY));
      const KEYS = new Set(stash.map(r => r.key));
      const NAMES = stash.map(r => r.customerProject.trim().toUpperCase());
      const WORDS = /\b(GAMUDA|AYALA|MARINA VIEW|HYDERABAD)\b/i;
      const aboutSample = v => {
        const text = String(v ?? '').trim();
        return KEYS.has(text) || NAMES.includes(text.toUpperCase()) || WORDS.test(text);
      };
      const keep = (list, test) => {
        if (!Array.isArray(list)) return list;
        const kept = list.filter(x => !test(x));
        return kept.length === list.length ? list : kept;
      };
      let lastOn = null;
      window.applyProjectScope = function () {
        const on = !!(appState.rules && appState.rules.sampleProjects);
        if (on !== lastOn) {
          const kept = referenceMR11Projects.filter(r => r._otherProject);
          referenceMR11Projects.length = 0;
          if (on) referenceMR11Projects.push(...stash);
          referenceMR11Projects.push(...kept);
          Object.keys(CEO_HISTORY).forEach(g => ['actual', 'forecast'].forEach(k => {
            CEO_HISTORY[g][k] = on ? ceoStash[g][k].slice() : ceoStash[g][k].map(() => 0);
          }));
          lastOn = on;
        }
        if (on) return;
        appState.items = keep(appState.items, i => aboutSample(i.row));
        appState.bankLines = keep(appState.bankLines, l => l.status === 'OPEN' && aboutSample(l.desc));
        appState.incidents = keep(appState.incidents, i => aboutSample(i.row));
        appState.updates = keep(appState.updates, u => aboutSample(u.row));
        appState.lorries = keep(appState.lorries, l => aboutSample(l.row));
        appState.approvals = keep(appState.approvals, a => aboutSample(a.row));
        if (appState.comments) KEYS.forEach(k => { delete appState.comments[k]; });
      };
      // Every redraw starts from the project scope, so loaded or shared data never brings a sample back
      const draw = window.refreshAll;
      window.refreshAll = function () {
        window.applyProjectScope();
        return draw.apply(this, arguments);
      };
      window.applyProjectScope();
    })();
