    // =========================================================================
    // The project header as a filter. Project, Streams and Blocks are dropdowns: pick a project
    // (when there is more than one), a stream or a block, and MR11, each department's line table,
    // the readiness view and the header's figures show just that. Building and Country / PIC are
    // shown for the chosen project. Formwork and product list every type on the shown lines.
    // The choice is this browser's view only; it changes no data.
    // =========================================================================
    (function () {
      const SCOPE = { project: '', stream: '', block: '' };
      const blocksOf = l => String(l.blocks || '').split(',').map(b => b.trim()).filter(Boolean);
      const uniq = list => [...new Set(list.filter(Boolean))];
      const lineInScope = r => {
        const l = r && r._line;
        if (!l) return true;
        if (SCOPE.stream && l.stream !== SCOPE.stream) return false;
        if (SCOPE.block && !blocksOf(l).includes(SCOPE.block)) return false;
        return true;
      };
      // Rows in view: the chosen project (or all), then the chosen stream and block
      window.sfInScope = r => !r || ((!SCOPE.project || r.key === SCOPE.project) && lineInScope(r));
      window.sfLineInScope = lineInScope;

      const kvOf = id => $(id)?.closest('.sf-kv');
      function selectFor(kv, label, options, value, onPick) {
        if (!kv) return;
        kv.classList.add('sf-kv-pick');
        let sel = kv.querySelector('select.sf-kv-select');
        if (!sel) {
          sel = document.createElement('select');
          sel.className = 'sf-kv-select';
          sel.setAttribute('aria-label', label);
          sel.addEventListener('change', () => { onPick(sel.value); refreshAll(); });
          kv.appendChild(sel);
        }
        const html = options.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('');
        if (sel.innerHTML !== html) sel.innerHTML = html;
        sel.value = value;
      }

      function renderHeaderScope() {
        const rows = allMr11Rows();
        if (SCOPE.project && !rows.some(r => r.key === SCOPE.project)) SCOPE.project = '';
        const proj = rows.find(r => r.key === (SCOPE.project || 'LIVE')) || rows[0];
        if (!proj) return;
        const lines = mr11Lines([proj]);
        const streams = uniq(lines.map(r => r._line.stream));
        const blocks = uniq(lines.flatMap(r => blocksOf(r._line)));
        if (SCOPE.stream && !streams.includes(SCOPE.stream)) SCOPE.stream = '';
        if (SCOPE.block && !blocks.includes(SCOPE.block)) SCOPE.block = '';
        const shown = lines.filter(lineInScope);
        const narrowed = !!(SCOPE.stream || SCOPE.block);

        // What the pills say
        const set = (id, text) => { const el = $(id); if (el && el.textContent !== text) el.textContent = text; };
        set('ctx-project', SCOPE.project || rows.length === 1 ? proj.customerProject.trim() : `All projects (${rows.length})`);
        set('ctx-building', proj.isLive ? appState.buildingName : String(proj.buildingStream || '').split('/')[0].trim());
        set('ctx-country-pic', `${proj.country} / ${proj.pic}`);
        set('ctx-streams', SCOPE.stream || streams.join(', '));
        set('ctx-blocks', SCOPE.block || blocks.join(', '));
        // Formwork and product: every type on the lines in view
        set('ctx-formwork', uniq(shown.map(r => r.formworkSystem)).join(' + ') || proj.formworkSystem);
        set('ctx-product', uniq(shown.map(r => r.product)).join(' + ') || proj.product);
        // m² and value: the lines in view, or the whole project
        const area = narrowed ? shown.reduce((a, r) => a + r.ncaQty, 0) : (proj.isLive ? appState.ncaArea : proj.ncaQty);
        const value = narrowed ? shown.reduce((a, r) => a + (r._value || 0), 0) : (proj.isLive ? appState.totalContractValue : proj.ncaQty * proj.finalPrice);
        set('ctx-area', `${fmtNum(area)} m²${narrowed ? ` of ${fmtNum(proj.ncaQty)}` : ''}`);
        set('ctx-contract', formatUSD(value));

        // The dropdowns
        selectFor(kvOf('ctx-project'), 'Choose the project', [...(rows.length > 1 ? [['', `All projects (${rows.length})`]] : []), ...rows.map(r => [r.key, r.customerProject.trim()])], SCOPE.project || (rows.length > 1 ? '' : proj.key), v => { SCOPE.project = v; SCOPE.stream = ''; SCOPE.block = ''; });
        selectFor(kvOf('ctx-streams'), 'Show one stream', [['', 'All streams'], ...streams.map(s => [s, s])], SCOPE.stream, v => { SCOPE.stream = v; });
        selectFor(kvOf('ctx-blocks'), 'Show one block', [['', 'All blocks'], ...blocks.map(b => [b, b])], SCOPE.block, v => { SCOPE.block = v; });
        [kvOf('ctx-building'), kvOf('ctx-country-pic')].forEach(kv => kv && kv.classList.add('sf-kv-static'));
        [kvOf('ctx-streams'), kvOf('ctx-blocks')].forEach(kv => kv && kv.classList.toggle('is-narrowed', kv === kvOf('ctx-streams') ? !!SCOPE.stream : !!SCOPE.block));
        kvOf('ctx-project')?.classList.toggle('is-narrowed', !!SCOPE.project && rows.length > 1);
      }

      // MR11 shows the rows in view
      window.mr11ShownRows = (orig => function () { return orig.apply(this, arguments).filter(window.sfInScope); })(window.mr11ShownRows);
      window.refreshAll = (orig => function () {
        const out = orig.apply(this, arguments);
        if (appState.ready) renderHeaderScope();
        return out;
      })(window.refreshAll);
    })();
