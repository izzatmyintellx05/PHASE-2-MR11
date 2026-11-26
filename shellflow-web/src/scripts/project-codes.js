    // =========================================================================
    // PROJECT NO. AND SHORT NAME: made automatically on the Business Development page
    // Project No. has 6 digits, for example 261110:
    //   26 = year, 1 = country (0 Malaysia, 1 India, ...), 11 = the 11th project that year, 0 = stream
    // The project itself ends in 0. Streams are chosen on the MR11 lines, and each line ends
    // in its own stream (261111 for Stream 1, 261112 for Stream 2, ...).
    // The short name is up to 5 letters and numbers taken from the project name (Skyline Tower
    // Phase 2 = ST2). Both are unique across every project.
    // =========================================================================
    (function () {
      const COUNTRY_DIGITS = [
        [/malaysia|\(my\)/i, 0], [/india|\(in\)/i, 1], [/singapore|\(sg\)/i, 2], [/philippines|\(ph\)/i, 3],
        [/indonesia|\(id\)/i, 4], [/thailand|\(th\)/i, 5], [/viet ?nam|\(vn\)/i, 6], [/brunei|\(bn\)/i, 7], [/sri lanka|\(lk\)/i, 8]
      ];
      const countryDigit = c => { const hit = COUNTRY_DIGITS.find(([re]) => re.test(String(c || ''))); return hit ? hit[1] : 9; };
      const COUNTRY_NAMES = ['Malaysia', 'India', 'Singapore', 'Philippines', 'Indonesia', 'Thailand', 'Vietnam', 'Brunei', 'Sri Lanka', 'other countries'];
      const isCode = v => /^\d{6}$/.test(String(v || ''));
      const streamDigit = s => { const n = String(s ?? '').replace(/\D/g, ''); return n ? n.slice(-1) : '1'; };

      // Every other project (and sample row) the site knows about
      const otherRows = () => (typeof allMr11Rows === 'function' ? allMr11Rows() : []).filter(r => !r.isLive && !r.deleted);
      const takenShort = () => new Set(otherRows().map(r => String(r.shortName || '').trim().toUpperCase()).filter(Boolean));
      // Year + project number (digits 1-2 and 4-5) is what makes a project unique; the country digit is a label
      const takenNumbers = () => new Set(otherRows().map(r => String(r.projectNo || '')).filter(isCode).map(no => no.slice(0, 2) + no.slice(3, 5)));

      function lowestStream() {
        const n = (appState.mr11Lines || []).map(l => parseInt(String(l.stream).replace(/\D/g, ''), 10)).filter(x => x > 0);
        return n.length ? Math.min(...n) : 1;
      }
      function makeProjectNo(current) {
        const year = isCode(current) ? current.slice(0, 2) : String(new Date().getFullYear()).slice(2);
        const used = takenNumbers();
        let nn = isCode(current) ? Number(current.slice(3, 5)) : 0;
        if (!nn || used.has(year + String(nn).padStart(2, '0'))) {
          // The next project number this year
          const thisYear = [...used].filter(k => k.startsWith(year)).map(k => Number(k.slice(2)));
          nn = Math.max(0, ...thisYear) + 1;
          while (used.has(year + String(nn).padStart(2, '0')) && nn < 99) nn++;
        }
        return `${year}${countryDigit(appState.countryName)}${String(Math.min(nn, 99)).padStart(2, '0')}0`;
      }

      const SKIP = new Set(['the', 'of', 'and', 'phase', 'project', 'sdn', 'bhd', 'pvt', 'ltd', 'at', 'in', 'for', 'by']);
      function makeShortName(name) {
        const words = String(name || '').split(/[^A-Za-z0-9]+/).filter(Boolean);
        const letters = words.filter(w => /^[A-Za-z]/.test(w) && !SKIP.has(w.toLowerCase()));
        const numbers = words.filter(w => /^\d+$/.test(w)).join('');
        let base = letters.map(w => w[0]).join('');
        if (base.length < 2 && letters[0]) base = letters[0].slice(0, 3);
        base = (base + numbers).toUpperCase().slice(0, 5) || 'PRJ';
        return uniqueShort(base);
      }
      function uniqueShort(base) {
        const used = takenShort();
        if (!used.has(base)) return base;
        for (let i = 2; i < 1000; i++) {
          const tail = String(i);
          const next = base.slice(0, 5 - tail.length) + tail;
          if (!used.has(next)) return next;
        }
        return base;
      }

      const field = id => document.getElementById(id);
      let lastAutoShort = null;
      // Fill in both on the BD page: the number always follows the rules; the short name is
      // made from the project name until BD types their own
      function fillCodes() {
        if (!appState.ready || !(can('BD'))) return false;
        const no = field('bd-project-no'), short = field('bd-short-name');
        if (!no || !short) return false;
        let changed = false;
        const nextNo = makeProjectNo(no.value.trim());
        if (no.value !== nextNo) { no.value = nextNo; changed = true; }
        const cur = short.value.trim().toUpperCase();
        const auto = makeShortName(field('bd-project-name')?.value);
        if (!cur || cur === lastAutoShort || takenShort().has(cur)) {
          if (cur && takenShort().has(cur) && cur !== lastAutoShort) notify(`Short name ${cur} is already used by another project, so it was changed to ${auto}.`, 'error');
          if (short.value !== auto) { short.value = auto; changed = true; }
          lastAutoShort = auto;
        }
        return changed;
      }

      // The fields themselves: Project No. is made for you; the short name takes 5 letters or numbers
      const no = field('bd-project-no'), short = field('bd-short-name');
      if (no) {
        no.readOnly = true;
        no.setAttribute('aria-readonly', 'true');
        no.classList.add('bg-slate-50');
        const label = no.closest('div')?.querySelector('label');
        if (label) label.textContent = 'Project No. (made automatically)';
      }
      if (short) {
        short.maxLength = 5;
        short.setAttribute('pattern', '[A-Za-z0-9]{1,5}');
        const label = short.closest('div')?.querySelector('label');
        if (label) label.textContent = 'Short Name (up to 5 letters or numbers)';
        short.addEventListener('input', () => {
          const clean = short.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
          if (clean !== short.value) short.value = clean;
        });
        short.addEventListener('change', () => {
          const v = short.value.trim().toUpperCase();
          if (v && takenShort().has(v)) {
            const free = uniqueShort(v);
            notify(`Short name ${v} is already used by another project. ${free} is free.`, 'error');
            short.value = free;
            propagateBDData();
          }
        });
      }

      window.propagateBDData = (orig => function () {
        const out = orig.apply(this, arguments);
        const hint = field('bd-project-no-hint');
        const code = field('bd-project-no')?.value || '';
        if (hint && isCode(code)) {
          const c = Number(code[2]);
          const lines = [...new Set((appState.mr11Lines || []).map(l => streamDigit(l.stream)))].sort().map(d => code.slice(0, 5) + d);
          hint.textContent = `20${code.slice(0, 2)} · ${c === 9 ? 'other country' : COUNTRY_NAMES[c]} (${c}) · project ${code.slice(3, 5)} · ends in 0. Streams: ${lines.join(', ') || 'none yet'}.`;
        }
        return out;
      })(window.propagateBDData);
      window.refreshAll = (orig => function () {
        if (fillCodes()) propagateBDData();
        return orig.apply(this, arguments);
      })(window.refreshAll);

      // A project row's stream comes from its lines, not from the project number
      window.rowStreamNo = (orig => r => (r && r.isLive && !r._line ? String(lowestStream()) : orig(r)))(window.rowStreamNo);
      // Each MR11 line's own number: the project's first five digits and the line's stream
      window.mr11LineNo = r => {
        const no = String((r && r.projectNo) || '');
        return isCode(no) && r._line ? no.slice(0, 5) + streamDigit(r._line.stream) : no;
      };
    })();
