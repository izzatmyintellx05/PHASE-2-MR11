
    // =========================================================================
    // MR11 LINES: as in Phase 1, every project has one MR11 line for each stream
    // with its blocks and formwork type (and product type). BD keeps the live
    // project's lines on the BD page; the sample projects carry sample lines.
    // A line's NCA m² is its own; the project's forecast, processed, produced,
    // shipped and sailed m² are split by each line's share of the m², because
    // departments report those per project. Each line also has its own selling
    // price and payment terms (blank means the project's); the project's contract
    // value, advance and payment milestones are the sum of its lines. Everything
    // else outside the MR11 ledger (alerts, gates, the CEO hub, reports) still
    // works per project.
    // =========================================================================
    const DEFAULT_LIVE_LINES = [
      { id: 'L1', stream: 'Stream 1', blocks: 'Block A', formwork: 'MIVAN/MONOLITIC FORMWORK', product: 'MFE New', m2: 450 },
      { id: 'L2', stream: 'Stream 2', blocks: 'Block B', formwork: 'MIVAN/MONOLITIC FORMWORK', product: 'MFE New', m2: 250 },
      { id: 'L3', stream: 'Stream 3', blocks: 'Central Core', formwork: 'QUICK DECK / LIGHTDECK', product: 'MFE New', m2: 150 }
    ];
    if (!Array.isArray(appState.mr11Lines)) appState.mr11Lines = DEFAULT_LIVE_LINES.map(l => ({ ...l }));
    // Sample lines for the sample projects; each set adds up to that project's NCA
    const REF_LINES = {
      'MY-26-0104': [
        { id: 'L1', stream: 'Stream 1', blocks: 'Block B1', formwork: 'MIVAN/MONOLITIC FORMWORK', product: 'MFE New', m2: 700 },
        { id: 'L2', stream: 'Stream 2', blocks: 'Block B2', formwork: 'MIVAN/MONOLITIC FORMWORK', product: 'MFE Used (Refurbished)', m2: 200, price: 118 },
        { id: 'L3', stream: 'Stream 3', blocks: 'Block B3', formwork: 'QUICK DECK / LIGHTDECK', product: 'MFE New', m2: 300, price: 132, terms: '30% Advance / 70% CAD' }
      ],
      'PH-26-0219': [
        { id: 'L1', stream: 'Stream 1', blocks: 'Core', formwork: 'QUICK DECK / LIGHTDECK', product: 'MFE Used (Refurbished)', m2: 600 },
        { id: 'L2', stream: 'Stream 2', blocks: 'Podium', formwork: 'ROBUST FORMWORK / ROBUSTFORM', product: 'MFE Used (Refurbished)', m2: 350, price: 126, terms: '30% Advance / 70% LC' }
      ],
      'SG-26-0305': [
        { id: 'L1', stream: 'Stream 1', blocks: 'Transfer', formwork: 'PREMIUM FORMWORK', product: 'Modification', m2: 420 },
        { id: 'L2', stream: 'Stream 2', blocks: 'Podium Deck', formwork: 'ADAPTER FORMWORK / ADAPTERFORM', product: 'Modification', m2: 200 }
      ],
      'IN-26-0412': [
        { id: 'L1', stream: 'Stream 1', blocks: 'Core', formwork: 'MIVAN/MONOLITIC FORMWORK', product: 'Re-Design Only (Non-physical Despatch)', m2: 300 }
      ]
    };
    const streamNumber = s => String(s ?? '').replace(/[^0-9.]/g, '') || '1';
    // A line is one stream with one formwork type and one product type
    const lineKey = l => [streamNumber(l && l.stream), String((l && l.formwork) || '').trim().toLowerCase(), String((l && l.product) || '').trim().toLowerCase()].join('|');
    const fillOf = formwork => FORMWORK_FILL[formwork] || '';
    // A line's stream number is its own; a project row keeps the old rule
    window.rowStreamNo = (orig => r => (r && r._line ? streamNumber(r._line.stream) : orig(r)))(window.rowStreamNo);
    // Processed and sailed m² are project figures, so a line gets its share of the m².
    // The amount received is worked out per line further down, from the line's own terms.
    const shareOf = r => (r && r._share !== undefined ? r._share : 1);
    ['processedOf', 'sailedOf'].forEach(name => {
      const orig = window[name];
      if (typeof orig === 'function') window[name] = r => orig(r) * shareOf(r);
    });

    function linesOf(p) {
      const defs = p.isLive ? appState.mr11Lines : REF_LINES[p.projectNo];
      return Array.isArray(defs) && defs.length ? defs : [{ id: 'L1', stream: `Stream ${p.stream || 1}`, blocks: '', formwork: p.formworkSystem, product: p.product, m2: p.ncaQty }];
    }
    // Phase 1 order: stream, then lines with no fill before filled ones, then fill, then black text first
    function lineOrder(a, b) {
      const s = parseFloat(streamNumber(a.stream)) - parseFloat(streamNumber(b.stream));
      if (s) return s;
      const fa = fillOf(a.formwork), fb = fillOf(b.formwork);
      if (!fa !== !fb) return fa ? 1 : -1;
      if (fa !== fb) return fa.localeCompare(fb);
      const ka = (PRODUCT_FONT[a.product] || '#000000') === '#000000', kb = (PRODUCT_FONT[b.product] || '#000000') === '#000000';
      return ka === kb ? 0 : ka ? -1 : 1;
    }
    function mr11Lines(projects) {
      const out = [];
      (projects || allMr11Rows()).forEach(row => {
        const p = withLineMoney(row);
        const lines = [...linesOf(p)].sort(lineOrder);
        const m2Sum = lines.reduce((a, l) => a + (Number(l.m2) || 0), 0);
        const total = m2Sum || 1;
        // Line values follow the NCA, also while the lines do not add up to it yet
        const scale = m2Sum > 0 ? (Number(p.ncaQty) || 0) / m2Sum : 0;
        const building = p.isLive ? appState.buildingName : String(p.buildingStream || '').split('/')[0].trim();
        lines.forEach((l, i) => {
          const share = (Number(l.m2) || 0) / total;
          const part = v => (Number(v) || 0) * share;
          const money = lineMoney(p, l);
          out.push({
            ...p,
            _line: l, _share: share, _lineIndex: i, _lineCount: lines.length,
            lineKey: `${p.key}~${l.id || i}`,
            buildingStream: [l.stream, l.blocks].filter(Boolean).join(' / '),
            stream: streamNumber(l.stream),
            formworkSystem: l.formwork || p.formworkSystem,
            product: l.product || p.product,
            ncaQty: Number(l.m2) || 0,
            monthsM2: p.isLive || Array.isArray(l.forecast) || Array.isArray(l.months) ? lineMonths(l) : (p.monthsM2 || []).map(part),
            _forecast: p.isLive || Array.isArray(l.forecast) ? lineForecast(l) : undefined,
            totalForecastM2: part(p.totalForecastM2),
            designFinal: p.designFinal ? part(p.designFinal) : p.designFinal,
            producedM2: part(p.producedM2),
            shippedM2: part(p.shippedM2),
            pendingM2: part(p.pendingM2),
            basePrice: money.base,
            finalPrice: money.final,
            paymentTerm: money.text,
            advancePct: money.advancePct,
            advStatus: /CLEARED/.test(p.advStatus) ? `CLEARED (${fmtNum(money.advancePct, 0)}%)` : p.advStatus,
            _terms: money.terms, _value: (Number(l.m2) || 0) * scale * money.final, _ownPrice: money.ownPrice, _ownTerms: money.ownTerms
          });
        });
      });
      return out;
    }
    function liveLinesTotal() { return appState.mr11Lines.reduce((a, l) => a + (Number(l.m2) || 0), 0); }

    // ---- Each line's own monthly forecast ----
    // A line keeps its forecast in l.forecast as [{ month: 'YYYY-MM', value: m² }]. The user picks
    // how many months and which calendar month each one is; they need not be in a row, but a
    // month can be used once per line. A line with no forecast of its own is spread evenly over
    // the project's default months (from this month on). Lines saved with the older l.months
    // (m² per month from this month on) are read as the same months.
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function monthKeyFrom(start, add) {
      const [y, m] = String(start).split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1 + add, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    function monthLabel(key) { const [y, m] = String(key).split('-').map(Number); return `${MONTH_NAMES[m - 1] || '?'} ${y}`; }
    // The months the pickers offer: the forecast window's first month and the 23 after it
    function monthChoices(extra = []) {
      const start = (typeof MONTH_KEYS !== 'undefined' && MONTH_KEYS[0]) || monthKeyFrom(new Date().toISOString().slice(0, 7), 0);
      const all = Array.from({ length: 24 }, (_, k) => monthKeyFrom(start, k));
      return [...new Set([...all, ...extra.filter(k => /^\d{4}-\d{2}$/.test(k))])].sort();
    }
    function forecastCount() { return Math.min(12, Math.max(1, parseInt(($('bd-forecast-months') || {}).value, 10) || 3)); }
    function lineForecast(l) {
      if (Array.isArray(l && l.forecast)) return l.forecast.map(f => ({ month: String(f.month), value: Number(f.value) || 0 }));
      const keys = monthChoices();
      if (Array.isArray(l && l.months)) {
        const count = forecastCount();
        return l.months.slice(0, Math.max(count, 1)).map((v, k) => ({ month: keys[k], value: Number(v) || 0 })).slice(0, count);
      }
      const count = forecastCount();
      const m2 = Number(l && l.m2) || 0;
      const share = Math.floor((m2 / count) * 100) / 100;
      return Array.from({ length: count }, (_, k) => ({ month: keys[k], value: k === count - 1 ? round2(m2 - share * (count - 1)) : share }));
    }
    window.lineForecast = lineForecast;
    // The line's forecast on the fixed six-month window that the MR11 sheets and charts use
    function lineMonths(l) {
      const out = [0, 0, 0, 0, 0, 0];
      const keys = typeof MONTH_KEYS !== 'undefined' ? MONTH_KEYS : monthChoices().slice(0, 6);
      lineForecast(l).forEach(f => { const k = keys.indexOf(f.month); if (k >= 0) out[k] += f.value; });
      return out;
    }
    window.lineMonths = lineMonths;
    // Every month any line forecasts, with the lines added up
    function projectForecastTotals() {
      const by = {};
      appState.mr11Lines.forEach(l => lineForecast(l).forEach(f => { by[f.month] = (by[f.month] || 0) + f.value; }));
      return Object.keys(by).sort().map(month => ({ month, value: round2(by[month]) }));
    }
    function syncProjectForecast() {
      const inputs = [...document.querySelectorAll('.fc-month-input')];
      if (!appState.mr11Lines.length) return;
      const window6 = [0, 0, 0, 0, 0, 0];
      appState.mr11Lines.forEach(l => lineMonths(l).forEach((v, k) => { window6[k] += v; }));
      let changed = false;
      inputs.forEach((inp, k) => {
        const v = round2(window6[k] || 0).toFixed(2);
        if (inp.value !== v) { inp.value = v; changed = true; }
      });
      showProjectForecast();
      // validateForecastSum redraws everything; only call it when the totals moved
      if (changed && typeof validateForecastSum === 'function') setTimeout(validateForecastSum, 0);
    }
    // The project's forecast box: each month the lines use, added up, and the check against the NCA
    function showProjectForecast() {
      const grid = $('bd-forecast-grid');
      if (!grid) return;
      let box = $('bd-fc-totals');
      if (!box) { box = document.createElement('div'); box.id = 'bd-fc-totals'; box.className = 'sf-fc-totals'; grid.parentNode.insertBefore(box, grid); }
      grid.hidden = true;
      const totals = projectForecastTotals();
      box.innerHTML = totals.length ? totals.map(t => `<div class="sf-fc-chip"><span>${monthLabel(t.month)}</span><strong>${fmtNum(t.value)}</strong></div>`).join('') : '<p class="text-xs text-slate-500">No months yet.</p>';
      const sum = totals.reduce((a, t) => a + t.value, 0);
      const ok = Math.abs(sum - appState.ncaArea) <= 0.05;
      const status = $('bd-forecast-status'), badge = $('fc-match-badge');
      if ($('fc-sum-m2')) $('fc-sum-m2').textContent = sum.toFixed(2) + ' m²';
      if ($('fc-month-count')) $('fc-month-count').textContent = totals.length;
      if (status) status.className = `p-3 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2 border ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'}`;
      if (badge) { badge.className = `font-bold ${ok ? 'text-emerald-700' : 'text-amber-800'}`; badge.textContent = ok ? `✓ Matches the NCA (${fmtNum(appState.ncaArea)} m²)` : `⚠ ${fmtNum(Math.abs(sum - appState.ncaArea))} m² ${sum < appState.ncaArea ? 'short of' : 'over'} the NCA (${fmtNum(appState.ncaArea)} m²)`; }
    }
    // The project check counts every month, also those after the six-month window
    if (typeof window.validateForecastSum === 'function') {
      window.validateForecastSum = (orig => function () { const r = orig.apply(this, arguments); if (appState.mr11Lines.length) showProjectForecast(); return r; })(window.validateForecastSum);
    }

    // ---- Each line's own selling price and payment terms ----
    // A line's selling price takes the place of the project's selling price. The project's
    // add-ons (props and accessories, LME, aluminium, freight) still go on top, so the line's
    // final price moves with the LME like the project's does. A line with no price or no
    // terms of its own uses the project's.
    const TERM_PRESETS = ['100% Advance', '50% Advance / 50% CAD', '30% Advance / 70% CAD', '20% Advance / 80% CAD', '10% Advance / 90% CAD', '30% Advance / 70% LC', '20% Advance / 80% TT'];
    const TERM_ORDER = ['Advance', 'CAD', 'LC', 'TT'];
    const round2 = n => Math.round(n * 100) / 100;
    function termType(word) {
      const w = String(word || '').trim();
      if (/^adv/i.test(w)) return 'Advance';
      if (/^(cad|lc|tt)$/i.test(w)) return w.toUpperCase();
      return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '';
    }
    // Reads "20% Adv / 80% CAD", "30% Advance / 70% LC" or "Advance 20%"; the same type twice is added up
    function parseTerms(text) {
      const byType = {};
      String(text || '').split(/[\/;+]/).forEach(part => {
        let m = part.match(/(\d+(?:\.\d+)?)\s*%\s*([A-Za-z]+)/), pct, word;
        if (m) { pct = m[1]; word = m[2]; } else if ((m = part.match(/([A-Za-z]+)\s*(\d+(?:\.\d+)?)\s*%/))) { pct = m[2]; word = m[1]; } else return;
        const type = termType(word);
        if (type) byType[type] = (byType[type] || 0) + parseFloat(pct);
      });
      return Object.entries(byType).map(([type, pct]) => ({ type, pct }));
    }
    const formatTerms = terms => terms.map(t => `${fmtNum(t.pct, t.pct % 1 ? 1 : 0)}% ${t.type}`).join(' / ');
    const termsTotalOf = terms => terms.reduce((a, t) => a + t.pct, 0);
    const advanceOf = terms => terms.filter(t => t.type === 'Advance').reduce((a, t) => a + t.pct, 0);
    const ownPrice = l => !!l && l.price !== undefined && l.price !== null && l.price !== '' && Number.isFinite(Number(l.price));
    const ownTerms = l => !!l && typeof l.terms === 'string' && l.terms.trim() !== '';
    const origTermsList = window.termsList;
    function projectTermsOf(p) {
      if (p.isLive) return origTermsList().map(t => ({ type: t.type, pct: t.pct }));
      return parseTerms(p._listTerm ?? p.paymentTerm);
    }
    function lineMoney(p, l) {
      const listBase = Number(p._listBase ?? p.basePrice) || 0;
      const listFinal = Number(p._listFinal ?? p.finalPrice) || 0;
      const base = ownPrice(l) ? Number(l.price) : listBase;
      const terms = ownTerms(l) ? parseTerms(l.terms) : projectTermsOf(p);
      return {
        base, final: listFinal + (base - listBase), terms, advancePct: advanceOf(terms),
        // Always written the same way ("20% Advance / 80% CAD"), so the Payment Term filter groups them
        text: terms.length ? formatTerms(terms) : (p._listTerm ?? p.paymentTerm),
        ownPrice: ownPrice(l), ownTerms: ownTerms(l)
      };
    }
    // A project row keeps its own price and terms as the default for its lines, and shows
    // what its lines add up to: the m²-weighted price and the value-weighted advance
    function withLineMoney(p) {
      if (!p || p._listFinal !== undefined) return p;
      const q = { ...p, _listBase: p.basePrice, _listFinal: p.finalPrice, _listTerm: p.paymentTerm };
      const lines = linesOf(p);
      const m2 = lines.reduce((a, l) => a + (Number(l.m2) || 0), 0);
      if (!(m2 > 0) || !lines.some(l => ownPrice(l) || ownTerms(l))) return q;
      let value = 0, base = 0, adv = 0;
      lines.forEach(l => {
        const money = lineMoney(q, l), a = Number(l.m2) || 0;
        value += a * money.final; base += a * money.base; adv += a * money.final * money.advancePct;
      });
      q.finalPrice = value / m2;
      q.basePrice = base / m2;
      if (value) q.advancePct = adv / value;
      if (!p.isLive && lines.some(ownTerms)) q.paymentTerm = `By line: ${[...new Set(lines.map(l => lineMoney(q, l).text))].join(' · ')}`;
      q._linesPriced = true;
      return q;
    }
    window.allMr11Rows = (orig => () => orig().map(withLineMoney))(window.allMr11Rows);

    // The live project: its contract value and payment milestones come from its lines
    function liveMoney() {
      const p = { isLive: true, _listBase: appState.basePrice, _listFinal: appState.finalUnitRate };
      const m2 = liveLinesTotal();
      const scale = m2 > 0 ? appState.ncaArea / m2 : 0;
      const rows = appState.mr11Lines.map(l => { const money = lineMoney(p, l); return { l, money, value: (Number(l.m2) || 0) * scale * money.final }; });
      const priced = m2 > 0 && appState.mr11Lines.some(ownPrice);
      const value = priced ? rows.reduce((a, x) => a + x.value, 0) : appState.ncaArea * appState.finalUnitRate;
      return { rows, value, rate: priced && appState.ncaArea ? value / appState.ncaArea : appState.finalUnitRate, priced, termed: m2 > 0 && appState.mr11Lines.some(ownTerms) };
    }
    // Milestones by type: each line adds its value times its own percentages. Types the project's
    // milestones do not have are added after them with a fixed number, so payments stay attached.
    window.termsList = function () {
      const live = liveMoney();
      appState.totalContractValue = live.value;
      const base = origTermsList();
      if (!live.termed) return base;
      const byType = {};
      live.rows.forEach(x => x.money.terms.forEach(t => { byType[t.type] = (byType[t.type] || 0) + x.value * t.pct / 100; }));
      const pctOfType = {};
      base.forEach(t => { pctOfType[t.type] = (pctOfType[t.type] || 0) + t.pct; });
      const pctOf = amount => (live.value ? amount / live.value * 100 : 0);
      const out = base.map(t => { const amount = round2((byType[t.type] || 0) * t.pct / pctOfType[t.type]); return { idx: t.idx, type: t.type, pct: pctOf(amount), amount }; }).filter(t => t.amount > 0);
      const rank = type => (TERM_ORDER.includes(type) ? TERM_ORDER.indexOf(type) : TERM_ORDER.length);
      const extra = Object.keys(byType).filter(type => !(type in pctOfType) && byType[type] > 0).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
      // Numbered after the project's milestones; the number only depends on the project's own types
      const spare = TERM_ORDER.filter(type => !(type in pctOfType));
      extra.forEach((type, n) => { const amount = round2(byType[type]); out.push({ idx: 3 + (spare.includes(type) ? spare.indexOf(type) : spare.length + n), type, pct: pctOf(amount), amount }); });
      return out;
    };
    function syncLiveContract() {
      const live = liveMoney();
      appState.totalContractValue = live.value;
      ['summary-total-contract', 'ctx-contract', 'fin-banner-total', 'fin-table-header-total'].forEach(id => { const el = $(id); if (el) el.textContent = formatUSD(live.value); });
      const rate = $('summary-unit-rate');
      if (rate && live.priced) rate.textContent = `${formatUSD(live.rate)} / m² (lines)`;
    }
    window.recalculateCommercial = (orig => function () {
      const out = orig.apply(this, arguments);
      syncLiveContract();
      return out;
    })(window.recalculateCommercial);
    // A sample project's open advance is what its lines' advances add up to
    window.openFinanceLines = (orig => () => orig().map(f => {
      if (f.row === 'LIVE') return f;
      const ref = referenceMR11Projects.find(r => r.key === f.row);
      const q = ref && withLineMoney({ ...ref, isLive: false });
      return q && q._linesPriced ? { ...f, amount: round2(q.ncaQty * q.finalPrice * (q.advancePct || 0) / 100) } : f;
    }))(window.openFinanceLines);
    // A live line receives its part of each milestone that has been paid, by its own terms
    function liveLineReceived(r) {
      const adv = advanceTerm();
      const byType = {};
      termsList().forEach(t => {
        const got = t.idx === adv.idx ? (appState.advanceCleared ? (appState.advanceReceived ?? t.amount) : 0) : (appState.otherPaid[t.idx]?.amount || 0);
        const e = byType[t.type] || (byType[t.type] = { amount: 0, got: 0 });
        e.amount += t.amount; e.got += got;
      });
      return (r._terms || []).reduce((a, t) => { const e = byType[t.type]; return a + (e && e.amount > 0 ? e.got * (r._value * t.pct / 100) / e.amount : 0); }, 0);
    }
    window.actualReceivedOf = (orig => r => (r && r.isLive && r._line ? liveLineReceived(r) : orig(r)))(window.actualReceivedOf);

    // ---- The BD page: the live project's MR11 lines ----
    function renderBdLines() {
      // The contract value shown on the BD and Finance pages always comes from the lines
      syncLiveContract();
      const box = $('bd-lines');
      // Never redraw under someone who is typing in a line
      if (!box || box.contains(document.activeElement)) return;
      const editable = can('BD');
      const total = liveLinesTotal();
      const nca = appState.ncaArea;
      const ok = Math.abs(total - nca) < 0.01;
      const opt = (values, current) => values.map(v => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(v)}</option>`).join('');
      // Stream suggestions: the streams in use, then the next stream number for a new one
      const used = [...new Set([...appState.mr11Lines.map(l => l.stream), ...appState.streams])].filter(Boolean);
      const nextStream = `Stream ${Math.max(0, ...used.map(st => parseFloat(streamNumber(st)) || 0)) + 1}`;
      const streams = [...used, nextStream];
      const dis = editable ? '' : 'disabled';
      const live = liveMoney();
      const repeats = [...new Set(appState.mr11Lines.map(lineKey).filter((n, i, all) => all.indexOf(n) !== i))].map(k => { const [n, f, p] = k.split('|'); const l = appState.mr11Lines.find(x => lineKey(x) === k); return `Stream ${n} (${l.formwork}, ${l.product})`; });
      const projectTerms = formatTerms(projectTermsOf({ isLive: true }));
      const lineValue = (l, money) => (Number(l.m2) || 0) * money.final;
      const valueTotal = live.rows.reduce((a, x) => a + lineValue(x.l, x.money), 0);
      const termsNote = money => {
        const sum = termsTotalOf(money.terms);
        if (Math.abs(sum - 100) >= 0.01) return `<span class="block mt-0.5 text-[10px] font-bold text-rose-700">Adds up to ${fmtNum(sum, 0)}%, not 100%</span>`;
        return `<span class="block mt-0.5 text-[10px] text-slate-500">${money.ownTerms ? 'Own terms' : 'Project terms'} · advance ${fmtNum(money.advancePct, 0)}%</span>`;
      };
      const field = (label, html, cls = '') => `<label class="sf-lc-f ${cls}"><span class="sf-line-k">${label}</span>${html}</label>`;
      const inp = 'w-full px-2 py-1.5 border border-slate-300 rounded-lg';
      box.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-slate-500">A blank price or blank terms use the project's, below.</p>
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}">${ok ? `Lines match the NCA (${fmtNum(nca)} m²)` : `Lines add up to ${fmtNum(total)} m², the NCA is ${fmtNum(nca)} m²`}</span>
        </div>
        <div class="sf-lc-list">${live.rows.map(({ l, money }, i) => {
          const fc = lineForecast(l);
          const lineM2 = Number(l.m2) || 0;
          const mSum = fc.reduce((a, f) => a + f.value, 0);
          const mOk = Math.abs(mSum - lineM2) < 0.05;
          const used = fc.map(f => f.month);
          const dupes = used.filter((m, k) => used.indexOf(m) !== k);
          const choices = monthChoices(used);
          const pct = v => (lineM2 > 0 ? `${fmtNum((v / lineM2) * 100, 0)}%` : '–');
          return `<article data-line="${i}" class="sf-lc" aria-label="MR11 line ${i + 1}">
          <header class="sf-lc-h">
            <span class="sf-lc-no"><span class="sf-fill-dot" style="background:${fillOf(l.formwork) || 'transparent'}" title="MR11 fill colour"></span>Line ${i + 1}</span>
            <span class="sf-lc-sum">${esc(l.stream)} · ${esc(l.formwork)} · <span style="color:${PRODUCT_FONT[l.product] || 'inherit'}">${esc(l.product)}</span></span>
            ${editable && appState.mr11Lines.length > 1 ? `<button type="button" data-lines="remove" class="sf-btn sf-btn-sm" aria-label="Remove line ${i + 1}">Remove</button>` : ''}
          </header>
          <div class="sf-lc-grid sf-lc-scope">
            ${field('Stream', `<input data-field="stream" list="bd-lines-streams" value="${esc(l.stream)}" class="${inp}" ${dis}>`)}
            ${field('Building / block', `<input data-field="blocks" list="bd-lines-blocks" value="${esc(l.blocks)}" class="${inp}" ${dis}>`)}
            ${field('Formwork type', `<select data-field="formwork" title="${esc(l.formwork)}" class="${inp}" ${dis}>${opt(Object.keys(FORMWORK_FILL), l.formwork)}</select>`)}
            ${field('Product type', `<select data-field="product" title="${esc(l.product)}" class="${inp}" style="color:${PRODUCT_FONT[l.product] || '#000000'}" ${dis}>${opt(Object.keys(PRODUCT_FONT), l.product)}</select>`)}
            ${field('NCA m²', `<input data-field="m2" type="number" min="0" step="0.01" value="${Number(l.m2) || 0}" class="${inp} text-right font-mono" ${dis}>`)}
          </div>
          <div class="sf-lc-grid sf-lc-money">
            ${field('Selling price (USD/m²)', `<input data-field="price" type="number" min="0" step="0.01" value="${money.ownPrice ? Number(l.price) : ''}" placeholder="${fmtNum(appState.basePrice)}" class="${inp} text-right font-mono" ${dis}><span class="sf-line-n">${money.ownPrice ? 'Own price' : 'Project price'} · final ${formatUSD(money.final)}</span>`)}
            ${field('Payment terms', `<input data-field="terms" list="bd-lines-terms" value="${money.ownTerms ? esc(l.terms) : ''}" placeholder="${esc(projectTerms)}" class="${inp}" ${dis}>${termsNote(money)}`, 'sf-lc-wide')}
            <div class="sf-lc-f"><span class="sf-line-k">Line value</span><span class="sf-line-v">${formatUSD(lineValue(l, money))}</span></div>
          </div>
          <div class="sf-lc-fc">
            <div class="sf-lc-fc-h">
              <span class="sf-line-k">Monthly forecast</span>
              <label class="sf-lc-count"><span>Months</span><select data-field="fcCount" aria-label="Number of forecast months for line ${i + 1}" ${dis}>${Array.from({ length: 12 }, (_, k) => `<option value="${k + 1}" ${k + 1 === fc.length ? 'selected' : ''}>${k + 1}</option>`).join('')}</select></label>
              <span class="sf-line-n ${mOk ? '' : 'sf-lc-bad'}">${mOk ? `✓ Adds up to the line's ${fmtNum(lineM2)} m²` : `⚠ ${fmtNum(mSum)} of ${fmtNum(lineM2)} m²`}${Array.isArray(l.forecast) || Array.isArray(l.months) ? '' : ' · even split'}</span>
            </div>
            <div class="sf-lc-slots">${fc.map((f, k) => `<div class="sf-lc-slot ${dupes.includes(f.month) ? 'sf-lc-dupe' : ''}" data-slot="${k}">
              <select data-field="fcMonth" data-m="${k}" aria-label="Month ${k + 1} of line ${i + 1}" ${dis}>${choices.map(c => `<option value="${c}" ${c === f.month ? 'selected' : ''} ${c !== f.month && used.includes(c) ? 'disabled' : ''}>${monthLabel(c)}</option>`).join('')}</select>
              <input data-field="fcValue" data-m="${k}" type="number" min="0" step="0.01" value="${round2(f.value)}" aria-label="m² in ${monthLabel(f.month)} for line ${i + 1}" ${dis}>
              <span class="sf-lc-pct" title="Share of the line's m²">${pct(f.value)}</span>
            </div>`).join('')}</div>
            ${dupes.length ? `<p class="sf-lc-bad text-[11px]">${[...new Set(dupes)].map(monthLabel).join(', ')} is picked more than once. Pick a different month.</p>` : ''}
          </div>
        </article>`; }).join('')}</div>
        <div class="sf-lc-total"><span>Total of ${plural(appState.mr11Lines.length, 'line')} · line value ${formatUSD(valueTotal)}${live.priced ? ` · average final price ${formatUSD(valueTotal / (total || 1))} / m²` : ''}</span><strong class="font-mono">${fmtNum(total)} m²</strong></div>
        <datalist id="bd-lines-blocks">${appState.blocks.map(b => `<option value="${esc(b)}"></option>`).join('')}</datalist>
        <datalist id="bd-lines-streams">${streams.map(st => `<option value="${esc(st)}"></option>`).join('')}</datalist>
        <datalist id="bd-lines-terms">${TERM_PRESETS.map(t => `<option value="${esc(t)}"></option>`).join('')}</datalist>
        ${repeats.length ? `<p class="px-3 py-2 rounded-lg bg-rose-50 text-rose-800 text-xs font-semibold">${esc(repeats.join(', '))} ${repeats.length === 1 ? 'has' : 'have'} more than one line. A stream has one line for each formwork and product type: combine them${editable ? ' with the button below' : ''}.</p>` : ''}
        <div class="flex flex-wrap items-center gap-2">${editable && repeats.length ? '<button type="button" data-lines="combine" class="sf-btn sf-btn-sm sf-primary">Combine repeated lines</button>' : ''}${editable ? `<button type="button" data-lines="add" class="sf-btn sf-btn-sm sf-primary">Add a line</button>${!ok ? '<button type="button" data-lines="fit" class="sf-btn sf-btn-sm">Adjust the last line to match the NCA</button>' : ''}<button type="button" data-lines="spread" class="sf-btn sf-btn-sm">Spread every line evenly</button>` : '<span class="text-[11px] text-slate-500">BD keeps these lines; you can view them.</span>'}
          <button type="button" class="sf-btn sf-btn-sm" onclick="switchTab(9)">See the lines in MR11</button></div>`;
      syncProjectForecast();
    }
    // The project's stream list, block list, formwork type and product type come from its lines.
    // The hidden fields in section 1 carry them on to Steps 2-7; the main formwork and product
    // type are those of the line with the most m².
    function syncProjectFromLines() {
      const lines = appState.mr11Lines;
      const uniq = list => [...new Set(list.map(v => String(v || '').trim()).filter(Boolean))];
      const streams = uniq([...lines].sort((a, b) => (parseFloat(streamNumber(a.stream)) || 0) - (parseFloat(streamNumber(b.stream)) || 0)).map(l => l.stream));
      const blocks = uniq(lines.flatMap(l => String(l.blocks || '').split(',')));
      const main = lines.reduce((m, l) => (!m || (Number(l.m2) || 0) > (Number(m.m2) || 0) ? l : m), null);
      let changed = false;
      const set = (id, value) => { const el = $(id); if (el && value && el.value !== value) { el.value = value; changed = true; } };
      set('bd-streams-input', streams.join(', '));
      set('bd-blocks-input', blocks.join(', '));
      if (main) { set('bd-formwork-type', main.formwork); set('bd-product-type', main.product); }
      if (changed) propagateBDData();
    }
    function changeBdLines(mutate, what) {
      if (!guard(['BD'], 'change MR11 lines')) { renderBdLines(); return; }
      mutate(appState.mr11Lines);
      logActivity(what);
      syncProjectFromLines();
      recalculateCommercial();
      refreshAll();
    }
    document.addEventListener('change', e => {
      const el = e.target;
      if (!el.closest || !el.closest('#bd-lines') || !el.dataset.field) return;
      const i = Number(el.closest('[data-line]').dataset.line);
      const field = el.dataset.field;
      const before = appState.mr11Lines[i]?.[field];
      let value;
      if (field === 'fcCount' || field === 'fcMonth' || field === 'fcValue') {
        const line = appState.mr11Lines[i];
        const fc = lineForecast(line).map(f => ({ month: f.month, value: round2(f.value) }));
        const k = Number(el.dataset.m);
        let what;
        if (field === 'fcCount') {
          const n = Math.min(12, Math.max(1, parseInt(el.value, 10) || 1));
          if (n === fc.length) return;
          // Fewer months keeps the first ones; more months adds empty ones on the next free months
          if (n < fc.length) fc.length = n;
          else {
            const free = monthChoices(fc.map(f => f.month)).filter(m => !fc.some(f => f.month === m));
            const last = fc.length ? fc[fc.length - 1].month : '';
            const after = free.filter(m => m > last);
            const pick = [...after, ...free.filter(m => m <= last)];
            while (fc.length < n && pick.length) fc.push({ month: pick.shift(), value: 0 });
          }
          what = `forecast set to ${plural(fc.length, 'month')}`;
        } else if (field === 'fcMonth') {
          const month = el.value;
          if (fc.some((f, j) => j !== k && f.month === month)) { notify(`${monthLabel(month)} is already in this line's forecast. Pick a different month.`, 'error'); el.value = fc[k].month; return; }
          if (fc[k].month === month) return;
          what = `forecast month ${k + 1} changed from ${monthLabel(fc[k].month)} to ${monthLabel(month)}`;
          fc[k].month = month;
        } else {
          const v = Math.max(0, Math.round((parseFloat(el.value) || 0) * 100) / 100);
          if (fc[k].value === v) return;
          what = `${monthLabel(fc[k].month)} forecast changed from ${fmtNum(fc[k].value)} to ${fmtNum(v)} m²`;
          fc[k].value = v;
        }
        changeBdLines(lines => { lines[i].forecast = fc; delete lines[i].months; }, `MR11 line ${i + 1}: ${what}`);
        return;
      }
      if (field === 'm2') value = Math.max(0, parseFloat(el.value) || 0);
      else if (field === 'price') { const n = parseFloat(el.value); value = Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : null; }
      else if (field === 'terms') {
        const text = el.value.trim();
        const parsed = parseTerms(text);
        if (text && !parsed.length) { notify('Write payment terms like "20% Advance / 80% CAD".', 'error'); el.value = ownTerms(appState.mr11Lines[i]) ? before : ''; return; }
        value = text ? formatTerms(parsed) : '';
        el.value = value;
      } else if (field === 'stream' && !el.value.trim()) { el.value = before || ''; return; } else value = el.value.trim();
      // One line per stream + formwork type + product type: the same stream can have more lines
      // only when the formwork or product type differs
      if (field === 'stream' || field === 'formwork' || field === 'product') {
        const k = lineKey({ ...appState.mr11Lines[i], [field]: value });
        const taken = appState.mr11Lines.findIndex((l, j) => j !== i && lineKey(l) === k);
        if (taken >= 0) { notify(`Line ${taken + 1} already has this stream with the same formwork and product type. Change the formwork or product type to make it a separate line.`, 'error'); el.value = before || ''; return; }
      }
      if (String(before ?? '') === String(value ?? '')) return;
      const name = { m2: 'NCA m²', price: 'selling price', terms: 'payment terms' }[field] || field;
      const shown = v => (v === null || v === undefined || v === '' ? "the project's" : `"${v}"`);
      changeBdLines(lines => { if (field === 'm2' && (Array.isArray(lines[i].forecast) || Array.isArray(lines[i].months))) { const fc = lineForecast(lines[i]); const old = fc.reduce((a, f) => a + f.value, 0); lines[i].forecast = fc.map(f => ({ month: f.month, value: round2(old > 0 ? f.value * value / old : value / fc.length) })); delete lines[i].months; } lines[i][field] = value; }, `MR11 line ${i + 1}: ${name} changed from ${shown(before)} to ${shown(value)}`);
    });
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('#bd-lines [data-lines]');
      if (!b) return;
      const act = b.dataset.lines;
      if (act === 'add') {
        const last = appState.mr11Lines[appState.mr11Lines.length - 1] || {};
        const id = `L${Math.max(0, ...appState.mr11Lines.map(l => Number(String(l.id).replace(/\D/g, '')) || 0)) + 1}`;
        // A new line starts on the next stream number, since each stream has one line
        const next = `Stream ${Math.max(0, ...appState.mr11Lines.map(l => parseFloat(streamNumber(l.stream)) || 0)) + 1}`;
        changeBdLines(lines => lines.push({ id, stream: next, blocks: '', formwork: last.formwork || appState.formworkType, product: last.product || appState.productType, m2: 0, price: ownPrice(last) ? Number(last.price) : null, terms: ownTerms(last) ? last.terms : '' }), `Added MR11 line ${appState.mr11Lines.length + 1}`);
      } else if (act === 'remove') {
        const i = Number(b.closest('[data-line]').dataset.line);
        changeBdLines(lines => lines.splice(i, 1), `Removed MR11 line ${i + 1}`);
      } else if (act === 'combine') {
        changeBdLines(lines => {
          const kept = [];
          lines.forEach(l => {
            const same = kept.find(k => lineKey(k) === lineKey(l));
            if (!same) { kept.push(l); return; }
            same.m2 = Math.round(((Number(same.m2) || 0) + (Number(l.m2) || 0)) * 100) / 100;
            if (same.forecast || l.forecast || same.months || l.months) { const by = {}; [...lineForecast(same), ...lineForecast(l)].forEach(f => { by[f.month] = round2((by[f.month] || 0) + f.value); }); same.forecast = Object.keys(by).sort().map(month => ({ month, value: by[month] })); delete same.months; }
            same.blocks = [...new Set([same.blocks, l.blocks].flatMap(b => String(b || '').split(',')).map(b => b.trim()).filter(Boolean))].join(', ');
          });
          lines.splice(0, lines.length, ...kept);
        }, 'Combined MR11 lines with the same stream, formwork and product type');
      } else if (act === 'spread') {
        changeBdLines(lines => lines.forEach(l => { delete l.months; delete l.forecast; }), 'Spread every MR11 line evenly over the default months');
      } else if (act === 'fit') {
        changeBdLines(lines => { const last = lines[lines.length - 1]; last.m2 = Math.max(0, Number((appState.ncaArea - (liveLinesTotal() - (Number(last.m2) || 0))).toFixed(2))); delete last.months; delete last.forecast; }, 'Adjusted the last MR11 line to match the NCA');
      }
    });
