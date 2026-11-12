    // =========================================================================
    // Faster redraws.
    // 1. A redraw (refreshAll) only reads the data, so during one redraw the MR11 rows, the
    //    payment milestones and the alerts are worked out once and handed out as copies.
    //    One redraw used to work the rows out about 20 times.
    // 2. When one change asks for several redraws in a row (the commercial recalculation
    //    asked for three), they are folded into one redraw when the change is finished.
    // =========================================================================
    (function () {
      let drawing = 0;
      const memo = {};
      const reuse = (name, copy) => {
        const work = window[name];
        if (typeof work !== 'function') return;
        window[name] = function () {
          if (!drawing) return work.apply(this, arguments);
          if (!(name in memo)) memo[name] = work.apply(this, arguments);
          return copy(memo[name]);
        };
      };
      reuse('allMr11Rows', rows => rows.slice());
      reuse('termsList', terms => terms.map(t => ({ ...t })));
      reuse('computeAlerts', alerts => alerts.slice());

      let holding = 0;
      let wanted = false;
      const draw = window.refreshAll;
      window.refreshAll = function () {
        if (holding) { wanted = true; return; }
        drawing++;
        try {
          return draw.apply(this, arguments);
        } finally {
          if (--drawing === 0) Object.keys(memo).forEach(k => delete memo[k]);
        }
      };
      const foldRedraws = name => {
        const work = window[name];
        if (typeof work !== 'function') return;
        window[name] = function () {
          holding++;
          let out;
          try {
            out = work.apply(this, arguments);
          } finally {
            holding--;
          }
          if (!holding && wanted) { wanted = false; window.refreshAll(); }
          return out;
        };
      };
      foldRedraws('recalculateCommercial');
      foldRedraws('propagateBDData');
      // sfBatch(work): runs work, then draws once if anything asked for a redraw
      window.sfBatch = work => {
        holding++;
        try {
          return work();
        } finally {
          holding--;
          if (!holding && wanted) { wanted = false; window.refreshAll(); }
        }
      };
    })();
