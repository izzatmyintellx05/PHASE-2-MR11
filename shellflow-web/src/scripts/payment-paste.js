    // =========================================================================
    // Payment confirmation, free form. Finance pastes whatever arrived (a bank advice email,
    // an SMS, a statement line, several of them) and the site reads the amount, date and
    // reference, shows what it read so it can be corrected, suggests the matching Finance
    // line with its score, and confirms with one click.
    // =========================================================================
    const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const iso = (y, m, d) => (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '');
    function readDate(text) {
      let m = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
      if (m) return iso(+m[1], +m[2], +m[3]);
      m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
      if (m) return iso(+m[3], +m[2], +m[1]);
      m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[a-z]*\.?,?\s+(20\d{2})\b/);
      if (m && MONTHS[m[2].toLowerCase()]) return iso(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
      m = text.match(/\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/);
      if (m && MONTHS[m[1].toLowerCase()]) return iso(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
      return '';
    }
    function readAmount(text) {
      // Money first: a figure next to a currency or labelled as an amount; otherwise the largest figure with cents or thousands
      const money = [...text.matchAll(/(?:USD|US\$|\$|MYR|RM|SGD|S\$|PHP|₱|INR|Rs\.?|amount|amt|credit(?:ed)?|paid|received|sum)\s*:?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.\d{1,2})?|[0-9]+(?:\.\d{1,2})?)/gi)].map(m => m[1]);
      const plain = [...text.matchAll(/\b([0-9]{1,3}(?:,[0-9]{3})+(?:\.\d{1,2})?|[0-9]+\.\d{2})\b/g)].map(m => m[1]);
      const figures = (money.length ? money : plain).map(v => parseFloat(v.replace(/,/g, ''))).filter(n => Number.isFinite(n) && n > 0);
      return figures.length ? Math.max(...figures) : NaN;
    }
    function readRef(text) {
      let m = text.match(/\b(?:ref(?:erence)?|txn|transaction|trx|tt|id)\s*(?:no\.?|number|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/-]{4,})/i);
      if (m) return m[1].toUpperCase();
      m = text.match(/\b([A-Z]{2,}[-/][A-Z0-9-]{3,})\b/);
      return m ? m[1] : '';
    }
    // Several payments: blocks split by blank lines, or one payment per line when every line has its own amount
    function splitAdvices(text) {
      // Blank lines only separate payments when more than one part has its own amount (an email's
      // greeting and sign-off belong to the one payment it describes)
      const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
      const paying = blocks.filter(b => Number.isFinite(readAmount(b)));
      if (paying.length > 1) return paying;
      if (blocks.length > 1) return [text.trim()];
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      return lines.length > 1 && lines.every(l => Number.isFinite(readAmount(l))) ? lines : [text.trim()].filter(Boolean);
    }
    function readAdvice(text) {
      const desc = text.replace(/\s+/g, ' ').trim();
      return { text, date: readDate(text) || DEMO_TODAY, ref: readRef(text) || 'NO-REF', amount: readAmount(text), desc: desc.slice(0, 300) };
    }
    let pasteDrafts = [];

    function renderPaymentPaste() {
      const box = $('pay-paste-preview');
      if (!box) return;
      if (!pasteDrafts.length) { box.innerHTML = ''; return; }
      box.innerHTML = pasteDrafts.map((d, i) => {
        const match = Number.isFinite(d.amount) ? scoreBankLine({ ...d, status: 'OPEN' }) : { score: 0, target: null, parts: [] };
        const ok = Number.isFinite(d.amount) && d.date <= DEMO_TODAY;
        const tone = match.score >= 90 ? 'ok' : match.score >= 60 ? 'warn' : 'none';
        return `<div class="sf-paydraft" data-draft="${i}">
          <div class="sf-paydraft-head"><span class="sf-step-no">${i + 1}</span><span class="font-semibold">Payment ${pasteDrafts.length > 1 ? i + 1 : ''} read from your text</span>
            <button type="button" class="sf-link" data-pay="drop" aria-label="Remove payment ${i + 1}">Remove</button></div>
          <div class="sf-paydraft-fields">
            <label>Amount (USD)<input type="number" min="0" step="0.01" data-field="amount" value="${Number.isFinite(d.amount) ? d.amount : ''}" placeholder="Not found: type it"></label>
            <label>Date received<input type="date" data-field="date" value="${esc(d.date)}" max="${DEMO_TODAY}"></label>
            <label>Bank reference<input type="text" data-field="ref" value="${esc(d.ref)}"></label>
          </div>
          <div class="sf-paydraft-match" data-tone="${tone}">${match.target
            ? `<span><strong>Best match:</strong> ${esc(match.target.label)} · expected ${formatUSD(match.target.amount)} · score <strong>${match.score}</strong> (${esc(match.parts.join(', '))})</span>`
            : `<span>${!ok ? 'Add the amount (and a date that is not in the future) to look for a match.' : !openFinanceLines().length ? 'Every payment line is already paid, so there is nothing to match. Keep it for the record if you want.' : 'No open payment line matches yet. Check the amount, or add the project name to the text.'}</span>`}
            <span class="sf-paydraft-actions">${match.target && match.score >= 60 && ok ? `<button type="button" class="sf-btn sf-btn-sm sf-primary" data-pay="confirm">Confirm payment</button>` : ''}<button type="button" class="sf-btn sf-btn-sm" data-pay="keep" ${ok ? '' : 'disabled'}>Keep for later</button></span>
          </div>
        </div>`;
      }).join('');
    }
    function readPastedPayments() {
      if (!guard(['FINANCE'], 'confirm payments')) return;
      const text = $('bank-paste').value;
      if (!text.trim()) { notify('Paste the bank advice, SMS or statement line first.', 'error'); return; }
      pasteDrafts = splitAdvices(text).map(readAdvice);
      renderPaymentPaste();
      const missing = pasteDrafts.filter(d => !Number.isFinite(d.amount)).length;
      notify(`${plural(pasteDrafts.length, 'payment')} read${missing ? `; ${missing} without an amount, type it in` : ''}. Check them, then confirm.`, missing ? 'info' : 'success');
    }
    // The old button name keeps working
    window.importBankLines = readPastedPayments;
    window.readPastedPayments = readPastedPayments;

    document.addEventListener('input', e => {
      const el = e.target.closest && e.target.closest('#pay-paste-preview [data-field]');
      if (!el) return;
      const i = Number(el.closest('[data-draft]').dataset.draft);
      const f = el.dataset.field;
      pasteDrafts[i][f] = f === 'amount' ? parseFloat(el.value) : el.value.trim();
      clearTimeout(window.__payTimer);
      window.__payTimer = setTimeout(() => { const focus = document.activeElement?.dataset?.field; renderPaymentPaste(); if (focus) document.querySelector(`#pay-paste-preview [data-draft="${i}"] [data-field="${focus}"]`)?.focus(); }, 500);
    });
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('#pay-paste-preview [data-pay]');
      if (!b) return;
      const i = Number(b.closest('[data-draft]').dataset.draft);
      const d = pasteDrafts[i];
      if (b.dataset.pay === 'drop') { pasteDrafts.splice(i, 1); renderPaymentPaste(); return; }
      if (!guard(['FINANCE'], 'confirm payments')) return;
      if (!Number.isFinite(d.amount) || !d.date || d.date > DEMO_TODAY) { notify('Add the amount and a date that is not in the future.', 'error'); return; }
      const line = addBankLine({ date: d.date, ref: d.ref || 'NO-REF', amount: d.amount, desc: d.desc, source: 'Paste' });
      if (b.dataset.pay === 'confirm' && line.status === 'OPEN') confirmBankLine(line.id);
      pasteDrafts.splice(i, 1);
      if (!pasteDrafts.length) $('bank-paste').value = '';
      renderPaymentPaste();
      refreshAll();
    });
