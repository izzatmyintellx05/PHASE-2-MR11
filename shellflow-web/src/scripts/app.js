
    // =========================================================================
    // CENTRAL APPLICATION STATE
    // =========================================================================
    // The prototype runs on a fixed demo clock so SLA timers and reminders always show the same story
    const DEMO_NOW = new Date(window.SHELLFLOW_NOW || '2026-11-18T09:00:00');
    const DEMO_TODAY = `${DEMO_NOW.getFullYear()}-${String(DEMO_NOW.getMonth() + 1).padStart(2, '0')}-${String(DEMO_NOW.getDate()).padStart(2, '0')}`;
    const ROLES = { ADMIN: 'Administrator', BD: 'BD', FINANCE: 'Finance', SHELLPLAN: 'Shell Plan', DESIGN: 'Design', PLANNING: 'Planning', PRODUCTION: 'Production', DISPATCH: 'Dispatch', CEO: 'CEO' };
    const DEPT_KEYS = ['BD', 'FINANCE', 'SHELLPLAN', 'DESIGN', 'PLANNING', 'PRODUCTION', 'DISPATCH'];
    const MONTH_LABELS = ['Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27'];
    const MONTH_KEYS = ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04'];
    // Sample rates for the demo; the live system reads Bank Negara Malaysia rates
    const USD_RATES = { USD: 1, MYR: 4.2, SGD: 1.3, INR: 88 };
    // Product type shows as the row's font colour, formwork type as its fill colour
    const PRODUCT_FONT = { 'MFE New': '#000000', 'Re-Design Only (Non-physical Despatch)': '#0000FF', 'Modification': '#FF0000', 'Direct': '#7030A0', 'MFE Used (Refurbished)': '#00B050' };
    const FORMWORK_FILL = { 'PREMIUM FORMWORK': '#E4B8F0', 'MIVAN/MONOLITIC FORMWORK': '', 'QUICK DECK / LIGHTDECK': '#FFA500', 'ROBUST FORMWORK / ROBUSTFORM': '#F8CBAD', 'ADAPTER FORMWORK / ADAPTERFORM': '#9DC3E6', 'ECO FORMWORK / ECOFORM': '#92D050', 'VERTICAL FORMWORK / VERTIPRO': '#FFFF00' };
    const GATE_DEFS = [
      { id: 'design', name: '1. Formwork Design', need: 'COMPLETED', impact: 'Drawing revisions pending; site will receive wrong panels' },
      { id: 'payment', name: '2. Advance Payment', need: 'RECEIVED (per contract terms)', impact: 'Commercial hold active (PAYMENT_HOLD)' },
      { id: 'holing', name: '3. Holing Operations', need: '100% DONE', impact: 'Panels lack tie-rod holes; on-site assembly will fail' },
      { id: 'accessories', name: '4. Hardware/Accessories', need: '100% PACKED', impact: 'Pins, wedges, props missing; formwork cannot be erected' },
      { id: 'freight', name: '5. Freight', need: 'CONFIRMED', impact: 'Freight carrier / vessel not confirmed; cargo cannot move' }
    ];
    const PANEL_STAGES = ['DESIGNED', 'PROCESSED', 'PRODUCED', 'DISPATCHED', 'DELIVERED'];
    const MR11_EDITABLE = ['country', 'pic', 'status', 'po', 'nca', 'incoterms'];
    const MR11_FIELD_LABELS = { country: 'Countries', pic: 'PIC', status: 'Status', po: 'PO', nca: 'NCA', incoterms: 'Incoterms' };

    function buildPanels() {
      const list = [];
      for (let i = 1; i <= 43; i++) {
        const code = 'W-' + String(i).padStart(3, '0');
        const m2 = i <= 40 ? 20.125 : i <= 42 ? 18.5 : 8;
        const block = i <= 20 ? 'Block A' : i <= 40 ? 'Block B' : 'Central Core';
        const stage = i <= 22 ? 'DELIVERED' : i <= 42 ? 'PRODUCED' : 'PROCESSED';
        list.push({ code, type: 'Wall', m2, series: 'S' + (i <= 20 ? 1 : i <= 40 ? 2 : 3), block, stage, row: 'LIVE' });
      }
      return list;
    }

    const appState = {
      activeTab: 1,
      ready: false,
      role: 'ADMIN',
      projectName: 'Skyline Tower Phase 2',
      buildingName: 'Tower A - Podium & Core',
      countryName: 'Malaysia (MY)',
      picName: 'Alex Tan',
      projectNo: '260011',
      projectStatus: 'Confirmed',
      poNo: 'PO-SKY-2026-01',
      ncaNo: 'NCA-2026-001',
      streams: ['Stream 1', 'Stream 2', 'Stream 3'],
      blocks: ['Block A', 'Block B', 'Central Core'],
      formworkType: 'MIVAN/MONOLITIC FORMWORK',
      productType: 'MFE New',
      ncaArea: 850,
      simOrderArea: null,
      basePrice: 145.00,
      propsAcc: 12.00,
      aluminium: 0,
      lmeMode: 'Variable',
      lmeBase: 2600,
      lmeToday: 3190,
      surchargeM2: 6.545,
      lmeAdjM2: 12.685,
      finalUnitRate: 176.23,
      totalContractValue: 149795.50,
      existingPlantLoad: 74200,
      plantCapacityCap: 110000,
      advanceCleared: true,
      advanceReceived: null,
      advanceDate: '2026-10-20',
      otherPaid: {},
      rules: {
        productionCapacity: 110000, designCapacity: 110000, complexWeight: 1.5, reconTolerancePct: 2, paymentMatchTolerancePct: 1,
        accessoriesSlaHours: 48, shellPlanClockDays: 14, designToProductionDays: 7, productionToSailingDays: 14, reminderLeadDays: 7,
        lorryCapacityM2: 450, autoConfirmPayments: false, enforceGateOnLorries: true, paymentLocksDesign: true, weeklyReport: true, sampleProjects: false,
        reportRecipients: 'MR11 owner, department heads',
        importOpen: false,
        evidenceRequiredFor: ['PRODUCED', 'DISPATCHED', 'DELIVERED'],
        gateChecks: { design: true, payment: true, holing: true, accessories: true, freight: true }
      },
      ncaVersions: [{ version: 1, ref: 'NCA-2026-001', date: '2026-10-15', qty: 850, reason: 'Original BD figure', status: 'APPROVED', decidedAt: '2026-10-15' }],
      bankLines: [
        { id: 1, date: '2026-10-20', ref: 'HSBC-WIRE-SKYLINE-ADV', amount: 29959.10, desc: 'SKYLINE TOWER PHASE 2 ADVANCE', source: 'Paste', status: 'CONFIRMED', score: 100, matchedTo: 'Skyline Tower Phase 2: Advance' },
        { id: 2, date: '2026-11-16', ref: 'OCBC-TT-8812', amount: 23300, desc: 'MARINA VIEW RESIDENCES', source: 'Paste', status: 'OPEN' },
        { id: 3, date: '2026-11-17', ref: 'MAYBANK-TT-5521', amount: 119000, desc: 'INWARD REMITTANCE', source: 'Paste', status: 'OPEN' },
        { id: 4, date: '2026-11-17', ref: 'CIMB-IBG-3301', amount: 4200, desc: 'SUNDRY RECEIPT', source: 'Paste', status: 'OPEN' }
      ],
      nextId: 100,
      shellRevisions: [{ rev: 0, status: 'Approved', date: '2026-11-01', remarks: 'Client frozen shell' }],
      items: [
        { id: 1, row: 'LIVE', kind: 'HOLING', name: 'Tie-rod & bracket holing', qtyReq: 120, qtyDone: 120, status: 'Completed', slaStart: '2026-11-13T08:00:00', completedAt: '2026-11-14T15:00:00' },
        { id: 2, row: 'LIVE', kind: 'ACCESSORY', name: 'Props, pins & wedges', qtyReq: 850, qtyDone: 850, status: 'Completed', slaStart: '2026-11-13T08:00:00', completedAt: '2026-11-14T15:00:00' },
        { id: 3, row: 'PH-26-0219', kind: 'HOLING', name: 'Tie-rod & bracket holing', qtyReq: 300, qtyDone: 120, status: 'Ongoing', slaStart: '2026-11-17T13:40:00', completedAt: null },
        { id: 4, row: 'SG-26-0305', kind: 'ACCESSORY', name: 'Props, pins & wedges', qtyReq: 620, qtyDone: 200, status: 'Ongoing', slaStart: '2026-11-16T06:00:00', completedAt: null }
      ],
      panels: buildPanels(),
      panelLog: [{ codes: 'W-001 to W-042', m2: 842, stage: 'PRODUCED', date: '2026-11-13', source: 'Web' }],
      planningSeries: [{ series: 'S1 to S3', building: 'Tower A', area: 850, processed: 850, date: '2026-11-10', pack: 'Pack', stock: 'New Stock', status: 'Released', reason: '' }],
      confirmOver: false,
      yardEvidence: [{ name: 'IMG_YARD_BAY4_PALLET_01.jpg', type: 'Photo' }],
      simFail: {},
      freightRef: 'MAERSK-88120',
      etdLog: [{ date: '2026-11-16', reason: 'Initial lorry allocation', who: 'Logistics PIC', baseline: true }],
      releases: [],
      lorries: [{ id: 'LORRY-01', date: '2026-11-16', ref: 'WXY 4412', dest: 'Skyline site', cap: 450, row: 'LIVE', m2: 450, status: 'Departed' }],
      lorrySeq: 1,
      siteRegister: [{ lorry: 'LORRY-01', m2: 450, where: 'Stream 1 / Block A', note: 'All pallets intact, zero transit damage', evidence: 'IMG_SITE_LORRY01.jpg', date: '2026-11-16', source: 'Mobile' }],
      siteProgressM2: 450,
      incidents: [{ type: 'Idle lorry', date: '2026-11-12', row: 'Gamuda Cove', cost: 1800, m2: 0, note: 'Waited for crane slot' }],
      updates: [
        { kind: 'PRODUCED', row: 'Skyline Tower Phase 2', detail: '842 m² (W-001 to W-042)', sourceType: 'Photo', ref: 'IMG_BAY2_BATCH1.jpg', source: 'Mobile', who: 'Production', when: '2026-11-13 17:20' },
        { kind: 'NOTE', row: 'Ayala Park Terraces Phase 3', detail: 'Design revision expected next week', sourceType: '', ref: '', source: 'Web', who: 'Design', when: '2026-11-17 10:05' }
      ],
      reminders: [],
      doneReminders: [],
      alertDecisions: {},
      approvals: [],
      editMode: false,
      comments: { 'PH-26-0219': [{ who: 'Design', when: '2026-11-17 10:06', text: 'Waiting for the client to confirm the core shift.' }] },
      notes: [{ who: 'Production', when: '2026-11-16 08:30', text: 'Bay 2 is on planned maintenance on Friday morning.' }],
      activity: [
        { who: 'BD', when: '2026-10-15 09:00', what: 'Created NCA v1 at 850 m²' },
        { who: 'Finance', when: '2026-10-20 11:12', what: 'Confirmed advance of $29,959.10 from HSBC-WIRE-SKYLINE-ADV' }
      ],
      reports: [],
      mobileScreen: 'home',
      mr11Filters: {},
      hiddenGroups: [],
      highlightDept: '',
      mr11Zoom: 100,
      deletedOpen: false,
      lastSync: '2026-11-18 08:00',
      lmePrev: 3172,
      sailedM2: 0,
      ceoRegion: '',
      currentUserEmail: 'admin@mfeformwork.com',
      wbDept: 'BD',
      wbPart: 'LOCAL',
      wbView: 'SHEET',
      wbSheet: 0,
      wbZoom: 100,
      workbooks: {},
      ceoMonth: '',
      users: [
        { name: 'Main Administrator', email: 'admin@mfeformwork.com', roles: ['ADMIN'] },
        { name: 'CEO Demo User', email: 'ceo@mfeformwork.com', roles: ['CEO'] },
        { name: 'BD Demo User', email: 'bd@mfeformwork.com', roles: ['BD'] },
        { name: 'Finance Demo User', email: 'finance@mfeformwork.com', roles: ['FINANCE'] },
        { name: 'Shell Plan Demo User', email: 'shellplan@mfeformwork.com', roles: ['SHELLPLAN'] },
        { name: 'Design Demo User', email: 'design@mfeformwork.com', roles: ['DESIGN'] },
        { name: 'Planning Demo User', email: 'planning@mfeformwork.com', roles: ['PLANNING'] },
        { name: 'Production Demo User', email: 'production@mfeformwork.com', roles: ['PRODUCTION'] },
        { name: 'Dispatch Demo User', email: 'dispatch@mfeformwork.com', roles: ['DISPATCH'] }
      ]
    };

    // Reference MR11 Pipeline Rows for Realistic Multi-Row Aggregation
    const referenceMR11Projects = [
      {
        customerProject: ' Gamuda Cove — Plot 4 Towers',
        buildingStream: 'Tower B / Stream 1 / Block B1',
        projectNo: 'MY-26-0104',
        country: 'Malaysia (MY)',
        pic: 'Alex Tan',
        status: 'Confirmed',
        product: 'MFE New',
        po: 'PO-GAM-8821',
        nca: 'NCA-2026-104',
        ncaQty: 1200,
        paymentTerm: '20% Adv / 80% CAD',
        advStatus: 'CLEARED (20%)',
        shellDate: '2026-10-15',
        designDate: '2026-10-28',
        lme: 2600,
        incoterms: 'CIF',
        basePrice: 148.00,
        propsAcc: 10.00,
        lmeAdj: 9.50,
        freightAdj: 5.00,
        finalPrice: 172.50,
        monthsM2: [600, 600, 0, 0, 0, 0],
        formworkSystem: 'MIVAN/MONOLITIC FORMWORK',
        producedM2: 1200,
        shippedM2: 900,
        readinessState: 'Got Payment & Design, Can Produce'
      },
      {
        customerProject: 'Ayala Park Terraces Phase 3',
        buildingStream: 'North Wing / Stream 2 / Core',
        projectNo: 'PH-26-0219',
        country: 'Philippines (PH)',
        pic: 'lim.wk',
        status: 'Confirmed',
        product: 'MFE Used (Refurbished)',
        po: 'PO-AYA-4410',
        nca: 'NCA-2026-219',
        ncaQty: 950,
        paymentTerm: '30% Adv / 70% CAD',
        advStatus: 'CLEARED (30%)',
        shellDate: '2026-11-05',
        designDate: 'Pending Approval',
        lme: 2550,
        incoterms: 'FOB',
        basePrice: 112.00,
        propsAcc: 8.00,
        lmeAdj: 0.00,
        freightAdj: 4.00,
        finalPrice: 124.00,
        monthsM2: [0, 450, 500, 0, 0, 0],
        formworkSystem: 'QUICK DECK / LIGHTDECK',
        producedM2: 300,
        shippedM2: 0,
        readinessState: 'Got Payment, Waiting Design'
      },
      {
        customerProject: 'Marina View Residences',
        buildingStream: 'Podium / Stream 1 / Transfer',
        projectNo: 'SG-26-0305',
        country: 'Singapore (SG)',
        pic: 'Sarah Chen',
        status: 'Contract Issued',
        product: 'Modification',
        po: 'Pending PO',
        nca: 'NCA-2026-305',
        ncaQty: 620,
        paymentTerm: '20% Adv / 80% CAD',
        advStatus: 'HOLD (Awaiting M1)',
        shellDate: '2026-10-20',
        designDate: '2026-11-02',
        lme: 2600,
        incoterms: 'CIF',
        basePrice: 165.00,
        propsAcc: 15.00,
        lmeAdj: 5.50,
        freightAdj: 3.50,
        finalPrice: 189.00,
        monthsM2: [0, 0, 310, 310, 0, 0],
        formworkSystem: 'PREMIUM FORMWORK',
        producedM2: 0,
        shippedM2: 0,
        readinessState: 'No Payment, Got Design'
      }
    ];
    referenceMR11Projects.push({
      customerProject: 'Hyderabad Greens Block 4',
      buildingStream: 'Block 4 / Stream 1 / Core',
      projectNo: 'IN-26-0412',
      country: 'India',
      pic: 'Priya Nair',
      status: 'Confirmed',
      product: 'Re-Design Only (Non-physical Despatch)',
      po: 'PO-HYD-2210',
      nca: 'NCA-2026-412',
      ncaQty: 300,
      paymentTerm: '100% Advance',
      advStatus: 'CLEARED (100%)',
      shellDate: '2026-10-30',
      designDate: '2026-11-10',
      lme: 2600,
      incoterms: 'FOB',
      basePrice: 40.00,
      propsAcc: 0,
      lmeAdj: 0,
      freightAdj: 0,
      finalPrice: 40.00,
      monthsM2: [150, 150, 0, 0, 0, 0],
      formworkSystem: 'MIVAN/MONOLITIC FORMWORK',
      producedM2: 0,
      shippedM2: 0,
      readinessState: 'Got Payment & Design, Can Produce'
    });
    const REF_EXTRAS = {
      'MY-26-0104': { designFinal: 1240, advancePct: 20, freightRef: 'PIL-55120', shellApproved: true, processedM2: 1240, shortName: 'GC4', stream: '1', location: 'Selangor', lmeType: 'Variable', shellStatus: 'Approved', designStatus: 'Completed', paymentDate: '2026-09-22', processedDate: '2026-10-20', producedDate: '2026-11-14', dispatchDate: '2026-11-12', etd: '', atd: '', seriesLedger: [{ series: 'S1', processed: 700, area: 700, date: '2026-10-05', closing: '2026-10-05 17:00' }, { series: 'S2', processed: 540, area: 540, date: '2026-10-20', closing: '' }], approvals: [{ status: 'Approved', revision: 1, approved: '2026-10-15', submitted: '2026-10-08', seen: '2026-10-15' }], monthStages: { '2026-11': { design: 0, processed: 0, produced: 400, dispatched: 300 } } },
      'PH-26-0219': { designFinal: null, advancePct: 30, freightRef: '', shellApproved: true, processedM2: 600, shortName: 'AP3', stream: '2', location: 'Manila', lmeType: 'Fixed', shellStatus: 'Reapprove', designStatus: 'Ongoing', paymentDate: '2026-10-06', processedDate: '2026-11-11', producedDate: '2026-11-16', dispatchDate: '', etd: '2026-12-08', atd: '', seriesLedger: [{ series: 'S1', processed: 600, area: 950, date: '2026-11-11', closing: '' }], approvals: [{ status: 'Approved', revision: 0, approved: '2026-10-20', submitted: '2026-10-12', seen: '2026-10-20' }, { status: 'Reapprove', revision: 1, approved: '', submitted: '2026-11-03', seen: '2026-11-05' }], monthStages: { '2026-11': { design: 0, processed: 300, produced: 300, dispatched: 0 } } },
      'IN-26-0412': { designFinal: 300, advancePct: 100, freightRef: '', shellApproved: true, processedM2: 300, shortName: 'HG4', stream: '1', location: 'Hyderabad', lmeType: 'Fixed', shellStatus: 'Approved', designStatus: 'Completed', paymentDate: '2026-10-02', processedDate: '2026-11-12', producedDate: '', dispatchDate: '', etd: '', atd: '', seriesLedger: [{ series: 'S1', processed: 300, area: 300, date: '2026-11-12', closing: '2026-11-12 16:30' }], approvals: [{ status: 'Approved', revision: 0, approved: '2026-10-30', submitted: '2026-10-22', seen: '2026-10-30' }], monthStages: { '2026-11': { design: 300, processed: 300, produced: 0, dispatched: 0 } } },
      'SG-26-0305': { designFinal: 620, advancePct: 20, freightRef: '', shellApproved: true, paymentOverdue: true, processedM2: 200, shortName: 'MV1', stream: '1', location: 'Singapore', lmeType: 'Variable', shellStatus: 'Approved', designStatus: 'Completed', paymentDate: '', processedDate: '2026-11-13', producedDate: '', dispatchDate: '', etd: '', atd: '', seriesLedger: [{ series: 'S1', processed: 200, area: 620, date: '2026-11-13', closing: '' }], approvals: [{ status: 'Approved', revision: 0, approved: '2026-10-20', submitted: '2026-10-14', seen: '2026-10-20' }], monthStages: { '2026-11': { design: 620, processed: 200, produced: 0, dispatched: 0 } } }
    };
    referenceMR11Projects.forEach(r => Object.assign(r, { key: r.projectNo }, REF_EXTRAS[r.projectNo]));

    // =========================================================================
    // CORE UTILITIES, PLANT CAPACITY & FINANCE GATE HELPERS
    // =========================================================================
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmtNum = (n, d = 2) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    const pill = (text, tone) => `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-${tone}-100 text-${tone}-800">${esc(text)}</span>`;
    const refreshIcons = () => { if (window.lucide) lucide.createIcons(); };
    const nowStamp = () => `${DEMO_TODAY} ${new Date().toTimeString().slice(0, 5)}`;
    const addDays = (dateStr, days) => { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
    const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
    const nextWorkingDay = dateStr => { let d = addDays(dateStr, 1); while ([0, 6].includes(new Date(d + 'T00:00:00Z').getUTCDay())) d = addDays(d, 1); return d; };
    const table = (head, rows, empty) => rows.length
      ? `<table class="w-full text-xs text-left border-collapse"><thead class="bg-slate-50 text-slate-600"><tr>${head.map(h => `<th class="py-2 px-2.5 border border-slate-200 whitespace-nowrap">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td class="py-2 px-2.5 border border-slate-200">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : `<p class="text-xs text-slate-400">${empty || 'Nothing to show.'}</p>`;

    function formatUSD(val) {
      const num = Number(val) || 0;
      return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function notify(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      const bg = type === 'error'
        ? 'bg-rose-600 text-white border-rose-700'
        : type === 'success'
        ? 'bg-emerald-600 text-white border-emerald-700'
        : 'bg-slate-900 text-white border-slate-700';

      toast.className = `pointer-events-auto px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold flex items-center justify-between gap-3 ${bg}`;
      toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
      toast.title = 'Click to close';
      toast.textContent = message;
      container.appendChild(toast);
      // Fades out, then goes; errors stay a little longer so they can be read
      let gone = false;
      const leave = () => {
        if (gone) return;
        gone = true;
        toast.classList.add('sf-leaving');
        setTimeout(() => toast.remove(), 220);
      };
      toast.addEventListener('click', leave);
      setTimeout(leave, type === 'error' ? 5500 : 3500);
    }

    function downloadStandaloneHTML() {
      const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shellflow_interactive_prototype.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify('Downloaded shellflow_interactive_prototype.html!', 'success');
    }

    function isAdmin() { return appState.role === 'ADMIN'; }
    function can(...roles) { return isAdmin() || roles.includes(appState.role); }
    function guard(roles, what) {
      if (can(...roles)) return true;
      const allowed = [...roles.filter(r => r !== 'ADMIN').map(r => ROLES[r]), 'Administrator'].join(' or ');
      notify(`${ROLES[appState.role]} cannot ${what}. Switch "Viewing as" to ${allowed}.`, 'error');
      return false;
    }
    function logActivity(what) { appState.activity.unshift({ who: ROLES[appState.role], when: nowStamp(), what }); }
    function addUpdate(kind, row, detail, sourceType, ref, source) {
      appState.updates.unshift({ kind, row, detail, sourceType, ref, source, who: ROLES[appState.role], when: nowStamp() });
    }
    function setRole(role) {
      appState.role = role;
      appState.highlightDept = DEPT_KEYS.includes(role) ? role : '';
      applyRoleNav();
      if (!tabAllowed(appState.activeTab)) switchTab((ROLE_TABS[role] || [9])[0]);
      notify(`Now viewing as ${ROLES[role]}`, 'info');
      refreshAll();
      renderRules();
    }

    // Reason / value modal shared by admin release, rejections and MR11 cell edits
    let reasonModalState = null;
    function askModal({ title, desc, label, confirm, min = 0, value = '', onOk }) {
      reasonModalState = { min, onOk };
      $('reason-title').textContent = title;
      $('reason-desc').textContent = desc;
      $('reason-label').textContent = label;
      $('reason-confirm').textContent = confirm;
      $('reason-input').value = value;
      $('reason-modal').classList.remove('hidden');
      $('reason-modal').classList.add('flex');
      $('reason-input').focus();
    }
    function closeReasonModal() {
      $('reason-modal').classList.add('hidden');
      $('reason-modal').classList.remove('flex');
    }
    function submitReasonModal() {
      const text = $('reason-input').value.trim();
      if (text.length < Math.max(1, reasonModalState.min)) {
        notify(`Please enter at least ${Math.max(1, reasonModalState.min)} characters.`, 'error');
        return;
      }
      closeReasonModal();
      reasonModalState.onOk(text);
    }

    function updatePlantCapacitySimulation(orderArea) {
      const base = appState.existingPlantLoad;
      const cap = appState.plantCapacityCap;
      const projected = base + orderArea;
      const pct = Math.min(100, (projected / cap) * 100);

      document.getElementById('cap-this-order').textContent = `+${orderArea.toLocaleString()} m²`;
      document.getElementById('cap-projected-total').textContent = `${projected.toLocaleString()} / ${cap.toLocaleString()} m²`;
      document.getElementById('header-plant-load').textContent = `${projected.toLocaleString()} / ${cap.toLocaleString()} m²`;
      document.getElementById('prod-cap-label').textContent = `${projected.toLocaleString()} / ${cap.toLocaleString()} m²`;

      const barFill = document.getElementById('cap-bar-fill');
      const prodBar = document.getElementById('prod-cap-bar');
      const pctText = document.getElementById('cap-pct-text');
      const card = document.getElementById('bd-capacity-card');
      const pill = document.getElementById('cap-pill');
      const breachBanner = document.getElementById('cap-breach-banner');
      const headerBadge = document.getElementById('header-capacity-badge');

      barFill.style.width = `${pct.toFixed(1)}%`;
      if ($('header-load-fill')) $('header-load-fill').style.width = `${pct.toFixed(1)}%`;
      if (prodBar) prodBar.style.width = `${pct.toFixed(1)}%`;
      pctText.textContent = `${((projected / cap) * 100).toFixed(1)}% Utilized`;

      if (projected > cap) {
        const excess = projected - cap;
        card.className = 'bg-white rounded-xl border-2 border-rose-600 shadow-xs p-5 space-y-4 transition-all';
        pill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800';
        pill.textContent = 'CAPACITY BREACHED';
        barFill.className = 'h-full bg-rose-600 transition-all duration-300';
        document.getElementById('cap-projected-total').className = 'font-mono font-extrabold text-rose-600';
        breachBanner.classList.remove('hidden');
        document.getElementById('cap-breach-msg').textContent =
          `Order of ${orderArea.toLocaleString()} m² takes plant load to ${projected.toLocaleString()} m² (${excess.toLocaleString()} m² over the ${cap.toLocaleString()} m² capacity). BD and Planning must re-plan. The order is not blocked.`;
        if (headerBadge) headerBadge.dataset.state = 'over';
      } else {
        card.className = 'bg-white rounded-xl border-2 border-emerald-500 shadow-xs p-5 space-y-4 transition-all';
        pill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800';
        pill.textContent = 'WITHIN CAP';
        barFill.className = 'h-full bg-emerald-500 transition-all duration-300';
        document.getElementById('cap-projected-total').className = 'font-mono font-extrabold text-emerald-700';
        breachBanner.classList.add('hidden');
        if (headerBadge) headerBadge.dataset.state = 'ok';
      }
    }

    function simulateCapacityBreach(shouldBreach) {
      appState.simOrderArea = shouldBreach ? 36500 : null;
      // The whole order lands in one month, so that month goes over the plant capacity
      $('bd-forecast-months').value = shouldBreach ? 1 : 3;
      recalculateCommercial();
      renderForecastInputs();
      refreshAll();
      if (shouldBreach) {
        notify('ALERT raised: an order of 36,500 m² takes the month over plant capacity. It is not blocked.', 'error');
      } else {
        notify('Restored standard order and cleared the capacity alert', 'success');
      }
    }

    // =========================================================================
    // PAYMENT TERMS & FINANCE LINES
    // =========================================================================
    function termsList() {
      const terms = [0, 1, 2]
        .map(i => ({ idx: i, pct: parseFloat($(`pt-pct-${i}`).value) || 0, type: $(`pt-type-${i}`).value }))
        .filter(t => t.pct > 0);
      let allocated = 0;
      terms.forEach((t, n) => {
        t.amount = n === terms.length - 1 && Math.abs(terms.reduce((a, x) => a + x.pct, 0) - 100) < 0.001
          ? Math.round((appState.totalContractValue - allocated) * 100) / 100
          : Math.round(appState.totalContractValue * t.pct) / 100;
        allocated += t.amount;
      });
      return terms;
    }
    function advanceTerm() {
      const terms = termsList();
      return terms.find(t => t.type === 'Advance') || terms[0] || { idx: 0, pct: 0, type: 'Advance', amount: 0 };
    }
    function openFinanceLines() {
      const lines = [];
      const adv = advanceTerm();
      termsList().forEach(t => {
        const paid = t.idx === adv.idx ? appState.advanceCleared : !!appState.otherPaid[t.idx];
        if (!paid) lines.push({ row: 'LIVE', term: t, isAdvance: t.idx === adv.idx, label: `${appState.projectName}: ${t.type}`, amount: t.amount, project: appState.projectName, projectNo: appState.projectNo, type: t.type });
      });
      referenceMR11Projects.filter(r => !/CLEARED/.test(r.advStatus)).forEach(r => {
        lines.push({ row: r.key, isAdvance: true, label: `${r.customerProject}: Advance`, amount: Math.round(r.ncaQty * r.finalPrice * r.advancePct) / 100, project: r.customerProject, projectNo: r.projectNo, type: 'Advance' });
      });
      return lines;
    }
    // +60 amount within tolerance, +30 project named in the bank text, +10 payment type named
    function scoreBankLine(line) {
      const text = `${line.ref} ${line.desc}`.toUpperCase();
      const tol = appState.rules.paymentMatchTolerancePct / 100;
      let best = { score: 0, target: null, parts: [] };
      openFinanceLines().forEach(open => {
        const parts = [];
        let score = 0;
        if (open.amount > 0 && Math.abs(line.amount - open.amount) <= open.amount * tol) { score += 60; parts.push('amount +60'); }
        const nameKey = open.project.trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase();
        if (text.includes(nameKey) || text.includes(String(open.projectNo).toUpperCase())) { score += 30; parts.push('project +30'); }
        const typeWords = open.type === 'Advance' ? ['ADVANCE', 'ADV'] : [open.type.toUpperCase()];
        if (typeWords.some(w => new RegExp(`\\b${w}\\b`).test(text))) { score += 10; parts.push('type +10'); }
        if (score > best.score) best = { score, target: open, parts };
      });
      return best;
    }
    function bankLineCanStand(line) { return line.status === 'OPEN' ? scoreBankLine(line) : { score: line.score, parts: [] }; }
    function confirmBankLine(id, automatic) {
      if (!automatic && !guard(['FINANCE'], 'confirm payments')) return;
      const line = appState.bankLines.find(l => l.id === id);
      const match = scoreBankLine(line);
      if (!match.target) { notify('No open Finance line matches this bank line.', 'error'); return; }
      line.status = 'CONFIRMED';
      line.score = match.score;
      line.matchedTo = match.target.label;
      if (match.target.row === 'LIVE') {
        if (match.target.isAdvance) {
          appState.advanceReceived = line.amount;
          appState.advanceDate = line.date;
          setAdvancePaymentCleared(true, true);
        } else {
          appState.otherPaid[match.target.term.idx] = { amount: line.amount, date: line.date };
        }
      } else {
        const r = referenceMR11Projects.find(x => x.key === match.target.row);
        r.advStatus = `CLEARED (${r.advancePct}%)`;
        r.paymentOverdue = false;
        r.readinessState = /pending/i.test(r.designDate) ? 'Got Payment, Waiting Design' : 'Got Payment & Design, Can Produce';
      }
      addUpdate('PAYMENT', match.target.label, `${formatUSD(line.amount)} confirmed`, 'Document Link', line.ref, line.source);
      logActivity(`${automatic ? 'Auto-confirmed' : 'Confirmed'} ${formatUSD(line.amount)} from ${line.ref} against ${match.target.label} (score ${match.score})`);
      notify(`Payment confirmed: ${match.target.label}. Finance line and MR11 updated.`, 'success');
      refreshAll();
    }
    function rejectBankLine(id) {
      if (!guard(['FINANCE'], 'mark bank lines')) return;
      const line = appState.bankLines.find(l => l.id === id);
      line.status = 'NOT_OURS';
      logActivity(`Marked bank line ${line.ref} as not ours`);
      refreshAll();
    }
    function addBankLine(line) {
      const added = { id: ++appState.nextId, status: 'OPEN', ...line };
      appState.bankLines.unshift(added);
      const match = scoreBankLine(added);
      if (appState.rules.autoConfirmPayments && added.source === 'Mailbox' && match.score >= 90) confirmBankLine(added.id, true);
      return added;
    }
    function importBankLines() {
      if (!guard(['FINANCE'], 'import bank lines')) return;
      const raw = $('bank-paste').value.split('\n').map(l => l.trim()).filter(Boolean);
      if (!raw.length) { notify('Paste at least one line: date, reference, amount, description.', 'error'); return; }
      let added = 0, refused = 0;
      raw.forEach(text => {
        const parts = text.split(text.includes('\t') ? '\t' : ',').map(p => p.trim());
        const amount = parseFloat((parts[2] || '').replace(/[^0-9.-]/g, ''));
        const date = parts[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > DEMO_TODAY || isNaN(amount)) { refused++; return; }
        addBankLine({ date, ref: parts[1] || 'NO-REF', amount, desc: parts.slice(3).join(' '), source: 'Paste' });
        added++;
      });
      $('bank-paste').value = '';
      notify(`${added} line(s) matched${refused ? `, ${refused} refused (date must be YYYY-MM-DD and not in the future; amount must be a number)` : ''}.`, refused ? 'error' : 'success');
      refreshAll();
    }
    function simulateMailboxAdvice() {
      const open = openFinanceLines()[0];
      if (!open) { notify('Every Finance line is already paid.', 'info'); return; }
      const line = addBankLine({ date: DEMO_TODAY, ref: 'HSBC-ADVICE-7742', amount: open.amount, desc: `${open.project.toUpperCase()} ${open.projectNo} ${open.type.toUpperCase()}`, source: 'Mailbox' });
      notify(line.status === 'CONFIRMED' ? 'Bank advice arrived and was auto-confirmed (score ≥ 90).' : 'Bank advice arrived from the Finance mailbox. Auto-confirm is off, so Finance confirms it.', 'info');
      refreshAll();
    }
    function renderFinance() {
      const adv = advanceTerm();
      $('fin-lines-body').innerHTML = termsList().map(t => {
        const isAdv = t.idx === adv.idx;
        const paid = isAdv ? appState.advanceCleared : !!appState.otherPaid[t.idx];
        const received = isAdv ? (appState.advanceCleared ? (appState.advanceReceived ?? t.amount) : 0) : (appState.otherPaid[t.idx]?.amount || 0);
        const date = isAdv ? (appState.advanceCleared ? appState.advanceDate : '') : (appState.otherPaid[t.idx]?.date || '');
        const badge = paid ? pill('CLEARED', 'emerald') : isAdv ? pill('PAYMENT HOLD', 'rose') : pill('DUE PRE-SHIP', 'slate');
        return `<tr>
          <td class="py-3 px-3 font-bold text-slate-900">M${t.idx + 1}: ${esc(t.type)}${isAdv ? '<span class="block text-[11px] font-normal text-slate-500">Checked at the dispatch gate; can also hold Design (see Rules)</span>' : ''}</td>
          <td class="py-3 px-3 font-mono font-bold text-sky-700">${fmtNum(t.pct, 1)}%</td>
          <td class="py-3 px-3 font-mono font-bold text-slate-900">${formatUSD(t.amount)}</td>
          <td class="py-3 px-3 font-mono font-bold ${paid ? 'text-emerald-700' : 'text-slate-400'}">${formatUSD(received)}</td>
          <td class="py-3 px-3 font-mono">${esc(date) || '—'}</td>
          <td class="py-3 px-3">${badge}</td>
        </tr>`;
      }).join('');
      $('fin-auto-pill').textContent = `Auto-confirm: ${appState.rules.autoConfirmPayments ? 'ON' : 'OFF'} | Tolerance ${appState.rules.paymentMatchTolerancePct}%`;
      $('bank-lines-list').innerHTML = appState.bankLines.map(line => {
        const m = bankLineCanStand(line);
        const s = line.status === 'CONFIRMED' ? line.score : m.score;
        const tone = line.status === 'CONFIRMED' ? 'emerald' : line.status === 'NOT_OURS' ? 'slate' : s >= 60 ? 'amber' : 'slate';
        const label = line.status === 'CONFIRMED' ? 'CONFIRMED' : line.status === 'NOT_OURS' ? 'NOT OURS' : s >= 90 ? 'SUGGESTED (≥90 CAN AUTO-CONFIRM)' : s >= 60 ? 'SUGGESTED (≥60)' : 'NO MATCH (<60)';
        const target = line.status === 'CONFIRMED' ? line.matchedTo : m.target?.label;
        const actions = line.status === 'OPEN'
          ? `<div class="flex gap-1.5 shrink-0">${s >= 60 ? `<button onclick="confirmBankLine(${line.id})" class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold">Confirm</button>` : ''}<button onclick="rejectBankLine(${line.id})" class="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold">Not Ours</button></div>`
          : '';
        return `<div class="p-3.5 rounded-xl border border-${tone}-200 bg-${tone}-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-${tone === 'slate' ? 'slate-400' : tone + '-600'} text-white font-mono font-bold flex items-center justify-center shrink-0">${s}</div>
            <div>
              <div class="font-bold text-slate-900">${esc(line.ref)} <span class="font-normal text-slate-500">${esc(line.source)} • ${esc(line.date)}</span></div>
              <div class="text-[11px] text-slate-600">${esc(line.desc)} | Value: <strong class="font-mono">${formatUSD(line.amount)}</strong>${target ? ` | Match: ${esc(target)}` : ''}${m.parts && m.parts.length ? ` (${m.parts.join(', ')})` : ''}</div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 flex-wrap">${pill(label, tone)}${actions}</div>
        </div>`;
      }).join('');
    }

    function applyDesignLock() {
      const locked = appState.rules.paymentLocksDesign && !appState.advanceCleared;
      $('design-hard-stop-banner').classList.toggle('hidden', !locked);
      $('design-workspace-content').classList.toggle('opacity-40', locked);
      $('design-workspace-content').classList.toggle('pointer-events-none', locked);
      const adv = advanceTerm();
      $('design-stop-text').textContent = `The ${fmtNum(adv.pct, 0)}% advance payment`;
      const gateHeading = $('fin-gate-heading');
      gateHeading.textContent = appState.advanceCleared ? 'Step 3 Design Access: UNLOCKED' : locked ? 'Step 3 Design Access: LOCKED (HARD STOP)' : 'Step 3 Design Access: OPEN (Enforced at Dispatch Gate)';
      $('fin-gate-desc').innerHTML = appState.advanceCleared
        ? `The ${fmtNum(adv.pct, 0)}% advance (<span id="fin-gate-m1-inline">${formatUSD(adv.amount)}</span>) is confirmed. Technical Design can draft 2D/3D Shell Plans.`
        : `The ${fmtNum(adv.pct, 0)}% advance (<span id="fin-gate-m1-inline">${formatUSD(adv.amount)}</span>) is not confirmed. It is re-checked when the next bank line lands.`;
      $('fin-gate-box').className = appState.advanceCleared
        ? 'bg-white rounded-xl border-2 border-emerald-500 shadow-xs p-6 text-center space-y-4'
        : 'bg-rose-50/40 rounded-xl border-2 border-rose-500 shadow-xs p-6 text-center space-y-4';
      const headerPill = $('header-finance-pill');
      headerPill.textContent = appState.advanceCleared ? `CLEARED (${fmtNum(adv.pct, 0)}%)` : 'HOLD (AWAITING ADVANCE)';
      headerPill.dataset.state = appState.advanceCleared ? 'ok' : 'hold';
      const finTopPill = $('fin-top-pill');
      finTopPill.textContent = appState.advanceCleared ? 'Advance Cleared' : 'Awaiting Advance';
      finTopPill.className = `px-3 py-1 rounded-full text-xs font-bold shrink-0 ${appState.advanceCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`;
    }
    function setAdvancePaymentCleared(isCleared, quiet) {
      appState.advanceCleared = isCleared;
      if (isCleared && !appState.advanceDate) appState.advanceDate = DEMO_TODAY;
      if (!isCleared) { appState.advanceReceived = null; appState.advanceDate = ''; }
      applyDesignLock();
      if (!quiet) notify(isCleared ? 'Advance payment confirmed.' : 'Payment hold set. It is re-checked when the next bank line lands.', isCleared ? 'success' : 'error');
      refreshAll();
    }

    function renderForecastInputs() {
      const count = parseInt(document.getElementById('bd-forecast-months').value, 10) || 3;
      const grid = document.getElementById('bd-forecast-grid');
      const totalArea = appState.ncaArea || 850;
      const monthNames = ['Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027', 'Apr 2027'];
      const baseShare = Math.floor((totalArea / count) * 100) / 100;
      let running = 0;
      let html = '';

      for (let i = 0; i < count; i++) {
        const val = (i === count - 1) ? (totalArea - running).toFixed(2) : baseShare.toFixed(2);
        running += parseFloat(val);
        html += `
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <label class="block text-[11px] font-bold text-slate-600">Month ${i + 1} (${monthNames[i]}) Forecast (m²)</label>
            <input type="number" step="1" value="${val}" oninput="validateForecastSum()" class="fc-month-input w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900">
          </div>
        `;
      }
      grid.innerHTML = html;
      document.getElementById('fc-month-count').textContent = count;
      validateForecastSum();
    }

    // =========================================================================
    // NCA VERSIONING & CHANGE GATE
    // =========================================================================
    function latestNca() { return [...appState.ncaVersions].reverse().find(v => v.status === 'APPROVED'); }
    function submitNcaRevision() {
      if (!guard(['BD'], 'submit NCA revisions')) return;
      const qty = parseFloat($('nca-qty').value);
      const reason = $('nca-reason').value.trim();
      if (!(qty > 0)) { notify('Enter the new NCA quantity as a number above 0.', 'error'); return; }
      if (!reason) { notify('A reason is required for every NCA revision.', 'error'); return; }
      const version = appState.ncaVersions.length + 1;
      appState.ncaVersions.push({ version, ref: $('nca-ref').value.trim() || `NCA-REV-${version}`, date: $('nca-date').value, qty, reason, status: 'PENDING' });
      $('nca-qty').value = ''; $('nca-reason').value = ''; $('nca-ref').value = '';
      logActivity(`Submitted NCA v${version}: ${qty} m² (${reason})`);
      notify(`NCA v${version} submitted. It counts only after an administrator approves it.`, 'info');
      refreshAll();
    }
    function decideNca(version, approve) {
      if (!guard(['ADMIN'], 'decide NCA revisions')) return;
      const v = appState.ncaVersions.find(x => x.version === version);
      if (approve) {
        v.status = 'APPROVED';
        v.decidedAt = DEMO_TODAY;
        logActivity(`Approved NCA v${version}: ${v.qty} m²`);
        recalculateCommercial();
        renderForecastInputs();
        notify(`NCA v${version} approved. Design, Planning, Production & Dispatch are alerted for 14 days.`, 'success');
        refreshAll();
        return;
      }
      askModal({
        title: `Reject NCA v${version}`, desc: 'A rejection needs a reason. The earlier approved version stays in force.', label: 'Reason', confirm: 'Reject Revision', min: 3,
        onOk: reason => {
          v.status = 'REJECTED'; v.rejectReason = reason; v.decidedAt = DEMO_TODAY;
          logActivity(`Rejected NCA v${version}: ${reason}`);
          refreshAll();
        }
      });
    }
    function renderNca() {
      let prev = null;
      const rows = appState.ncaVersions.map(v => {
        const delta = prev === null ? '—' : `${v.qty - prev >= 0 ? '+' : ''}${fmtNum(v.qty - prev)} m²`;
        if (v.status === 'APPROVED') prev = v.qty;
        const tone = v.status === 'APPROVED' ? 'emerald' : v.status === 'PENDING' ? 'amber' : 'rose';
        const action = v.status === 'PENDING'
          ? `<button onclick="decideNca(${v.version}, true)" class="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-bold mr-1">Approve</button><button onclick="decideNca(${v.version}, false)" class="px-2 py-0.5 rounded border border-rose-300 text-rose-700 text-[11px] font-semibold">Reject</button>`
          : esc(v.rejectReason || '');
        return [`v${v.version}`, esc(v.ref), esc(v.date), `<span class="font-mono font-bold">${fmtNum(v.qty)}</span>`, delta, esc(v.reason), pill(v.status, tone), action];
      });
      $('nca-history').innerHTML = table(['Version', 'Reference', 'Date', 'Qty (m²)', 'Change', 'Reason', 'Status', 'Decision'], rows);
      $('bd-nca-pill').textContent = `NCA v${latestNca().version} Active`;
    }

    // =========================================================================
    // TAB NAVIGATION
    // =========================================================================
    // Panel ids keep their original numbers (5 is gone); the step bar shows the visible step numbers
    function switchTab(stepNum) {
      if (!tabAllowed(stepNum)) {
        notify(`${ROLES[appState.role]} does not have access to that page. Ask an administrator for the role.`, 'error');
        return;
      }
      appState.activeTab = stepNum;
      for (let i = 1; i <= 19; i++) {
        const panel = document.getElementById(`step-panel-${i}`);
        const btn = document.getElementById(`tab-btn-${i}`);
        if (!panel || !btn) continue;
        const on = i === stepNum;
        panel.classList.toggle('hidden', !on);
        btn.classList.toggle('step-btn-active', on);
        btn.classList.toggle('step-btn-inactive', !on);
        if (on) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
      }
      refreshAll();
      if (stepNum === 14) renderRules();
      refreshIcons();
      window.scrollTo(0, 0);
    }

    // =========================================================================
    // STEP 1: PROPAGATE BD CONTEXT TO ALL SUBSEQUENT TABS
    // =========================================================================
    function propagateBDData() {
      appState.projectName = document.getElementById('bd-project-name').value || 'Unnamed Project';
      appState.buildingName = document.getElementById('bd-building-name').value || 'Main Building';
      appState.countryName = document.getElementById('bd-country-name')?.value || 'Malaysia (MY)';
      appState.picName = document.getElementById('bd-pic-name')?.value || 'Alex Tan';
      appState.formworkType = document.getElementById('bd-formwork-type').value;
      appState.productType = document.getElementById('bd-product-type').value;
      appState.projectNo = $('bd-project-no').value.trim();
      appState.projectStatus = $('bd-status').value;
      appState.poNo = $('bd-po-no').value.trim();
      appState.ncaNo = $('bd-nca-no').value.trim();

      // A project number like 260011 is project 26001, stream 1
      const code = appState.projectNo;
      const streamNo = /^\d{6,7}$/.test(code) ? parseInt(code.slice(5), 10) : 0;
      $('bd-project-no-hint').textContent = streamNo ? `Project ${code.slice(0, 5)}, Stream ${streamNo} (filled in automatically)` : 'Use 6 or 7 digits so the stream fills in, for example 260011';

      const rawStreams = document.getElementById('bd-streams-input').value;
      const rawBlocks = document.getElementById('bd-blocks-input').value;
      appState.streams = rawStreams.split(',').map(s => s.trim()).filter(Boolean);
      appState.blocks = rawBlocks.split(',').map(b => b.trim()).filter(Boolean);
      if (appState.streams.length === 0) appState.streams = ['Stream 1'];
      if (appState.blocks.length === 0) appState.blocks = ['Block A'];

      const fill = FORMWORK_FILL[appState.formworkType];
      $('bd-colour-hint').innerHTML = `In MR11 this row shows <strong style="color:${PRODUCT_FONT[appState.productType]}">${esc(appState.productType)}</strong> as its font colour and ${fill ? `<span class="px-1.5 rounded" style="background:${fill}">${esc(appState.formworkType)}</span>` : esc(appState.formworkType) + ' (no fill)'} as its fill colour.`;

      // Update Global Header Context Ribbon
      document.getElementById('ctx-project').textContent = appState.projectName;
      document.getElementById('ctx-building').textContent = appState.buildingName;
      const cpEl = document.getElementById('ctx-country-pic');
      if (cpEl) cpEl.textContent = `${appState.countryName} / ${appState.picName}`;
      document.getElementById('ctx-streams').textContent = appState.streams.join(', ');
      document.getElementById('ctx-blocks').textContent = appState.blocks.join(', ');
      document.getElementById('ctx-formwork').textContent = appState.formworkType;
      document.getElementById('ctx-product').textContent = appState.productType;

      // Update Step 2 Finance labels
      document.getElementById('fin-proj-name').textContent = appState.projectName;
      document.getElementById('fin-bldg-name').textContent = appState.buildingName;
      document.getElementById('fin-formwork').textContent = appState.formworkType;
      document.getElementById('fin-product').textContent = appState.productType;

      // Update Step 3, 4, 6, 7 Project Titles
      document.getElementById('des-proj-title').textContent = appState.projectName;
      document.getElementById('des-bldg-title').textContent = appState.buildingName;
      document.getElementById('pwa-prod-proj-tag').textContent = appState.projectName;
      document.getElementById('log-proj-label').textContent = appState.projectName;
      document.getElementById('log-bldg-label').textContent = appState.buildingName;
      document.getElementById('site-proj-tag').textContent = appState.projectName;

      // Populate all downstream Stream & Block dropdown selectors
      const streamSelectIds = ['des-stream-select', 'prod-stream-select', 'log-stream-select', 'site-stream-select'];
      streamSelectIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const currentVal = el.value;
        el.innerHTML = appState.streams.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
        if (appState.streams.includes(currentVal)) el.value = currentVal;
      });

      const blockSelectIds = ['des-block-select', 'prod-block-select', 'log-block-select', 'site-block-select', 'pb-block'];
      blockSelectIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const currentVal = el.value;
        el.innerHTML = appState.blocks.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
        if (appState.blocks.includes(currentVal)) el.value = currentVal;
      });

      refreshAll();
    }

    // =========================================================================
    // STEP 1 & 2: DYNAMIC COMMERCIAL PRICING & PLANT CAPACITY CHECK
    // =========================================================================
    function recalculateCommercial() {
      const area = appState.simOrderArea ?? latestNca().qty;
      $('bd-nca-area').value = area;
      const priceInput = Math.max(0, parseFloat(document.getElementById('bd-base-price').value) || 0);
      const currency = $('bd-price-currency').value;
      const basePrice = priceInput / USD_RATES[currency];
      $('bd-price-usd-hint').textContent = currency === 'USD' ? '' : `${formatUSD(basePrice)} / m² at the sample rate of ${USD_RATES[currency]} ${currency} per USD`;
      const propsAcc = Math.max(0, parseFloat(document.getElementById('bd-props-acc')?.value) || 0);
      const aluminium = parseFloat($('bd-aluminium').value) || 0;
      const lmeMode = document.getElementById('bd-lme-mode').value;
      const lmeBase = parseFloat(document.getElementById('bd-lme-base').value);
      const lmeToday = parseFloat(document.getElementById('bd-lme-today').value) || 0;
      const surcharge = parseFloat(document.getElementById('bd-surcharge-m2').value) || 0;
      $('bd-freeze-wrap').classList.toggle('hidden', lmeMode !== 'Freeze');

      let lmeAdj = 0;
      if (lmeMode === 'Variable' && !isNaN(lmeBase)) {
        lmeAdj = ((lmeToday - lmeBase) / 1000) * 21.5;
      } else if (lmeMode === 'Freeze') {
        lmeAdj = parseFloat($('bd-freeze-adj').value) || 0;
      }

      const finalUnitRate = basePrice + propsAcc + lmeAdj + aluminium + surcharge;
      const totalContract = area * finalUnitRate;

      appState.ncaArea = area;
      appState.basePrice = basePrice;
      appState.propsAcc = propsAcc;
      appState.aluminium = aluminium;
      appState.lmeMode = lmeMode;
      appState.lmeBase = isNaN(lmeBase) ? 0 : lmeBase;
      appState.lmeHasRate = !isNaN(lmeBase);
      appState.lmeToday = lmeToday;
      appState.surchargeM2 = surcharge;
      appState.lmeAdjM2 = lmeAdj;
      appState.finalUnitRate = finalUnitRate;
      appState.totalContractValue = totalContract;
      appState.plantCapacityCap = appState.rules.productionCapacity;

      // Update Step 1 Summary
      document.getElementById('summary-area').textContent = area.toFixed(2) + ' m²';
      document.getElementById('summary-base').textContent = formatUSD(basePrice) + ' / m²';
      const propsEl = document.getElementById('summary-props');
      if (propsEl) propsEl.textContent = '+' + formatUSD(propsAcc) + ' / m²';
      document.getElementById('summary-lme').textContent = (lmeAdj >= 0 ? '+$' : '-$') + Math.abs(lmeAdj).toFixed(3) + ' / m²';
      $('summary-aluminium').textContent = (aluminium >= 0 ? '+$' : '-$') + Math.abs(aluminium).toFixed(3) + ' / m²';
      document.getElementById('summary-surcharge').textContent = '+$' + surcharge.toFixed(3) + ' / m²';
      document.getElementById('summary-unit-rate').textContent = formatUSD(finalUnitRate) + ' / m²';
      document.getElementById('summary-total-contract').textContent = formatUSD(totalContract);

      const terms = termsList();
      const termsTotal = terms.reduce((a, t) => a + t.pct, 0);
      $('summary-terms-preview').innerHTML = terms.map(t => `<div class="flex justify-between"><span>M${t.idx + 1} ${esc(t.type)} (${fmtNum(t.pct, 0)}%):</span><strong class="text-white font-mono">${formatUSD(t.amount)}</strong></div>`).join('');
      $('bd-terms-total').textContent = `Total ${fmtNum(termsTotal, 0)}%`;
      $('bd-terms-total').className = `text-xs font-mono font-bold ${Math.abs(termsTotal - 100) < 0.001 ? 'text-emerald-700' : 'text-rose-600'}`;

      // Update Global Header
      document.getElementById('ctx-area').textContent = area.toFixed(2) + ' m²';
      document.getElementById('ctx-contract').textContent = formatUSD(totalContract);

      // Update Step 2 Finance Totals
      document.getElementById('fin-banner-total').textContent = formatUSD(totalContract);
      document.getElementById('fin-table-header-total').textContent = formatUSD(totalContract);
      applyDesignLock();

      updatePlantCapacitySimulation(area);

      validateForecastSum();
      recalculateDCF();
      updateShellPlanCard();
      runFourWayRecon();
    }
    function renderBdWarnings() {
      const w = [];
      if (appState.lmeMode === 'Variable' && !appState.lmeHasRate) w.push('LME is Variable with no LME rate. Fill in the contract LME rate.');
      const termsTotal = termsList().reduce((a, t) => a + t.pct, 0);
      if (Math.abs(termsTotal - 100) >= 0.001) w.push(`Payment terms total ${fmtNum(termsTotal, 0)}%. They must total 100%.`);
      if ($('bd-nca-date').value && $('bd-po-date').value && $('bd-nca-date').value < $('bd-po-date').value) w.push('NCA date is before the PO date.');
      $('bd-warnings').innerHTML = w.map(t => `<div class="px-2.5 py-1.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-semibold">⚠ ${esc(t)}</div>`).join('');
    }
    function validateForecastSum() {
      const inputs = document.querySelectorAll('.fc-month-input');
      let sum = 0;
      inputs.forEach(inp => {
        sum += parseFloat(inp.value) || 0;
      });
      document.getElementById('fc-sum-m2').textContent = sum.toFixed(2) + ' m²';
      const statusBox = document.getElementById('bd-forecast-status');
      const badge = document.getElementById('fc-match-badge');
      const diff = Math.abs(sum - appState.ncaArea);

      if (diff <= 0.05) {
        statusBox.className = 'p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-900';
        badge.className = 'font-bold text-emerald-700';
        badge.textContent = `✓ Matches Approved NCA Area (${appState.ncaArea.toFixed(2)} m²)`;
      } else {
        statusBox.className = 'p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs flex flex-wrap items-center justify-between gap-2 text-amber-900';
        badge.className = 'font-bold text-amber-800';
        badge.textContent = `⚠ Delta of ${(sum - appState.ncaArea).toFixed(2)} m² vs NCA (${appState.ncaArea.toFixed(2)} m²)`;
      }
      refreshAll();
    }

    // =========================================================================
    // STEP 3: SHELL PLAN & DESIGN DATE LOGIC + DCF CALCULATOR
    // =========================================================================
    // Counts Monday to Friday, including both end dates
    function calcBusinessDays(startStr, endStr) {
      if (!startStr || !endStr) return 0;
      const total = daysBetween(startStr, endStr);
      if (isNaN(total)) return 0;
      if (total < 0) return total;
      let days = 0;
      for (let i = 0; i <= total; i++) {
        if (![0, 6].includes(new Date(addDays(startStr, i) + 'T00:00:00Z').getUTCDay())) days++;
      }
      return days;
    }

    function setDateBanner(bannerId, textId, ok, html) {
      $(bannerId).className = `p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'}`;
      $(textId).innerHTML = html;
    }

    function validateShellPlanSchedule() {
      const s = $('sp-start-date').value, sub = $('sp-sub-date').value, e = $('sp-est-date').value, a = $('sp-act-date').value;
      const status = $('sp-rev-select').value;
      if (s && e && e < s) {
        setDateBanner('sp-validation-banner', 'sp-validation-text', false, '<strong>REFUSED:</strong> Est. Completion Date is before the Start Date. This prevents the old 1900-01-29 spreadsheet error.');
      } else if (a && sub && a < sub) {
        setDateBanner('sp-validation-banner', 'sp-validation-text', false, '<strong>REFUSED:</strong> Approved Date must be on or after the Submission Date.');
      } else if (/Approved|Reapprove/.test(status) && !a) {
        setDateBanner('sp-validation-banner', 'sp-validation-text', false, '<strong>REFUSED:</strong> An approved status needs an Approved Date.');
      } else {
        setDateBanner('sp-validation-banner', 'sp-validation-text', true, `Dates valid: ${calcBusinessDays(s, a || e)} business days from start. Each date is checked on entry.`);
      }
      const clock = appState.rules.shellPlanClockDays;
      const used = daysBetween(s, a || DEMO_TODAY);
      $('sp-clock-pill').textContent = `Shell-plan clock: ${used} of ${clock} days${a ? ' (approved)' : ''}`;
      // Green once approved in time, amber while the clock runs, red when it has run out
      $('sp-clock-pill').dataset.state = used > clock ? 'late' : a ? 'ok' : 'running';
      refreshAll();
    }
    function addShellRevision() {
      if (!guard(['SHELLPLAN', 'DESIGN'], 'record Shell Plan revisions')) return;
      const rev = appState.shellRevisions.length;
      appState.shellRevisions.unshift({ rev, status: $('sp-rev-select').value, date: $('sp-sub-date').value, remarks: $('sp-remarks').value.trim() });
      logActivity(`Shell Plan revision ${rev} recorded: ${$('sp-rev-select').value}`);
      refreshAll();
    }
    function renderShellHistory() {
      $('sp-history').innerHTML = appState.shellRevisions.map(r => `<div class="p-2 rounded bg-white border border-slate-200 flex justify-between gap-2"><span><strong>Rev ${r.rev}: ${esc(r.status)}</strong> — ${esc(r.remarks)}</span><span class="font-mono text-slate-500">${esc(r.date)}</span></div>`).join('');
    }

    function updateShellPlanCard() {
      document.getElementById('sp-load-output').textContent = `${appState.ncaArea} m² Verified Shell Envelope`;
    }

    function designDatesValid() {
      const s = $('des-start-date').value, e = $('des-est-date').value, a = $('des-act-date').value;
      if (s && e && e < s) return false;
      if (s && a && a < s) return false;
      return true;
    }
    function designIsComplete() { return $('des-status').value === 'Completed' && !!$('des-act-date').value && designDatesValid(); }

    function validateDesignSchedule() {
      const s = $('des-start-date').value, e = $('des-est-date').value, a = $('des-act-date').value;
      if (!designDatesValid()) {
        setDateBanner('des-validation-banner', 'des-validation-text', false, '<strong>REFUSED (NO 1900-01-29 BUG):</strong> Completion must be on or after the Start Date.');
      } else if ($('des-status').value === 'Completed' && !a) {
        setDateBanner('des-validation-banner', 'des-validation-text', false, '<strong>REFUSED:</strong> A completion date is required before status can be Completed.');
      } else {
        setDateBanner('des-validation-banner', 'des-validation-text', true, `Dates valid: design duration calculated as <strong>${calcBusinessDays(s, a || e)} business days</strong>.`);
      }
      refreshAll();
    }

    function simulateInvalidDesignDate() {
      document.getElementById('des-start-date').value = '2026-11-14';
      document.getElementById('des-est-date').value = '2026-11-02';
      validateDesignSchedule();
      notify('Simulated a negative date sequence and refused it. The gate turns red until fixed.', 'error');
    }

    function restoreValidDesignDate() {
      document.getElementById('des-start-date').value = '2026-11-04';
      document.getElementById('des-est-date').value = '2026-11-14';
      validateDesignSchedule();
      notify('Restored valid design dates', 'success');
    }

    function designWeight() { return $('des-dcf-multiplier').value === 'Complex' ? appState.rules.complexWeight : 1; }
    function recalculateDCF() {
      const mult = designWeight();
      const weighted = Math.round(appState.ncaArea * mult * 10) / 10;
      document.getElementById('des-dcf-output').textContent = `${weighted.toLocaleString()} weighted m² (${appState.ncaArea} × ${mult})`;
      $('des-cap-label').textContent = appState.rules.designCapacity.toLocaleString();
      refreshAll();
    }

    // Accessories & holing items, one SLA clock per item
    function itemDone(i) { return i.status === 'Completed' || (i.qtyReq > 0 && i.qtyDone >= i.qtyReq); }
    function slaOf(i) {
      const hours = appState.rules.accessoriesSlaHours;
      const start = new Date(i.slaStart);
      const end = itemDone(i) && i.completedAt ? new Date(i.completedAt) : DEMO_NOW;
      const used = (end - start) / 3600000;
      return { hours, used, left: hours - used, over: used > hours };
    }
    const hhmm = h => `${Math.floor(Math.abs(h))}h ${String(Math.round((Math.abs(h) % 1) * 60)).padStart(2, '0')}m`;
    function addItem() {
      if (!guard(['DESIGN', 'PRODUCTION'], 'add accessories and holing items')) return;
      const name = $('item-name').value.trim();
      const qty = parseFloat($('item-qty').value);
      if (!name || !(qty > 0)) { notify('Enter an item name and a required quantity above 0.', 'error'); return; }
      appState.items.push({ id: ++appState.nextId, row: $('item-row').value, kind: $('item-kind').value, name, qtyReq: qty, qtyDone: 0, status: 'Ongoing', slaStart: DEMO_NOW.toISOString(), completedAt: null });
      $('item-name').value = ''; $('item-qty').value = '';
      logActivity(`Added ${name} on ${rowLabel($('item-row').value)}`);
      refreshAll();
    }
    function updateItemDone(id, value) {
      const i = appState.items.find(x => x.id === id);
      i.qtyDone = Math.max(0, parseFloat(value) || 0);
      if (i.qtyDone >= i.qtyReq) { i.status = 'Completed'; i.completedAt = i.completedAt || DEMO_NOW.toISOString(); }
      else { i.status = 'Ongoing'; i.completedAt = null; }
      logActivity(`${i.name} on ${rowLabel(i.row)}: ${i.qtyDone} of ${i.qtyReq} done`);
      refreshAll();
    }
    function renderItems() {
      $('items-sla-pill').textContent = `SLA ${appState.rules.accessoriesSlaHours}h`;
      $('items-table').innerHTML = table(['MR11 Row', 'Kind', 'Item', 'Qty Done / Required', 'Status', 'SLA Clock'], appState.items.map(i => {
        const s = slaOf(i);
        const clock = itemDone(i)
          ? pill(s.over ? `DONE, ${hhmm(s.left)} OVER` : `DONE IN ${hhmm(s.used)}`, s.over ? 'amber' : 'emerald')
          : pill(s.over ? `${hhmm(s.left)} OVER` : `${hhmm(s.left)} LEFT`, s.over ? 'rose' : 'emerald');
        return [esc(rowLabel(i.row)), i.kind === 'HOLING' ? 'Holing' : 'Accessory', esc(i.name),
          `<input type="number" value="${i.qtyDone}" onchange="updateItemDone(${i.id}, this.value)" aria-label="Quantity done" class="w-20 px-1.5 py-0.5 border border-slate-300 rounded font-mono"> / <span class="font-mono">${i.qtyReq}</span>`,
          esc(itemDone(i) ? 'Completed' : i.status), clock];
      }));
    }

    // Design-load and plant capacity by month
    const DESIGN_BASE = [82000, 74000, 61000, 52000, 40000, 30000];
    const PLANT_BASE = [74200, 71000, 66000, 58000, 47000, 36000];
    function capacityByMonth() {
      const months = forecastInputs();
      const start = $('des-start-date').value, end = $('des-act-date').value || $('des-est-date').value;
      const span = start && end && end >= start ? daysBetween(start, end) + 1 : 0;
      return MONTH_KEYS.map((key, i) => {
        let days = 0;
        for (let d = 0; d < span; d++) if (addDays(start, d).startsWith(key)) days++;
        const design = DESIGN_BASE[i] + (span ? appState.ncaArea * designWeight() * days / span : 0);
        const plant = PLANT_BASE[i] + (months[i] || 0);
        return { label: MONTH_LABELS[i], key, design, plant, designPct: design / appState.rules.designCapacity * 100, plantPct: plant / appState.rules.productionCapacity * 100 };
      });
    }
    function renderCapacity() {
      const bar = pct => `<div class="flex items-center gap-2"><div class="w-24 h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full ${pct > 100 ? 'bg-rose-600' : 'bg-sky-600'}" style="width:${Math.min(100, pct)}%"></div></div><span class="font-mono ${pct > 100 ? 'text-rose-600 font-bold' : ''}">${fmtNum(pct, 1)}%</span></div>`;
      $('capacity-table').innerHTML = table(['Month', 'Design Load (Weighted m²)', 'Of Design Capacity', 'Active Plant m²', 'Of Plant Capacity'],
        capacityByMonth().map(m => [m.label, `<span class="font-mono">${fmtNum(m.design, 0)}</span>`, bar(m.designPct), `<span class="font-mono">${fmtNum(m.plant, 0)}</span>`, bar(m.plantPct)]));
    }

    // =========================================================================
    // STEP 4: PANEL REGISTER, DAILY ACTUALS & PLANNING SERIES
    // =========================================================================
    function expandCodes(text) {
      const codes = [];
      text.split(',').map(t => t.trim()).filter(Boolean).forEach(token => {
        const m = /^([A-Za-z-]*)(\d+)\s+to\s+[A-Za-z-]*(\d+)$/i.exec(token);
        if (!m) { codes.push(token.toUpperCase()); return; }
        for (let n = parseInt(m[2], 10); n <= parseInt(m[3], 10); n++) codes.push((m[1] + String(n).padStart(m[2].length, '0')).toUpperCase());
      });
      return codes;
    }
    function panelM2AtOrPast(stage) {
      const from = PANEL_STAGES.indexOf(stage);
      return appState.panels.filter(p => PANEL_STAGES.indexOf(p.stage) >= from).reduce((a, p) => a + p.m2, 0);
    }
    function recordPanelActuals({ codesText, stage, date, sourceType, evidence, reason, source }) {
      if (!guard(['PRODUCTION', 'PLANNING', 'DISPATCH'], 'record panel actuals')) return false;
      if (!date || date > DEMO_TODAY) { notify('The date must be a real date and not in the future.', 'error'); return false; }
      const codes = expandCodes(codesText);
      if (!codes.length) { notify('Enter at least one panel code.', 'error'); return false; }
      const unknown = codes.filter(c => !appState.panels.some(p => p.code === c));
      if (unknown.length) { notify(`Refused: unknown panel code(s) ${unknown.join(', ')}. Add them to the Panel Register first.`, 'error'); return false; }
      if (appState.rules.evidenceRequiredFor.includes(stage) && !evidence.trim()) { notify(`No evidence, no change: ${stage} updates need a source.`, 'error'); return false; }
      const panels = appState.panels.filter(p => codes.includes(p.code));
      const behind = panels.filter(p => PANEL_STAGES.indexOf(p.stage) >= PANEL_STAGES.indexOf(stage));
      if (behind.length) { notify(`Refused: ${behind.map(p => p.code).join(', ')} already reached ${behind[0].stage}.`, 'error'); return false; }
      panels.forEach(p => { p.stage = stage; });
      const m2 = panels.reduce((a, p) => a + p.m2, 0);
      appState.panelLog.unshift({ codes: codesText, m2, stage, date, source, reason });
      addUpdate(stage, appState.projectName, `${fmtNum(m2)} m² (${codesText})${reason ? `; ${reason}` : ''}`, sourceType, evidence, source);
      const prodInput = $('recon-prod-input');
      const produced = panelM2AtOrPast('PRODUCED');
      if (produced > (parseFloat(prodInput.value) || 0)) prodInput.value = produced;
      runFourWayRecon();
      notify(`Saved ${fmtNum(m2)} m² for ${codesText}: now ${stage}`, 'success');
      return true;
    }
    function logFactoryBatch() {
      recordPanelActuals({ codesText: $('prod-serial-input').value, stage: $('prod-state-select').value, date: $('prod-date').value, sourceType: $('prod-source').value, evidence: $('prod-evidence').value, reason: $('prod-reason').value.trim(), source: 'Web' });
    }
    function addPanelBatch() {
      if (!guard(['PLANNING'], 'add panels')) return;
      const prefix = $('pb-prefix').value.trim(), from = parseInt($('pb-from').value, 10), to = parseInt($('pb-to').value, 10), m2 = parseFloat($('pb-m2').value);
      if (!prefix || !(from >= 0) || !(to >= from) || !(m2 > 0)) { notify('Enter a prefix, a number range and the m² for each panel.', 'error'); return; }
      let added = 0;
      for (let n = from; n <= to; n++) {
        const code = (prefix + String(n).padStart(3, '0')).toUpperCase();
        if (appState.panels.some(p => p.code === code)) continue;
        appState.panels.push({ code, type: 'Wall', m2, series: $('pb-series').value.trim(), block: $('pb-block').value, stage: 'DESIGNED', row: 'LIVE' });
        added++;
      }
      logActivity(`Added ${added} panel(s) to the register`);
      notify(`Added ${added} panel(s) as DESIGNED`, 'success');
      refreshAll();
    }
    function importPanels() {
      if (!guard(['PLANNING'], 'import panels')) return;
      const lines = $('pb-paste').value.split('\n').map(l => l.trim()).filter(Boolean);
      let added = 0, updated = 0, refused = 0;
      lines.forEach(line => {
        const [code, type, m2Text, series, block] = line.split(line.includes('\t') ? '\t' : ',').map(p => p.trim());
        const m2 = parseFloat(m2Text);
        if (!code || !(m2 > 0)) { refused++; return; }
        const existing = appState.panels.find(p => p.code === code.toUpperCase());
        if (existing) { Object.assign(existing, { type: type || existing.type, m2, series: series || existing.series, block: block || existing.block }); updated++; }
        else { appState.panels.push({ code: code.toUpperCase(), type: type || 'Wall', m2, series: series || '', block: block || appState.blocks[0], stage: 'DESIGNED', row: 'LIVE' }); added++; }
      });
      $('pb-paste').value = '';
      logActivity(`Imported panels: ${added} added, ${updated} updated`);
      notify(`${added} added, ${updated} updated${refused ? `, ${refused} refused` : ''}`, refused ? 'error' : 'success');
      refreshAll();
    }
    function renderPanels() {
      const blocks = [...new Set(appState.panels.map(p => p.block))];
      const rows = blocks.map(b => [esc(b), ...PANEL_STAGES.map(s => {
        const m2 = appState.panels.filter(p => p.block === b && p.stage === s).reduce((a, p) => a + p.m2, 0);
        return `<span class="font-mono ${m2 ? 'font-bold' : 'text-slate-300'}">${fmtNum(m2, 1)}</span>`;
      }), `<span class="font-mono font-bold">${fmtNum(appState.panels.filter(p => p.block === b).reduce((a, p) => a + p.m2, 0), 1)}</span>`]);
      $('panel-rollup').innerHTML = table(['Tower / Block (m²)', ...PANEL_STAGES, 'Total'], rows);
      $('prod-log-list').innerHTML = appState.panelLog.slice(0, 5).map(l => `<div class="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"><div><span class="font-mono font-bold text-slate-900">${esc(l.codes)}</span><span class="text-slate-500 ml-2">• ${fmtNum(l.m2, 1)} m² • ${esc(l.stage)} • ${esc(l.date)}</span></div>${pill(l.source, 'sky')}</div>`).join('');
      $('planning-table').innerHTML = table(['Series', 'Building', 'Area m²', 'Processed m²', 'Date', 'Pack', 'Stock', 'Order Status', 'Reason'],
        appState.planningSeries.map(s => [esc(s.series), esc(s.building), fmtNum(s.area), fmtNum(s.processed), esc(s.date), esc(s.pack), esc(s.stock), esc(s.status), esc(s.reason)]));
    }
    function addPlanningSeries() {
      if (!guard(['PLANNING'], 'save series')) return;
      const area = parseFloat($('ps-area').value), processed = parseFloat($('ps-processed').value);
      if (!$('ps-series').value.trim() || isNaN(area) || isNaN(processed)) { notify('Series, area and processed m² are required, and must be numbers.', 'error'); return; }
      if (processed < area && !$('ps-reason').value.trim()) { notify('A reason is required when an amount is not processed.', 'error'); return; }
      appState.planningSeries.unshift({ series: $('ps-series').value.trim(), building: $('ps-building').value.trim(), area, processed, date: $('ps-date').value, pack: $('ps-pack').value, stock: $('ps-stock').value, status: $('ps-status').value.trim(), reason: $('ps-reason').value.trim() });
      addUpdate('PROCESSED', appState.projectName, `${processed} m² in series ${$('ps-series').value.trim()}`, '', '', 'Web');
      ['ps-series', 'ps-building', 'ps-area', 'ps-processed', 'ps-status', 'ps-reason'].forEach(id => { $(id).value = ''; });
      notify('Series saved', 'success');
      refreshAll();
    }

    // =========================================================================
    // STEP 4 & 5: YARD EVIDENCE & 4-WAY RECONCILIATION
    // =========================================================================
    function reconFor(r) {
      const tol = appState.rules.reconTolerancePct;
      const issues = [];
      if (!r.ncaQty || r.designFinal === null || r.designFinal === undefined) return { status: 'INCOMPLETE', issues: ['Design final not entered yet'], tol };
      // The design's final m² can be well off the NCA (the design decides it), so that is not a variance;
      // only what is made and shipped is held to the design
      if (r.producedM2 > r.designFinal * (1 + tol / 100)) issues.push(`Produced ${fmtNum(r.producedM2)} m² runs past design final ${fmtNum(r.designFinal)} m²`);
      if (r.shippedM2 > r.producedM2 * (1 + tol / 100)) issues.push(`Shipped ${fmtNum(r.shippedM2)} m² runs past produced ${fmtNum(r.producedM2)} m²`);
      return { status: issues.length ? 'VARIANCE' : 'RECONCILED', issues, tol };
    }
    function runFourWayRecon() {
      const prod = Math.max(0, parseFloat(document.getElementById('recon-prod-input').value) || 0);
      const ship = Math.max(0, parseFloat(document.getElementById('recon-ship-input').value) || 0);
      const design = parseFloat($('des-final-m2').value) || 0;
      const tol = appState.rules.reconTolerancePct;

      $('recon-nca-m2').textContent = fmtNum(appState.ncaArea);
      $('recon-nca-ver').textContent = `v${latestNca().version}`;
      $('recon-des-m2').textContent = fmtNum(design);
      $('recon-tol-label').textContent = fmtNum(tol, 1);
      $('recon-panel-m2').textContent = fmtNum(panelM2AtOrPast('PRODUCED'));
      document.getElementById('recon-ship-limit-hint').textContent = `To ship: ${fmtNum(Math.max(0, prod - ship))} m². Must be ≤ Produced unless confirmed.`;

      const alertBanner = document.getElementById('shipped-exceeds-produced-alert');
      const shipCard = document.getElementById('recon-ship-card');
      const statusBox = document.getElementById('recon-status-box');
      const refused = ship > prod && !appState.confirmOver;

      alertBanner.classList.toggle('hidden', !refused);
      shipCard.className = `${refused ? 'bg-rose-50 border-rose-600' : 'bg-white border-emerald-400'} rounded-xl border-2 p-4 space-y-1.5 transition-all`;
      if (refused) {
        document.getElementById('shipped-violation-detail').textContent =
          `Shipped (${fmtNum(ship)} m²) is ${fmtNum(ship - prod)} m² ahead of Produced (${fmtNum(prod)} m²). Correct it, or confirm on purpose so that it is logged.`;
      }
      const live = getLiveRow1Record();
      const recon = reconFor(live);
      if (refused) {
        statusBox.className = 'p-3.5 rounded-xl bg-rose-100 border border-rose-300 text-xs text-rose-900 font-bold';
        statusBox.textContent = '✗ Entry refused: Shipped cannot run ahead of Produced without confirmation.';
      } else if (recon.status === 'VARIANCE') {
        statusBox.className = 'p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 font-semibold';
        statusBox.textContent = `⚠ RECON_VARIANCE alert raised (over ${fmtNum(tol, 1)}%): ${recon.issues.join('; ')}. Shipment is not blocked.`;
      } else {
        statusBox.className = 'p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium';
        statusBox.textContent = `✓ Reconciled within ${fmtNum(tol, 1)}%: NCA ${fmtNum(appState.ncaArea)} / Design ${fmtNum(design)} / Produced ${fmtNum(prod)} / Shipped ${fmtNum(live.shippedM2)} m². Shipped counts once loads go out.`;
      }
      const processed = appState.planningSeries.reduce((a, s) => a + s.processed, 0);
      $('recon-reference').innerHTML = [['Processed (Reference)', processed], ['Panel Register Total', appState.panels.reduce((a, p) => a + p.m2, 0)], ['To Ship', Math.max(0, live.producedM2 - live.shippedM2)]]
        .map(([k, v]) => `<div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200"><span class="text-slate-500 block text-[11px]">${k}</span><span class="font-mono font-bold">${fmtNum(v)} m²</span></div>`).join('');
      refreshAll();
    }
    function onShippedTyped() {
      appState.confirmOver = false;
      runFourWayRecon();
    }
    function confirmOverShip() {
      appState.confirmOver = true;
      logActivity(`Confirmed shipped ${$('recon-ship-input').value} m² above produced ${$('recon-prod-input').value} m² on purpose`);
      notify('Confirmed on purpose and logged. A RECON_VARIANCE alert stays open if it is over tolerance.', 'info');
      runFourWayRecon();
    }
    function testShippedGreaterThanProduced() {
      const prod = parseFloat(document.getElementById('recon-prod-input').value) || 842;
      document.getElementById('recon-ship-input').value = prod + 48;
      onShippedTyped();
      notify('Refused: Shipped cannot run ahead of Produced without confirmation.', 'error');
    }
    function clampShippedToProduced() {
      const prod = parseFloat(document.getElementById('recon-prod-input').value) || 0;
      document.getElementById('recon-ship-input').value = prod;
      onShippedTyped();
      notify(`Corrected Shipped to Produced (${prod} m²)`, 'success');
    }
    function resetReconValues() {
      document.getElementById('recon-prod-input').value = 842;
      document.getElementById('recon-ship-input').value = 450;
      $('des-final-m2').value = appState.ncaArea;
      onShippedTyped();
      notify('Restored baseline figures (842 m² Produced / 450 m² Shipped)', 'success');
    }
    function addEvidenceFiles(input) {
      const files = [...input.files];
      const bad = files.filter(f => !(f.type.startsWith('image/') || f.type === 'application/pdf') || f.size > 5 * 1024 * 1024);
      if (bad.length) notify(`Refused ${bad.map(f => f.name).join(', ')}: photos or PDF only, up to 5 MB each.`, 'error');
      files.filter(f => !bad.includes(f)).forEach(f => {
        if (appState.yardEvidence.length >= 5) { notify('At most 5 files can be attached.', 'error'); return; }
        appState.yardEvidence.push({ name: f.name, type: f.type === 'application/pdf' ? 'PDF' : 'Photo' });
      });
      input.value = '';
      renderYardEvidence();
    }
    function removeEvidence(index) { appState.yardEvidence.splice(index, 1); renderYardEvidence(); }
    function renderYardEvidence() {
      const hasAny = appState.yardEvidence.length > 0 || !!$('yard-ref').value.trim();
      $('yard-photo-badge').textContent = hasAny ? 'Attached' : 'Missing';
      $('yard-photo-badge').className = `px-2 py-0.5 rounded text-[10px] font-bold ${hasAny ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`;
      $('yard-evidence-list').innerHTML = appState.yardEvidence.map((e, i) => `<div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200"><span class="font-mono text-slate-700">${esc(e.name)} (${esc(e.type)})</span><button onclick="removeEvidence(${i})" class="text-rose-600 font-bold hover:underline">Remove</button></div>`).join('');
    }
    function markYardReady() {
      if (!appState.yardEvidence.length && !$('yard-ref').value.trim()) { notify('No evidence, no change: attach a file or give a reference first.', 'error'); return; }
      addUpdate('NOTE', appState.projectName, 'Yard entry marked ready', $('yard-source').value, $('yard-ref').value.trim() || appState.yardEvidence[0].name, 'Web');
      notify('Yard entry marked ready with evidence.', 'success');
      refreshAll();
    }

    // =========================================================================
    // STEP 5: 5-POINT DISPATCH-READINESS GATE
    // =========================================================================
    function gateFor(key) {
      const r = referenceMR11Projects.find(x => x.key === key);
      const live = key === 'LIVE';
      const nonPhysical = /Re-Design Only/.test(live ? appState.productType : r.product);
      const kindOk = kind => appState.items.filter(i => i.row === key && i.kind === kind).every(itemDone);
      const raw = {
        design: live ? designIsComplete() : !/pending/i.test(r.designDate),
        payment: live ? appState.advanceCleared : /CLEARED/.test(r.advStatus),
        holing: kindOk('HOLING'),
        accessories: kindOk('ACCESSORY'),
        freight: live ? !!appState.freightRef : !!r.freightRef
      };
      const checks = GATE_DEFS.map(d => {
        const off = !appState.rules.gateChecks[d.id];
        return { ...d, off, pass: off || (raw[d.id] && !(live && appState.simFail[d.id])) };
      });
      const green = checks.every(c => c.pass);
      const released = appState.releases.some(x => x.row === key && x.active);
      if (nonPhysical) return { checks: checks.map(c => ({ ...c, pass: true, na: true })), green: true, released: false, ok: true, failed: [], nonPhysical: true };
      return { checks, green, released, ok: green || released, failed: checks.filter(c => !c.pass).map(c => c.name) };
    }
    function renderGate6Cards() {
      const gate = gateFor('LIVE');
      const passedCount = gate.checks.filter(c => c.pass).length;
      $('gate6-cards-grid').innerHTML = gate.checks.map(chk => {
        const tone = chk.off ? 'slate' : chk.pass ? 'emerald' : 'rose';
        return `<div class="p-4 rounded-xl border-2 border-${tone}-${chk.off ? '300' : '500'} bg-${tone}-50/60 text-${tone}-950 transition space-y-2">
          <div class="flex items-center justify-between gap-1">
            <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-${tone}-600 text-white">${chk.off ? 'OFF' : chk.pass ? 'GREEN' : 'RED STOP'}</span>
            <button onclick="toggleGateCheck('${chk.id}')" class="text-[10px] text-slate-500 hover:underline">${appState.simFail[chk.id] ? 'End simulation' : 'Simulate fail'}</button>
          </div>
          <div class="font-bold text-xs">${chk.name}</div>
          <div class="text-[11px] text-slate-600">${chk.pass ? `Required: ${chk.need}` : esc(chk.impact)}</div>
        </div>`;
      }).join('');
      const badge = $('gate6-overall-badge');
      if (gate.green) {
        badge.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800';
        badge.textContent = `${passedCount} / 5 GREEN — LORRY BOOKING OPEN`;
      } else if (gate.released) {
        badge.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900';
        badge.textContent = `${passedCount} / 5 GREEN — ADMIN RELEASE ACTIVE`;
      } else {
        badge.className = 'px-3 py-1.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800';
        badge.textContent = `HARD STOP: ${passedCount} / 5 GREEN — BOOKING BLOCKED`;
      }
      $('gate-matrix').innerHTML = table(['MR11 Row', ...GATE_DEFS.map(d => d.name.slice(3)), 'Result', 'Production Release', 'Stock Waiting (m²)', '<span class="sr-only">Actions</span>'], allMr11Rows().map(r => {
        const g = gateFor(r.key);
        return [`<strong>${esc(r.customerProject)}</strong>`,
          ...g.checks.map(c => c.na ? pill('N/A', 'slate') : c.off ? pill('OFF', 'slate') : c.pass ? pill('GREEN', 'emerald') : pill('RED', 'rose')),
          g.nonPhysical ? pill('NO PHYSICAL DISPATCH', 'slate') : g.green ? pill('GREEN', 'emerald') : g.released ? pill('RELEASED', 'amber') : pill('NOT GREEN', 'rose'),
          productionReleaseFlag(r.key).length ? pill(`FLAGGED: NO ${productionReleaseFlag(r.key).join(' / ').toUpperCase()}`, 'amber') : pill('OK', 'emerald'),
          `<span class="font-mono">${fmtNum(stockWaiting(r))}</span>`,
          g.green ? '' : g.released ? `<button onclick="endRelease('${r.key}')" class="text-[11px] text-slate-600 hover:underline">End release</button>` : `<button onclick="openReleaseModal('${r.key}')" class="text-[11px] font-bold text-amber-700 hover:underline">Release</button>`];
      }));
      $('gate-release-log').innerHTML = appState.releases.map(x => `<div class="p-2.5 rounded bg-amber-50 border border-amber-200 flex justify-between gap-2"><span><strong>${esc(rowLabel(x.row))}</strong> released: ${esc(x.reason)}${x.active ? '' : ' (ended)'}</span><span class="font-mono text-amber-800">${esc(x.who)} • ${esc(x.when)}</span></div>`).join('');
    }
    function toggleGateCheck(id) {
      appState.simFail[id] = !appState.simFail[id];
      refreshAll();
    }
    function saveFreightRef() {
      if (!guard(['DISPATCH'], 'confirm freight')) return;
      appState.freightRef = $('freight-ref').value.trim();
      logActivity(appState.freightRef ? `Freight confirmed: ${appState.freightRef}` : 'Freight confirmation removed');
      notify(appState.freightRef ? 'Freight confirmed.' : 'Freight confirmation removed; check 5 is red.', appState.freightRef ? 'success' : 'error');
      refreshAll();
    }
    function openReleaseModal(key) {
      if (!guard(['ADMIN'], 'release a row')) return;
      const g = gateFor(key);
      if (g.green) { notify(`${rowLabel(key)} is already green, so no release is needed.`, 'info'); return; }
      askModal({
        title: 'Admin Release', desc: `${rowLabel(key)} is not green (${g.failed.join(', ')}). Releasing lets a lorry be booked. Your name and reason are logged.`, label: 'Written reason', confirm: 'Release Row', min: 10,
        onOk: reason => {
          appState.releases.unshift({ row: key, reason, who: ROLES[appState.role], when: nowStamp(), active: true });
          logActivity(`Released ${rowLabel(key)} at the gate: ${reason}`);
          notify('Release logged with your reason.', 'success');
          refreshAll();
        }
      });
    }
    function endRelease(key) {
      appState.releases.filter(x => x.row === key).forEach(x => { x.active = false; });
      logActivity(`Ended the gate release on ${rowLabel(key)}`);
      refreshAll();
    }

    // =========================================================================
    // STEP 6 & 7: FORWARD LORRY PLANNING, ETD LOG, SITE RECEIVING & INCIDENTS
    // =========================================================================
    function rowLabel(key) {
      if (key === 'LIVE') return appState.projectName;
      return referenceMR11Projects.find(r => r.key === key)?.customerProject.trim() || key;
    }
    const activeLorry = l => l.status === 'Planned' || l.status === 'Loaded';
    function bookedM2(key) { return appState.lorries.filter(l => l.row === key && activeLorry(l)).reduce((a, l) => a + l.m2, 0); }
    function stockWaiting(r) { return Math.max(0, r.producedM2 - r.shippedM2 - bookedM2(r.key)); }
    function refuseIfNotGreen(key) {
      if (!appState.rules.enforceGateOnLorries) return false;
      const g = gateFor(key);
      if (g.ok) return false;
      notify(`Refused: ${rowLabel(key)} is not green. Failing: ${g.failed.join(', ')}.`, 'error');
      return true;
    }
    function bookLorry() {
      if (!guard(['DISPATCH'], 'book lorries')) return;
      const key = $('lorry-row').value, m2 = parseFloat($('lorry-m2').value);
      if (!(m2 > 0)) { notify('Enter the load in m² as a number above 0.', 'error'); return; }
      if (refuseIfNotGreen(key)) return;
      const id = `LORRY-${String(++appState.lorrySeq).padStart(2, '0')}`;
      appState.lorries.push({ id, date: $('lorry-date').value, ref: $('lorry-ref').value.trim(), dest: $('lorry-dest').value.trim() || rowLabel(key), cap: appState.rules.lorryCapacityM2, row: key, m2, status: 'Planned' });
      logActivity(`Booked ${id} for ${rowLabel(key)}: ${m2} m²`);
      notify(`${id} booked for ${rowLabel(key)}`, 'success');
      refreshAll();
    }
    function planLorriesForGreenStock() {
      if (!guard(['DISPATCH'], 'plan lorries')) return;
      const cap = appState.rules.lorryCapacityM2;
      let date = DEMO_TODAY, made = 0;
      const skipped = [];
      allMr11Rows().forEach(r => {
        let stock = stockWaiting(r);
        if (stock <= 0) return;
        if (appState.rules.enforceGateOnLorries && !gateFor(r.key).ok) { skipped.push(r.customerProject.trim()); return; }
        while (stock > 0) {
          date = nextWorkingDay(date);
          const m2 = Math.min(cap, stock);
          appState.lorries.push({ id: `LORRY-${String(++appState.lorrySeq).padStart(2, '0')}`, date, ref: '', dest: r.customerProject.trim(), cap, row: r.key, m2, status: 'Planned' });
          stock -= m2;
          made++;
        }
      });
      logActivity(`Planned ${made} lorries for green stock`);
      notify(`Planned ${made} lorries from the next working day${skipped.length ? `. Skipped, not green: ${skipped.join(', ')}` : ''}.`, made ? 'success' : 'info');
      refreshAll();
    }
    function setLorryStatus(id, status) {
      if (!guard(['DISPATCH'], 'update lorries')) { refreshAll(); return; }
      const l = appState.lorries.find(x => x.id === id);
      l.status = status;
      if (status === 'Departed') {
        if (l.row === 'LIVE') {
          $('recon-ship-input').value = (parseFloat($('recon-ship-input').value) || 0) + l.m2;
          appState.confirmOver = false;
        } else {
          referenceMR11Projects.find(r => r.key === l.row).shippedM2 += l.m2;
        }
        addUpdate('DISPATCHED', rowLabel(l.row), `${fmtNum(l.m2)} m² on ${l.id}`, 'Document Link', l.ref || l.id, 'Web');
        notify(`${l.id} departed: Shipped updated and a departure alert shows in the platform.`, 'success');
      }
      logActivity(`${l.id} moved to ${status}`);
      if (status === 'Departed' && l.row === 'LIVE') runFourWayRecon(); else refreshAll();
    }
    function forecastInputs() {
      const months = [0, 0, 0, 0, 0, 0];
      document.querySelectorAll('.fc-month-input').forEach((inp, i) => { if (i < 6) months[i] = parseFloat(inp.value) || 0; });
      return months;
    }
    function forecastByMonthAllRows() {
      const rows = allMr11Rows().filter(r => !/Re-Design Only/.test(r.product));
      return MONTH_KEYS.map((_, i) => rows.reduce((a, r) => a + (r.monthsM2[i] || 0), 0));
    }
    function forecastNext8Weeks() {
      const byMonth = forecastByMonthAllRows();
      let total = 0;
      for (let d = 0; d < 56; d++) {
        const day = addDays(DEMO_TODAY, d);
        const i = MONTH_KEYS.indexOf(day.slice(0, 7));
        if (i < 0) continue;
        const [y, m] = day.split('-').map(Number);
        total += byMonth[i] / new Date(y, m, 0).getDate();
      }
      return total;
    }
    function renderLorries() {
      const cap = appState.rules.lorryCapacityM2;
      const rows = allMr11Rows();
      $('log-cap-label').textContent = cap;
      $('log-area-m2').textContent = `${fmtNum(rows.reduce((a, r) => a + stockWaiting(r), 0))} m²`;
      $('log-lorry-count').textContent = Math.ceil(forecastNext8Weeks() / cap);
      $('log-lorry-planned').textContent = appState.lorries.filter(activeLorry).length;
      const STATUSES = ['Planned', 'Loaded', 'Departed', 'Cancelled'];
      $('lorry-table').innerHTML = table(['Lorry', 'Date', 'Plate / Ref', 'MR11 Row', 'Destination', 'Load (m²)', 'Status'], appState.lorries.map(l => {
        const over = l.m2 > l.cap;
        const select = l.status === 'Departed' || l.status === 'Cancelled'
          ? pill(l.status, l.status === 'Departed' ? 'emerald' : 'slate')
          : `<select onchange="setLorryStatus('${l.id}', this.value)" aria-label="Lorry status" class="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-semibold">${STATUSES.map(s => `<option ${s === l.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
        return [`<span class="font-mono font-bold">${esc(l.id)}</span>`, esc(l.date), esc(l.ref) || '—', esc(rowLabel(l.row)), esc(l.dest),
          `<span class="font-mono ${over ? 'text-rose-600 font-bold' : ''}">${fmtNum(l.m2)} / ${fmtNum(l.cap, 0)}</span>`, select];
      }));
      const byMonth = forecastByMonthAllRows();
      $('lorry-forecast').innerHTML = table(['Month', 'Forecast m²', 'Lorries Needed', 'Lorries Planned', 'Gap'], MONTH_KEYS.map((key, i) => {
        const needed = Math.ceil(byMonth[i] / cap);
        const planned = appState.lorries.filter(l => l.date.startsWith(key) && l.status !== 'Cancelled').length;
        return [MONTH_LABELS[i], `<span class="font-mono">${fmtNum(byMonth[i])}</span>`, `<span class="font-mono">${needed}</span>`, `<span class="font-mono">${planned}</span>`, `<span class="font-mono ${needed > planned ? 'text-amber-700 font-bold' : 'text-emerald-700'}">${planned - needed}</span>`];
      }));
      const siteSelect = $('site-lorry-select');
      const received = appState.siteRegister.map(s => s.lorry);
      const options = appState.lorries.filter(l => l.status === 'Departed' && l.row === 'LIVE' && !received.includes(l.id));
      siteSelect.innerHTML = options.length ? options.map(l => `<option value="${l.id}">${l.id} (${fmtNum(l.m2, 0)} m²)</option>`).join('') : '<option value="">No departed lorry waiting</option>';
    }
    function renderEtdLog() {
      $('log-audit-entries').innerHTML = appState.etdLog.map(e => `<div class="p-2.5 rounded ${e.baseline ? 'bg-white border border-slate-200' : 'bg-amber-50 border border-amber-200'} flex justify-between gap-2">
        <span><strong>${e.baseline ? 'Baseline' : 'Revised'} ETD: ${esc(e.date)}</strong> — ${esc(e.reason)}</span>
        <span class="font-mono ${e.baseline ? 'text-slate-400' : 'text-amber-800'}">${e.baseline ? `Logged by ${esc(e.who)}` : `${esc(e.who)} • In-platform alert to BD`}</span>
      </div>`).join('');
    }
    function toggleShipMode() {
      const overseas = $('ship-mode').value === 'OVERSEAS';
      $('ship-local').classList.toggle('hidden', overseas);
      $('ship-overseas').classList.toggle('hidden', !overseas);
    }
    function saveShipping() {
      if (!guard(['DISPATCH'], 'save shipping details')) return;
      const overseas = $('ship-mode').value === 'OVERSEAS';
      const m2 = parseFloat($(overseas ? 'ship-o-m2' : 'ship-l-m2').value);
      if (!(m2 > 0)) { notify('Enter the m² as a number above 0.', 'error'); return; }
      if (refuseIfNotGreen('LIVE')) return;
      if (overseas) appState.sailedM2 += m2;
      addUpdate('DISPATCHED', appState.projectName, overseas ? `${m2} m² sailed, POD ${$('ship-o-pod').value}, vessel ${$('ship-o-vessel').value}` : `${m2} m² dispatched on ${$('ship-l-lorry').value}`, 'Document Link', overseas ? $('ship-o-vessel').value : $('ship-l-lorry').value, 'Web');
      notify('Shipping details saved to the update log.', 'success');
      refreshAll();
    }
    function addLogisticsRevision() {
      if (!guard(['DISPATCH'], 'change ETDs')) return;
      const date = document.getElementById('log-new-etd').value;
      const reason = document.getElementById('log-delay-reason').value.trim();
      if (!reason) { notify('Every ETD change needs a reason.', 'error'); return; }
      appState.etdLog.unshift({ date, reason, who: ROLES[appState.role] });
      document.getElementById('log-delay-reason').value = '';
      logActivity(`ETD changed to ${date}: ${reason}`);
      notify('Audited ETD change logged.', 'info');
      refreshAll();
    }
    function recordSiteProgress({ m2, where, note, evidence, source, lorry }) {
      if (appState.rules.evidenceRequiredFor.includes('DELIVERED') && !evidence.trim()) { notify('No evidence, no change: attach a photo or give a reference.', 'error'); return false; }
      appState.siteRegister.unshift({ lorry, m2, where, note, evidence, date: DEMO_TODAY, source });
      appState.siteProgressM2 += m2;
      addUpdate('DELIVERED', appState.projectName, `${fmtNum(m2)} m² at ${where}${lorry ? ` from ${lorry}` : ''}`, 'Photo', evidence, source);
      refreshAll();
      return true;
    }
    function confirmSiteDelivery() {
      const id = $('site-lorry-select').value;
      if (!id) { notify('No departed lorry is waiting. Mark a lorry as Departed in Step 6 first.', 'error'); return; }
      const lorry = appState.lorries.find(l => l.id === id);
      const where = `${$('site-stream-select').value} / ${$('site-block-select').value}`;
      if (recordSiteProgress({ m2: lorry.m2, where, note: $('site-note-input').value, evidence: $('site-evidence').value, source: 'Web', lorry: id })) {
        $('site-evidence').value = '';
        notify(`Site handover confirmed for ${id}: DELIVERED`, 'success');
      }
    }
    function renderSite() {
      $('site-delivery-list').innerHTML = appState.siteRegister.map(s => `<div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
        <div>
          <div class="font-bold text-emerald-950">${esc(s.lorry || 'Site progress')} (${fmtNum(s.m2)} m²) — ${esc(s.where)}: DELIVERED</div>
          <div class="text-[11px] text-emerald-800">${esc(s.note)} • Evidence: ${esc(s.evidence)} • ${esc(s.date)}</div>
        </div>
        ${pill(s.source, 'emerald')}
      </div>`).join('');
    }
    function addIncident() {
      if (!guard(['DISPATCH', 'FINANCE'], 'log incidents')) return;
      const cost = parseFloat($('inc-cost').value) || 0, m2 = parseFloat($('inc-m2').value) || 0;
      if (!cost && !m2) { notify('Enter the cost in MYR or the m² affected.', 'error'); return; }
      appState.incidents.unshift({ type: $('inc-type').value, date: $('inc-date').value, row: appState.projectName, cost, m2, note: $('inc-note').value.trim() });
      $('inc-cost').value = ''; $('inc-m2').value = ''; $('inc-note').value = '';
      logActivity(`Logged incident: ${appState.incidents[0].type}, MYR ${cost}`);
      refreshAll();
    }
    function incidentTotals() {
      const totals = {};
      appState.incidents.forEach(i => { totals[i.type] = totals[i.type] || { count: 0, cost: 0, m2: 0 }; totals[i.type].count++; totals[i.type].cost += i.cost; totals[i.type].m2 += i.m2; });
      return totals;
    }
    function renderIncidents() {
      const rows = Object.entries(incidentTotals()).map(([type, t]) => [`<strong>${esc(type)} (total)</strong>`, '', '', `<span class="font-mono font-bold">MYR ${fmtNum(t.cost)}</span>`, `<span class="font-mono font-bold">${fmtNum(t.m2)}</span>`, `${t.count} incident(s)`]);
      $('incident-table').innerHTML = table(['Type', 'Date', 'MR11 Row', 'Cost', 'm²', 'Note'],
        [...appState.incidents.map(i => [esc(i.type), esc(i.date), esc(i.row), `<span class="font-mono">MYR ${fmtNum(i.cost)}</span>`, `<span class="font-mono">${fmtNum(i.m2)}</span>`, esc(i.note)]), ...rows]);
    }

    // =========================================================================
    // STEP 8: LIVE MR11 PIPELINE BUILDER & SHEETJS (.XLSX) MULTI-SHEET EXPORT
    // =========================================================================
    function getLiveRow1Record() {
      const monthsM2 = forecastInputs();
      const totalForecastM2 = monthsM2.reduce((a, b) => a + b, 0);

      const prodM2 = Math.max(0, parseFloat(document.getElementById('recon-prod-input')?.value) || 0);
      const shipM2 = Math.max(0, parseFloat(document.getElementById('recon-ship-input')?.value) || 0);
      const validShipM2 = appState.confirmOver ? shipM2 : Math.min(prodM2, shipM2);
      const pendingM2 = Math.max(0, appState.ncaArea - validShipM2);

      const spDate = document.getElementById('sp-act-date')?.value || document.getElementById('sp-est-date')?.value || '2026-11-01';
      const desDate = document.getElementById('des-act-date')?.value || document.getElementById('des-est-date')?.value || '2026-11-13';
      const incoterms = (document.getElementById('bd-incoterms')?.value || 'CIF').replace('Incoterms: ', '');

      const designValid = designIsComplete();
      const paymentValid = appState.advanceCleared;

      let readinessState = 'Got Payment & Design, Can Produce';
      if (paymentValid && !designValid) readinessState = 'Got Payment, Waiting Design';
      else if (!paymentValid && designValid) readinessState = 'No Payment, Got Design';
      else if (!paymentValid && !designValid) readinessState = 'Waiting Both Payment & Design';

      const adv = advanceTerm();
      return {
        key: 'LIVE',
        isLive: true,
        customerProject: appState.projectName,
        buildingStream: `${appState.buildingName} (${appState.streams[0] || 'S1'} / ${appState.blocks[0] || 'B1'})`,
        projectNo: appState.projectNo,
        country: appState.countryName,
        pic: appState.picName,
        status: (appState.existingPlantLoad + appState.ncaArea > appState.plantCapacityCap) ? 'Over Capacity (Alert)' : appState.projectStatus,
        product: appState.productType,
        po: appState.poNo,
        nca: appState.ncaNo,
        ncaQty: appState.ncaArea,
        designFinal: parseFloat($('des-final-m2').value) || null,
        shortName: $('bd-short-name').value.trim(),
        location: $('bd-location').value.trim(),
        lmeType: appState.lmeMode,
        shellStatus: $('sp-rev-select').value,
        designStatus: $('des-status').value,
        paymentDate: appState.advanceCleared ? appState.advanceDate : '',
        processedDate: [...appState.planningSeries].map(x => x.date).sort().pop() || '',
        producedDate: [...appState.panelLog].filter(l => l.stage === 'PRODUCED').map(l => l.date).sort().pop() || '',
        dispatchDate: appState.lorries.filter(l => l.row === 'LIVE' && l.status === 'Departed').map(l => l.date).sort().pop() || '',
        etd: '',
        atd: '',
        paymentTerm: termsList().map(t => `${t.type} ${fmtNum(t.pct, 0)}%: ${formatUSD(t.amount)}`).join(' / '),
        advStatus: appState.advanceCleared ? `CLEARED (${fmtNum(adv.pct, 0)}%)` : 'HOLD (Awaiting Advance)',
        advancePct: adv.pct,
        shellDate: spDate,
        designDate: designValid ? desDate : 'DATE/GATE HOLD',
        lme: appState.lmeBase,
        incoterms: incoterms,
        basePrice: appState.basePrice,
        propsAcc: appState.propsAcc,
        lmeAdj: appState.lmeAdjM2,
        freightAdj: appState.surchargeM2,
        aluminium: appState.aluminium,
        finalPrice: appState.finalUnitRate,
        monthsM2: monthsM2,
        totalForecastM2: totalForecastM2,
        formworkSystem: appState.formworkType,
        producedM2: prodM2,
        shippedM2: validShipM2,
        pendingM2: pendingM2,
        readinessState: readinessState
      };
    }

    function applyMr11Edits(row) {
      const r = { ...row, _pending: {} };
      appState.approvals.filter(a => a.row === r.key && a.type === 'EDIT').forEach(a => {
        if (a.status === 'PENDING') r._pending[a.field] = a.value;
        if (a.status === 'APPROVED') {
          // A later change by the department makes the edit lapse, and the department's value shows
          if (String(row[a.field]) !== String(a.base)) { a.status = 'LAPSED'; return; }
          r[a.field] = a.value;
        }
      });
      return r;
    }
    function allMr11Rows() {
      const refs = referenceMR11Projects.filter(r => !r.deleted).map(r => ({
        ...r,
        isLive: false,
        totalForecastM2: r.monthsM2.reduce((a, b) => a + b, 0),
        pendingM2: Math.max(0, r.ncaQty - r.shippedM2)
      }));
      return [getLiveRow1Record(), ...refs].map(applyMr11Edits);
    }

    function renderMR11PipelineTab() {
      const tbody = document.getElementById('mr11-master-tbody');
      if (!tbody) return;

      const allRows = allMr11Rows();
      const liveRow = allRows[0];

      // Update active readiness badge
      const pillEl = document.getElementById('mr11-active-readiness-pill');
      if (pillEl) {
        pillEl.textContent = liveRow.readinessState;
        pillEl.className = liveRow.readinessState === 'Got Payment & Design, Can Produce'
          ? 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800'
          : 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800';
      }

      renderMr11Table(allRows);

      // Render 4-State Production Readiness Matrix
      const statesList = [
        'Got Payment & Design, Can Produce',
        'Got Payment, Waiting Design',
        'No Payment, Got Design',
        'Waiting Both Payment & Design'
      ];
      const matrixBody = document.getElementById('mr11-readiness-matrix-body');
      if (matrixBody) {
        matrixBody.innerHTML = statesList.map(st => {
          const matching = allRows.filter(r => r.readinessState === st);
          const sumM2 = matching.reduce((acc, r) => acc + r.ncaQty, 0);
          const sumUSD = matching.reduce((acc, r) => acc + (r.ncaQty * r.finalPrice), 0);
          const isRow1Here = liveRow.readinessState === st;
          return `
            <tr class="${isRow1Here ? 'bg-emerald-50 font-bold text-slate-900' : 'text-slate-600'}">
              <td class="py-2 px-3 border border-slate-200 font-sans">${st}</td>
              <td class="py-2 px-3 text-right border border-slate-200">${sumM2.toFixed(2)} m²</td>
              <td class="py-2 px-3 text-right border border-slate-200 text-emerald-700">${formatUSD(sumUSD)}</td>
              <td class="py-2 px-3 text-center border border-slate-200">${isRow1Here ? '✓ ACTIVE ROW 1' : '—'}</td>
            </tr>
          `;
        }).join('');
      }

      // Render Product Type Subtotals
      const productCategories = [
        'MFE New',
        'MFE Used (Refurbished)',
        'Re-Design Only (Non-physical Despatch)',
        'Direct',
        'Modification'
      ];
      const prodBody = document.getElementById('mr11-product-summary-body');
      let grandUSD = 0;
      if (prodBody) {
        prodBody.innerHTML = productCategories.map(cat => {
          const matching = allRows.filter(r => r.product === cat);
          const sumM2 = matching.reduce((acc, r) => acc + r.ncaQty, 0);
          const sumUSD = matching.reduce((acc, r) => acc + (r.ncaQty * r.finalPrice), 0);
          const sumShip = matching.reduce((acc, r) => acc + r.shippedM2, 0);
          grandUSD += sumUSD;
          const isCurrent = liveRow.product === cat;
          return `
            <tr class="${isCurrent ? 'bg-sky-50 font-bold text-slate-900' : 'text-slate-600'}">
              <td class="py-2 px-3 border border-slate-200 font-sans">${cat} ${isCurrent ? '(Includes Row 1)' : ''}</td>
              <td class="py-2 px-3 text-right border border-slate-200">${sumM2.toFixed(2)} m²</td>
              <td class="py-2 px-3 text-right border border-slate-200 text-emerald-700">${formatUSD(sumUSD)}</td>
              <td class="py-2 px-3 text-right border border-slate-200">${sumShip.toFixed(2)} m²</td>
            </tr>
          `;
        }).join('');
      }
      const grandBadge = document.getElementById('mr11-grand-total-badge');
      if (grandBadge) grandBadge.textContent = 'Pipeline Total: ' + formatUSD(grandUSD);
    }

    // MR11 edits, row deletes, comments and the team notes board
    function toggleEditMode() {
      appState.editMode = !appState.editMode;
      $('mr11-edit-btn').textContent = `Edit in MR11: ${appState.editMode ? 'On' : 'Off'}`;
      if (appState.editMode) notify(isAdmin() ? 'Click an outlined cell. Your edits apply at once and are logged.' : 'Click an outlined cell. Your change goes for approval.', 'info');
      renderMR11PipelineTab();
    }
    function startCellEdit(key, field) {
      const row = allMr11Rows().find(r => r.key === key);
      askModal({
        title: `Edit ${MR11_FIELD_LABELS[field]}`, desc: isAdmin() ? 'As an administrator your edit applies at once and is logged.' : 'Your change waits for an administrator. The cell shows it as waiting.',
        label: `${rowLabel(key)}: new value`, confirm: isAdmin() ? 'Apply Edit' : 'Send for Approval', value: row[field],
        onOk: value => {
          const raw = key === 'LIVE' ? getLiveRow1Record() : referenceMR11Projects.find(r => r.key === key);
          if (isAdmin()) appState.approvals.filter(a => a.row === key && a.field === field && a.status === 'APPROVED').forEach(a => { a.status = 'REPLACED'; });
          const entry = { id: ++appState.nextId, type: 'EDIT', row: key, field, value, base: raw[field], before: row[field], by: ROLES[appState.role], when: nowStamp(), status: isAdmin() ? 'APPROVED' : 'PENDING' };
          appState.approvals.unshift(entry);
          logActivity(`${isAdmin() ? 'Edited' : 'Requested edit of'} ${MR11_FIELD_LABELS[field]} on ${rowLabel(key)}: "${entry.before}" to "${value}"`);
          refreshAll();
        }
      });
    }
    function requestRowDelete(key) {
      askModal({
        title: 'Delete MR11 Row', desc: `Deleting ${rowLabel(key)} also deletes it from the BD online entry. ${isAdmin() ? 'It applies at once and can be undone.' : 'It waits for an administrator.'}`,
        label: 'Reason', confirm: isAdmin() ? 'Delete Row' : 'Send for Approval', min: 3,
        onOk: reason => {
          const entry = { id: ++appState.nextId, type: 'DELETE', row: key, reason, by: ROLES[appState.role], when: nowStamp(), status: isAdmin() ? 'APPROVED' : 'PENDING' };
          appState.approvals.unshift(entry);
          if (isAdmin()) referenceMR11Projects.find(r => r.key === key).deleted = true;
          logActivity(`${isAdmin() ? 'Deleted' : 'Requested delete of'} ${rowLabel(key)}: ${reason}`);
          refreshAll();
        }
      });
    }
    function decideApproval(id, approve) {
      if (!guard(['ADMIN'], 'decide approvals')) return;
      const a = appState.approvals.find(x => x.id === id);
      if (approve) {
        appState.approvals.filter(x => x !== a && x.type === 'EDIT' && x.row === a.row && x.field === a.field && x.status === 'APPROVED').forEach(x => { x.status = 'REPLACED'; });
        a.status = 'APPROVED';
        if (a.type === 'DELETE') referenceMR11Projects.find(r => r.key === a.row).deleted = true;
        logActivity(`Approved ${a.type === 'DELETE' ? 'delete of' : 'edit on'} ${rowLabel(a.row)} from ${a.by}`);
        refreshAll();
        return;
      }
      askModal({
        title: 'Reject Change', desc: 'A rejection needs a reason, and the person who asked sees it.', label: 'Reason', confirm: 'Reject', min: 3,
        onOk: reason => {
          a.status = 'REJECTED'; a.rejectReason = reason;
          logActivity(`Rejected change on ${rowLabel(a.row)}: ${reason}`);
          refreshAll();
        }
      });
    }
    function undoApproval(id) {
      if (!guard(['ADMIN'], 'undo approved changes')) return;
      const a = appState.approvals.find(x => x.id === id);
      a.status = 'UNDONE';
      if (a.type === 'DELETE') referenceMR11Projects.find(r => r.key === a.row).deleted = false;
      logActivity(`Undid ${a.type === 'DELETE' ? 'delete of' : 'edit on'} ${rowLabel(a.row)}`);
      refreshAll();
    }
    function renderApprovals() {
      const tone = { PENDING: 'amber', APPROVED: 'emerald', REJECTED: 'rose', UNDONE: 'slate', LAPSED: 'slate', REPLACED: 'slate' };
      $('approvals-list').innerHTML = appState.approvals.length ? appState.approvals.map(a => {
        const what = a.type === 'DELETE' ? `Delete row: ${esc(a.reason)}` : `${MR11_FIELD_LABELS[a.field]}: "${esc(a.before)}" to "${esc(a.value)}"`;
        const buttons = a.status === 'PENDING'
          ? `<button onclick="decideApproval(${a.id}, true)" class="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold">Approve</button><button onclick="decideApproval(${a.id}, false)" class="px-2.5 py-1 rounded border border-rose-300 text-rose-700 text-[11px] font-semibold">Reject</button>`
          : a.status === 'APPROVED' ? `<button onclick="undoApproval(${a.id})" class="px-2.5 py-1 rounded border border-slate-300 text-slate-700 text-[11px] font-semibold">Undo</button>` : '';
        return `<div class="p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div><strong>${esc(rowLabel(a.row))}</strong> • ${what}<div class="text-[11px] text-slate-500">${esc(a.by)} • ${esc(a.when)}${a.rejectReason ? ` • Rejected: ${esc(a.rejectReason)}` : ''}${a.status === 'LAPSED' ? ' • The department changed this value, so the edit lapsed' : ''}</div></div>
          <div class="flex items-center gap-1.5">${pill(a.status, tone[a.status])}${buttons}</div>
        </div>`;
      }).join('') : '<p class="text-slate-400">No changes waiting. Turn on "Edit in MR11" in Step 8 as a non-admin to send one.</p>';
      $('updates-list').innerHTML = appState.updates.map(u => `<div class="p-2.5 rounded-lg border border-slate-200 flex justify-between gap-2">
        <div><strong>${esc(u.kind)}</strong> • ${esc(u.row)}: ${esc(u.detail)}<div class="text-[11px] text-slate-500">${esc(u.who)} • ${esc(u.when)} • ${u.ref ? `Source: ${esc(u.sourceType)} ${esc(u.ref)}` : '<span class="text-amber-700 font-semibold">No source</span>'}</div></div>
        <div>${pill(u.source, u.source === 'Mobile' ? 'sky' : 'slate')}</div>
      </div>`).join('');
      $('activity-list').innerHTML = appState.activity.slice(0, 60).map(x => `<div class="p-2.5 rounded-lg border border-slate-200"><div>${esc(x.what)}</div><div class="text-[11px] text-slate-500">${esc(x.who)} • ${esc(x.when)}</div></div>`).join('');
    }
    let commentRowKey = null;
    function openComments(key) {
      commentRowKey = key;
      $('comment-title').textContent = `Comments: ${rowLabel(key)}`;
      renderCommentList();
      $('comment-modal').classList.remove('hidden');
      $('comment-modal').classList.add('flex');
    }
    function closeComments() {
      $('comment-modal').classList.add('hidden');
      $('comment-modal').classList.remove('flex');
    }
    function renderCommentList() {
      const list = appState.comments[commentRowKey] || [];
      $('comment-list').innerHTML = list.length ? list.map(c => `<div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200"><div>${esc(c.text)}</div><div class="text-[11px] text-slate-500">${esc(c.who)} • ${esc(c.when)}</div></div>`).join('') : '<p class="text-slate-400">No comments yet.</p>';
    }
    function addComment() {
      const text = $('comment-input').value.trim();
      if (!text) return;
      (appState.comments[commentRowKey] = appState.comments[commentRowKey] || []).push({ who: ROLES[appState.role], when: nowStamp(), text });
      $('comment-input').value = '';
      renderCommentList();
      renderMR11PipelineTab();
    }
    function addTeamNote() {
      const text = $('note-input').value.trim();
      if (!text) return;
      appState.notes.unshift({ who: ROLES[appState.role], when: nowStamp(), text });
      $('note-input').value = '';
      renderNotes();
    }
    function renderNotes() {
      $('notes-list').innerHTML = appState.notes.map(n => `<div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200"><div>${esc(n.text)}</div><div class="text-[11px] text-slate-500">${esc(n.who)} • ${esc(n.when)}</div></div>`).join('');
    }

    function exportMR11Workbook() {
      if (typeof XLSX === 'undefined') {
        notify('SheetJS library is still loading. Please try again in a moment.', 'error');
        return;
      }

      const allRows = allMr11Rows();
      const liveRow = allRows[0];

      const wb = XLSX.utils.book_new();

      // SHEET 1: MR11 2026 Master Sheet
      const mr11Data = [
        ['SALES PIPELINE & ORDER BOOK (MR11) — GENERATED LIVE FROM SHELLFLOW'],
        ['Export Timestamp:', new Date().toISOString(), 'Active Project:', liveRow.customerProject, 'Contract Value:', liveRow.ncaQty * liveRow.finalPrice],
        [],
        [
          'Row', 'Customer & Project Name', 'Stream / Building / Block', 'Project No', 'Countries', 'PIC', 'Status',
          'Products', 'PO', 'NCA', 'NCA Qty (m²)', 'Payment Term', 'Advance Received / Status',
          'Shell Plan Completion Date', 'Design Completion Date', 'LME Base ($/MT)', 'Incoterms',
          'Selling Price ($/m²)', 'Props/WPB/Waler/Acc ($/m²)', 'Aluminium Weight ($/m²)', 'LME Adjusted ($/m²)', 'Freight Adjusted ($/m²)',
          'Final Selling Price ($/m²)', 'Nov 26 (m²)', 'Dec 26 (m²)', 'Jan 27 (m²)', 'Feb 27 (m²)', 'Mar 27 (m²)', 'Apr 27 (m²)',
          'Total 2026 m²', 'Comments / Formwork System',
          'Nov 26 (USD)', 'Dec 26 (USD)', 'Jan 27 (USD)', 'Feb 27 (USD)', 'Mar 27 (USD)', 'Apr 27 (USD)',
          'Total 2026 USD', 'Check 2026', 'Actual Produced (m²)', 'Actual Del. Qty (Shipped m²)', 'Pending Delivery (m²)', 'Production Readiness Gate'
        ]
      ];

      (typeof mr11Lines === 'function' ? mr11Lines(allRows) : allRows).forEach((r, idx) => {
        const monthsUSD = r.monthsM2.map(m => Number((m * r.finalPrice).toFixed(2)));
        const totalUSD = Number((r.totalForecastM2 * r.finalPrice).toFixed(2));
        mr11Data.push([
          idx + 1,
          r.customerProject,
          r.buildingStream,
          r.projectNo,
          r.country,
          r.pic,
          r.status,
          r.product,
          r.po,
          r.nca,
          r.ncaQty,
          r.paymentTerm,
          r.advStatus,
          r.shellDate,
          r.designDate,
          r.lme,
          r.incoterms,
          r.basePrice,
          r.propsAcc,
          r.aluminium || 0,
          Number(r.lmeAdj.toFixed(3)),
          Number(r.freightAdj.toFixed(3)),
          Number(r.finalPrice.toFixed(2)),
          ...r.monthsM2,
          r.totalForecastM2,
          r.formworkSystem,
          ...monthsUSD,
          totalUSD,
          Number((r.totalForecastM2 - r.ncaQty).toFixed(2)),
          r.producedM2,
          r.shippedM2,
          r.pendingM2,
          r.readinessState
        ]);
      });

      const wsMR11 = XLSX.utils.aoa_to_sheet(mr11Data);
      XLSX.utils.book_append_sheet(wb, wsMR11, 'MR11 2026');

      // SHEET 2: Summary & Gate Matrix
      const summaryAOA = [
        ['MR11 SUMMARY & 4-STATE PRODUCTION READINESS MATRIX'],
        [],
        ['Readiness State', 'Total Area (m²)', 'Total Value (USD)'],
        ...[
          'Got Payment & Design, Can Produce',
          'Got Payment, Waiting Design',
          'No Payment, Got Design',
          'Waiting Both Payment & Design'
        ].map(st => {
          const m = allRows.filter(r => r.readinessState === st);
          return [
            st,
            m.reduce((a, r) => a + r.ncaQty, 0),
            Number(m.reduce((a, r) => a + (r.ncaQty * r.finalPrice), 0).toFixed(2))
          ];
        }),
        [],
        ['Product Category Breakdown', 'Total Area (m²)', 'Total Value (USD)', 'Shipped Area (m²)'],
        ...[
          'MFE New',
          'MFE Used (Refurbished)',
          'Re-Design Only (Non-physical Despatch)',
          'Direct',
          'Modification'
        ].map(cat => {
          const m = allRows.filter(r => r.product === cat);
          return [
            cat,
            m.reduce((a, r) => a + r.ncaQty, 0),
            Number(m.reduce((a, r) => a + (r.ncaQty * r.finalPrice), 0).toFixed(2)),
            m.reduce((a, r) => a + r.shippedM2, 0)
          ];
        })
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryAOA);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary & Gate Matrix');

      // SHEET 3: 8-Tab Operational Audit Trail
      const auditAOA = [
        ['SHELLFLOW WORKFLOW OPERATIONAL AUDIT LOG'],
        ['Step', 'Department', 'Key Metric / Field', 'Live Value', 'Guardrail Status'],
        ['Step 1', 'BD & Commercial', 'Project / Building / Streams / Blocks', `${appState.projectName} — ${appState.buildingName} (${appState.streams.join(', ')})`, 'Propagated to Steps 2–8'],
        ['Step 1', 'BD & Commercial', 'Formwork & Product Type', `${appState.formworkType} | ${appState.productType}`, 'Validated'],
        ['Step 1', 'BD & Commercial', 'Total Contract Value', formatUSD(appState.totalContractValue), `${appState.ncaArea} m² × ${formatUSD(appState.finalUnitRate)}/m²`],
        ['Step 1', 'BD & Commercial', 'Plant Capacity Load', `${(appState.existingPlantLoad + appState.ncaArea).toLocaleString()} / ${appState.plantCapacityCap.toLocaleString()} m²`, (appState.existingPlantLoad + appState.ncaArea <= appState.plantCapacityCap) ? 'WITHIN CAPACITY' : 'PRODUCTION_OVER_CAPACITY ALERT'],
        ['Step 2', 'Finance Gateway', 'Payment Terms', liveRow.paymentTerm, appState.advanceCleared ? 'ADVANCE CLEARED' : 'AWAITING ADVANCE'],
        ['Step 3', 'Technical Design', 'Shell Plan & Design Completion', `Shell: ${liveRow.shellDate} | Design: ${liveRow.designDate}`, `No 1900-01-29 Bug; ${designWeight()}x DCF Weight`],
        ['Step 4', 'Production & Yard', 'Produced Area Logged', `${liveRow.producedM2.toFixed(2)} m²`, 'Panel Register & Evidence'],
        ['Step 5', 'Readiness Gate & 4-Way', '4-Way Recon (Shipped vs Produced)', `Shipped: ${liveRow.shippedM2.toFixed(2)} m² ≤ Produced: ${liveRow.producedM2.toFixed(2)} m²`, '4-Way Check'],
        ['Step 5', 'Readiness Gate & 4-Way', '5-Point Readiness Gate', `${gateFor('LIVE').checks.filter(c => c.pass).length} / 5 Checks Green`, gateFor('LIVE').released ? 'Admin Release Logged' : 'Gate Active'],
        ['Step 6', 'Logistics & Shipping', `Lorries (${appState.rules.lorryCapacityM2} m²/lorry)`, `${appState.lorries.filter(activeLorry).length} Planned`, 'Audited ETD Log Active'],
        ['Step 7', 'Site Receiving', 'Site Progress & Incident Cost', `${appState.siteProgressM2} m² / MYR ${appState.incidents.reduce((a, i) => a + i.cost, 0)}`, 'Evidence-Based Site Receipt']
      ];
      const wsAudit = XLSX.utils.aoa_to_sheet(auditAOA);
      XLSX.utils.book_append_sheet(wb, wsAudit, 'Workflow Audit');

      XLSX.writeFile(wb, 'MR11_Master_Schedule_Live.xlsx');
      notify('Downloaded MR11_Master_Schedule_Live.xlsx with 3 sheets!', 'success');
    }

    // =========================================================================
    // REMINDERS & ALERTING ENGINE
    // =========================================================================
    function allReminders() {
      const lead = appState.rules.reminderLeadDays;
      const list = [];
      const add = (id, title, date, dept, leadDays = lead) => {
        if (!date || appState.doneReminders.includes(id)) return;
        const left = daysBetween(DEMO_TODAY, date);
        list.push({ id, title, date, dept, left, state: left < 0 ? 'OVERDUE' : left <= leadDays ? 'SOON' : 'LATER' });
      };
      const rules = appState.rules;
      if (!$('sp-act-date').value) add('auto-shell', `Shell plan not approved: ${appState.projectName}`, addDays($('sp-start-date').value, rules.shellPlanClockDays), 'SHELLPLAN');
      if (designIsComplete() && !(parseFloat($('recon-prod-input').value) > 0)) add('auto-d2p', `Design complete, production not started: ${appState.projectName}`, addDays($('des-act-date').value, rules.designToProductionDays), 'PRODUCTION');
      if (!$('des-act-date').value) add('auto-design', `Design completion due: ${appState.projectName}`, $('des-est-date').value, 'DESIGN');
      allMr11Rows().forEach(r => {
        if (r.producedM2 > r.shippedM2 && r.producedM2 > 0) {
          const from = r.isLive ? '2026-11-13' : '2026-11-02';
          add(`auto-sail-${r.key}`, `Produced stock waiting to sail: ${r.customerProject.trim()}`, addDays(from, rules.productionToSailingDays), 'DISPATCH');
        }
      });
      appState.items.filter(i => !itemDone(i)).forEach(i => {
        const end = new Date(new Date(i.slaStart).getTime() + rules.accessoriesSlaHours * 3600000);
        add(`auto-sla-${i.id}`, `SLA window ends: ${i.name} on ${rowLabel(i.row)}`, end.toISOString().slice(0, 10), i.kind === 'HOLING' ? 'PRODUCTION' : 'DESIGN');
      });
      appState.lorries.filter(activeLorry).forEach(l => add(`auto-lorry-${l.id}`, `Lorry date: ${l.id} for ${rowLabel(l.row)}`, l.date, 'DISPATCH'));
      appState.reminders.forEach(c => add(c.id, c.title, c.date, c.dept));
      return list.sort((a, b) => a.date.localeCompare(b.date));
    }
    function addReminder() {
      const title = $('rem-title').value.trim();
      if (!title || !$('rem-date').value) { notify('Enter a reminder and a date.', 'error'); return; }
      appState.reminders.push({ id: `own-${++appState.nextId}`, title, date: $('rem-date').value, dept: $('rem-dept').value });
      $('rem-title').value = '';
      refreshAll();
    }
    function doneReminder(id) { appState.doneReminders.push(id); refreshAll(); }
    function renderReminders() {
      const filter = $('reminder-filter').value;
      const tone = { OVERDUE: 'rose', SOON: 'amber', LATER: 'slate' };
      const list = allReminders().filter(r => !filter || r.dept === filter);
      $('reminders-list').innerHTML = list.length ? list.map(r => `<div class="p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div><strong>${esc(r.title)}</strong><div class="text-[11px] text-slate-500">${ROLES[r.dept]} • Due ${esc(r.date)} (${r.left < 0 ? `${-r.left} day(s) over` : `in ${r.left} day(s)`})</div></div>
        <div class="flex items-center gap-1.5">${pill(r.state, tone[r.state])}<button onclick="doneReminder('${r.id}')" class="px-2.5 py-1 rounded border border-slate-300 text-slate-700 text-[11px] font-semibold">Done</button></div>
      </div>`).join('') : '<p class="text-slate-400">No reminders for this department.</p>';
    }

    function computeAlerts() {
      const alerts = [];
      const rules = appState.rules;
      const add = (rule, severity, key, dept, message, tab) => alerts.push({ id: `${rule}:${key}`, rule, severity, dept, message, tab });
      const rows = allMr11Rows();

      capacityByMonth().forEach(m => {
        if (m.plantPct > 100) add('PRODUCTION_OVER_CAPACITY', 'HIGH', m.key, 'BD & Planning', `${m.label}: ${fmtNum(m.plant, 0)} m² against ${fmtNum(rules.productionCapacity, 0)} m² plant capacity`, 3);
        if (m.designPct > 100) add('DESIGN_OVER_CAPACITY', 'MEDIUM', m.key, 'Design', `${m.label}: ${fmtNum(m.design, 0)} weighted m² against ${fmtNum(rules.designCapacity, 0)} capacity`, 3);
      });
      allReminders().forEach(r => {
        if (r.state === 'OVERDUE') add('REMINDER_OVERDUE', 'MEDIUM', r.id, ROLES[r.dept], `${r.title} (due ${r.date})`, 10);
        if (r.state === 'SOON') add('REMINDER_SOON', 'LOW', r.id, ROLES[r.dept], `${r.title} (due ${r.date})`, 10);
      });
      appState.lorries.forEach(l => {
        if (activeLorry(l) && l.date < DEMO_TODAY) add('LORRY_LATE', 'MEDIUM', l.id, 'Dispatch', `${l.id} was due ${l.date} and has not left`, 7);
        if (activeLorry(l) && !gateFor(l.row).ok) add('LORRY_GATE', 'HIGH', l.id, 'Dispatch', `${l.id} is booked for ${rowLabel(l.row)}, which is no longer green`, 6);
        if (l.m2 > l.cap && l.status !== 'Cancelled') add('LORRY_OVERLOAD', 'MEDIUM', l.id, 'Dispatch', `${l.id} is loaded ${fmtNum(l.m2)} m² over its ${fmtNum(l.cap, 0)} m² capacity`, 7);
      });
      rows.forEach(r => {
        const g = gateFor(r.key);
        const label = r.customerProject.trim();
        if (r.shippedM2 > 0 && !g.green && !g.released) add('DISPATCH_NOT_READY', 'HIGH', r.key, 'Dispatch', `${label} was dispatched while its gate is not green (${g.failed.join(', ')})`, 6);
        if (booked(r) > Math.max(0, r.producedM2 - r.shippedM2)) add('LORRY_STOCK_SHORT', 'HIGH', r.key, 'Dispatch', `${label}: booked loads exceed produced stock. Production may have been re-prioritised; re-plan.`, 7);
        if (!/CLEARED/.test(r.advStatus) && stockWaiting(r) > 0) add('PAYMENT_HOLD', 'MEDIUM', r.key, 'Finance', `${label}: ${fmtNum(stockWaiting(r))} m² produced, waiting on the advance`, 2);
        if (r.paymentOverdue) add('PAYMENT_OVERDUE', 'HIGH', r.key, 'Finance', `${label}: the advance is overdue`, 2);
        const recon = reconFor(r);
        if (recon.status === 'VARIANCE') add('RECON_VARIANCE', 'HIGH', r.key, 'Planning & Logistics', `${label}: ${recon.issues.join('; ')}`, 6);
        // Design final differing from the NCA is normal, so it raises no alert
      });
      const liveShipped = rows[0].shippedM2;
      if (liveShipped > 0 && !$('sp-act-date').value) add('DISPATCH_BEFORE_SHELLPLAN', 'HIGH', 'LIVE', 'Shell Plan', `${appState.projectName} was dispatched with no shell-plan approval date`, 3);
      if (appState.siteProgressM2 > liveShipped) add('SITE_DISPATCH_MISMATCH', 'HIGH', 'LIVE', 'Dispatch & Site', `Site progress ${fmtNum(appState.siteProgressM2)} m² is ahead of shipped ${fmtNum(liveShipped)} m²`, 8);
      appState.bankLines.filter(l => l.source === 'Mobile' && l.status === 'OPEN').forEach(l => add('PAYMENT_REPORTED', 'HIGH', l.id, 'Finance', `Payment of ${formatUSD(l.amount)} reported from the field, not confirmed yet`, 2));
      appState.items.filter(i => !itemDone(i) && slaOf(i).over).forEach(i => add('ACCESSORY_SLA', 'HIGH', i.id, 'Production & Logistics', `${i.name} on ${rowLabel(i.row)} is ${hhmm(slaOf(i).left)} past its ${rules.accessoriesSlaHours}h SLA`, 3));
      appState.ncaVersions.forEach(v => {
        if (v.status === 'PENDING') add('NCA_PENDING', 'MEDIUM', v.version, 'Admin', `NCA v${v.version} (${fmtNum(v.qty)} m²) is waiting for approval`, 1);
        if (v.status === 'APPROVED' && v.version > 1 && daysBetween(v.decidedAt, DEMO_TODAY) <= 14) add('NCA_CHANGED', 'HIGH', v.version, 'Design, Planning, Production, Dispatch', `NCA v${v.version} approved at ${fmtNum(v.qty)} m². Check your plans.`, 1);
      });
      if (appState.lmeMode === 'Variable' && !appState.lmeHasRate) add('LME_NO_RATE', 'MEDIUM', 'LIVE', 'BD', `${appState.projectName}: LME is Variable with no LME rate`, 1);
      appState.updates.forEach((u, i) => {
        if (!u.ref && u.kind !== 'NOTE' && u.kind !== 'PROCESSED') add('EVIDENCE_MISSING', 'LOW', `${u.when}-${i}`, u.who, `${u.kind} update on ${u.row} has no source`, 11);
        if (u.urgent) add('URGENT_INPUT', 'HIGH', `${u.when}-${i}`, 'Finance', `Urgent ${u.kind} update on ${u.row}: ${u.detail}`, 11);
      });
      return alerts.map(a => ({ ...a, decision: appState.alertDecisions[a.id] || 'OPEN' }));
    }
    function booked(r) { return bookedM2(r.key); }
    function decideAlert(id, decision) {
      if (decision === 'OPEN') delete appState.alertDecisions[id]; else appState.alertDecisions[id] = decision;
      logActivity(`Alert ${id} marked ${decision.toLowerCase()}`);
      refreshAll();
    }
    function renderAlerts() {
      const sev = $('alert-filter-sev').value, state = $('alert-filter-state').value;
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const tone = { HIGH: 'rose', MEDIUM: 'amber', LOW: 'slate' };
      const all = computeAlerts().sort((a, b) => order[a.severity] - order[b.severity]);
      const list = all.filter(a => (!sev || a.severity === sev) && (state === 'ALL' || (state === 'RESOLVED' ? a.decision === 'RESOLVED' : a.decision !== 'RESOLVED')));
      $('alerts-list').innerHTML = list.length ? list.map(a => `<div class="p-3 rounded-lg border border-${tone[a.severity]}-200 bg-${tone[a.severity]}-50/40 flex flex-wrap items-center justify-between gap-2">
        <div><div class="flex items-center gap-1.5">${pill(a.severity, tone[a.severity])}<code class="font-mono font-bold text-slate-800">${a.rule}</code>${a.decision === 'SEEN' ? pill('SEEN', 'slate') : ''}</div>
          <div class="mt-1">${esc(a.message)}</div><div class="text-[11px] text-slate-500">For: ${esc(a.dept)}</div></div>
        <div class="flex items-center gap-1.5">
          <button onclick="switchTab(${a.tab})" class="px-2.5 py-1 rounded border border-slate-300 text-slate-700 text-[11px] font-semibold">Open</button>
          ${a.decision === 'OPEN' ? `<button onclick="decideAlert('${esc(a.id)}', 'SEEN')" class="px-2.5 py-1 rounded border border-slate-300 text-slate-700 text-[11px] font-semibold">Seen</button>` : ''}
          ${a.decision !== 'RESOLVED' ? `<button onclick="decideAlert('${esc(a.id)}', 'RESOLVED')" class="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold">Resolve</button>` : `<button onclick="decideAlert('${esc(a.id)}', 'OPEN')" class="px-2.5 py-1 rounded border border-slate-300 text-slate-700 text-[11px] font-semibold">Reopen</button>`}
        </div>
      </div>`).join('') : '<p class="text-slate-400">No alerts here. An alert clears itself when its cause is fixed.</p>';
      const open = all.filter(a => a.decision !== 'RESOLVED');
      const high = open.filter(a => a.severity === 'HIGH').length;
      $('header-alert-count').textContent = open.length;
      $('header-alert-btn').dataset.state = high ? 'high' : '';
      $('header-alert-btn').setAttribute('aria-label', `Open alerts: ${open.length} open, ${high} high`);
      $('header-alert-btn').title = `${open.length} open alerts, ${high} high`;
    }

    // =========================================================================
    // AUTOMATED REPORTING
    // =========================================================================
    function cashAtRisk(r) {
      const value = r.ncaQty * r.finalPrice;
      const received = /CLEARED/.test(r.advStatus) ? value * (r.advancePct || 0) / 100 : 0;
      return value - received;
    }
    function reportSheets() {
      const rows = allMr11Rows();
      const alerts = computeAlerts().filter(a => a.decision !== 'RESOLVED');
      const totalM2 = rows.reduce((a, r) => a + r.ncaQty, 0);
      const green = rows.filter(r => gateFor(r.key).green).length;
      const statuses = [...new Set(rows.map(r => r.status))];
      return {
        Summary: [['MR11 Weekly Report', DEMO_TODAY], [], ['Rows', rows.length], ['Total NCA m²', totalM2], ['Green rows', green], ['Blocked rows', rows.length - green], ['Outstanding USD', Number(rows.reduce((a, r) => a + cashAtRisk(r), 0).toFixed(2))], ['Open alerts', alerts.length], ['Recipients', appState.rules.reportRecipients]],
        Pipeline: [['Status', 'Rows', 'm²'], ...statuses.map(s => { const m = rows.filter(r => r.status === s); return [s, m.length, m.reduce((a, r) => a + r.ncaQty, 0)]; })],
        'Cash at Risk': [['MR11 Row', 'Outstanding USD', 'Stock Waiting m²'], ...rows.map(r => [r.customerProject.trim(), Number(cashAtRisk(r).toFixed(2)), stockWaiting(r)])],
        Incidents: [['Type', 'Count', 'Cost MYR', 'm²'], ...Object.entries(incidentTotals()).map(([t, v]) => [t, v.count, v.cost, v.m2])],
        Reconciliation: [['MR11 Row', 'NCA', 'Design Final', 'Produced', 'Shipped', 'Result'], ...rows.map(r => [r.customerProject.trim(), r.ncaQty, r.designFinal ?? '', r.producedM2, r.shippedM2, reconFor(r).status])],
        Alerts: [['Level', 'Rule', 'For', 'Message'], ...alerts.map(a => [a.severity, a.rule, a.dept, a.message])],
        'Dispatch Gate': [['MR11 Row', ...GATE_DEFS.map(d => d.name), 'Result'], ...rows.map(r => { const g = gateFor(r.key); return [r.customerProject.trim(), ...g.checks.map(c => c.pass ? 'GREEN' : 'RED'), g.green ? 'GREEN' : g.released ? 'RELEASED' : 'NOT GREEN']; })],
        'Lorry Forecast': [['Month', 'Forecast m²', 'Lorries Needed', 'Lorries Planned'], ...MONTH_KEYS.map((key, i) => [MONTH_LABELS[i], forecastByMonthAllRows()[i], Math.ceil(forecastByMonthAllRows()[i] / appState.rules.lorryCapacityM2), appState.lorries.filter(l => l.date.startsWith(key) && l.status !== 'Cancelled').length])],
        'Design Capacity': [['Month', 'Design Load (Weighted m²)', 'Design Capacity', 'Active Plant m²', 'Plant Capacity'], ...capacityByMonth().map(m => [m.label, Math.round(m.design), appState.rules.designCapacity, Math.round(m.plant), appState.rules.productionCapacity])]
      };
    }
    function generateReport(trigger, date) {
      appState.reports.unshift({ id: ++appState.nextId, date: date || DEMO_TODAY, trigger, sheets: reportSheets() });
      logActivity(`Report generated (${trigger})`);
      if (appState.ready) { notify('Report saved. It would go to the recipients through the report webhook.', 'success'); refreshAll(); }
    }
    function downloadReport(id) {
      if (typeof XLSX === 'undefined') { notify('SheetJS library is still loading. Please try again in a moment.', 'error'); return; }
      const report = appState.reports.find(r => r.id === id);
      const wb = XLSX.utils.book_new();
      Object.entries(report.sheets).forEach(([name, aoa]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name));
      XLSX.writeFile(wb, `MR11_Weekly_Report_${report.date}.xlsx`);
    }
    function renderReports() {
      const rows = allMr11Rows();
      const kpi = (label, value, tone) => `<div class="p-3.5 rounded-xl bg-${tone}-50 border border-${tone}-200"><span class="text-${tone}-700 font-semibold block">${label}</span><span class="text-lg font-extrabold font-mono text-slate-900">${value}</span></div>`;
      const green = rows.filter(r => gateFor(r.key).green).length;
      $('report-kpis').innerHTML = kpi('Pipeline m²', fmtNum(rows.reduce((a, r) => a + r.ncaQty, 0), 0), 'sky')
        + kpi('Green / Blocked Rows', `${green} / ${rows.length - green}`, 'emerald')
        + kpi('Lorries Needed, 8 Weeks', Math.ceil(forecastNext8Weeks() / appState.rules.lorryCapacityM2), 'indigo')
        + kpi('Outstanding (Cash at Risk)', formatUSD(rows.reduce((a, r) => a + cashAtRisk(r), 0)), 'amber');
      $('reports-list').innerHTML = appState.reports.map(r => `<div class="p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div><strong>Weekly Report, ${esc(r.date)}</strong><div class="text-[11px] text-slate-500">${esc(r.trigger)} • ${Object.keys(r.sheets).length} sheets • To: ${esc(appState.rules.reportRecipients)}</div></div>
        <button onclick="downloadReport(${r.id})" class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold">Download Excel</button>
      </div>`).join('');
    }

    // =========================================================================
    // MOBILE APP (SAME DATA AND RULES AS THE WEB FORMS)
    // =========================================================================
    const M_INPUT = 'w-full px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white';
    const M_LABEL = 'block text-[10px] text-slate-400 uppercase mb-1';
    const M_BUTTON = 'w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition cursor-pointer';
    function mobileGo(screen) { appState.mobileScreen = screen; renderMobile(); refreshIcons(); }
    function renderMobile() {
      const screen = appState.mobileScreen;
      const field = (label, inner) => `<div><label class="${M_LABEL}">${label}</label>${inner}</div>`;
      const titles = { home: 'MR11 Mobile', site: 'Site Progress', panels: 'Panel Actuals', payment: 'Urgent Payment', dispatch: 'Dispatch Check', alerts: 'Alerts & Reminders' };
      $('m-title').textContent = titles[screen];
      const open = computeAlerts().filter(a => a.decision !== 'RESOLVED');
      const rowOptions = allMr11Rows().map(r => `<option value="${r.key}">${esc(r.customerProject.trim())}</option>`).join('');
      if (screen === 'home') {
        const tiles = [['site', 'hard-hat', 'Site Progress', 'Dates and m² from the field'], ['panels', 'boxes', 'Panel Actuals', 'Daily production from the floor'], ['payment', 'wallet', 'Urgent Payment', 'Payment landed: tell Finance'], ['dispatch', 'truck', 'Dispatch Check', 'Is this row green to load?'], ['alerts', 'bell', 'Alerts', `${open.length} open, ${open.filter(a => a.severity === 'HIGH').length} high`]];
        $('m-screen').innerHTML = `<div class="grid grid-cols-2 gap-2">${tiles.map(([id, icon, label, hint]) => `<button onclick="mobileGo('${id}')" class="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left space-y-1"><i data-lucide="${icon}" class="w-5 h-5 text-sky-300"></i><div class="font-bold">${label}</div><div class="text-[10px] text-slate-400">${hint}</div></button>`).join('')}</div><p class="text-[10px] text-slate-400 text-center">To install: open on your phone and choose "Add to Home screen".</p>`;
      } else if (screen === 'site') {
        $('m-screen').innerHTML = field('Tower / Block', `<select id="m-site-block" class="${M_INPUT}">${appState.blocks.map(b => `<option>${esc(b)}</option>`).join('')}</select>`)
          + field('Site Progress (m²)', `<input type="number" id="m-site-m2" class="${M_INPUT} font-mono">`)
          + field('Note', `<input type="text" id="m-site-note" class="${M_INPUT}">`)
          + field('Photo From Camera', `<input type="file" id="m-site-photo" accept="image/*" capture="environment" class="w-full text-[11px] text-slate-300">`)
          + `<button onclick="mobileSaveSite()" class="${M_BUTTON}">Save Site Progress</button>`;
      } else if (screen === 'panels') {
        $('m-screen').innerHTML = field('Panel Codes', `<input type="text" id="m-panel-codes" placeholder="W-041 to W-045" class="${M_INPUT} font-mono">`)
          + field('Date', `<input type="date" id="m-panel-date" value="${DEMO_TODAY}" class="${M_INPUT}">`)
          + field('Photo From Camera', `<input type="file" id="m-panel-photo" accept="image/*" capture="environment" class="w-full text-[11px] text-slate-300">`)
          + `<button onclick="mobileSavePanels()" class="${M_BUTTON}">Save Panel Actuals</button>`;
      } else if (screen === 'payment') {
        $('m-screen').innerHTML = field('MR11 Row', `<select id="m-pay-row" class="${M_INPUT}">${rowOptions}</select>`)
          + field('Amount (USD)', `<input type="number" id="m-pay-amount" class="${M_INPUT} font-mono">`)
          + field('Reference', `<input type="text" id="m-pay-ref" placeholder="TT number or bank advice" class="${M_INPUT}">`)
          + `<button onclick="mobileSavePayment()" class="${M_BUTTON}">Send to Finance</button>`;
      } else if (screen === 'dispatch') {
        const key = appState.mobileRow || 'LIVE';
        const g = gateFor(key);
        $('m-screen').innerHTML = field('MR11 Row', `<select id="m-dis-row" onchange="appState.mobileRow = this.value; renderMobile()" class="${M_INPUT}">${rowOptions}</select>`)
          + `<div class="p-3 rounded-xl text-center font-extrabold ${g.ok ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'}">${g.green ? 'GREEN: OK TO LOAD' : g.released ? 'RELEASED BY ADMIN' : 'NOT GREEN: DO NOT LOAD'}</div>`
          + g.checks.map(c => `<div class="flex justify-between border-b border-slate-800 py-1"><span>${c.name}</span><span class="${c.pass ? 'text-emerald-400' : 'text-rose-400'} font-bold">${c.pass ? 'GREEN' : 'RED'}</span></div>`).join('')
          + (key === 'LIVE' ? field('Freight Booking Reference', `<input type="text" id="m-dis-freight" value="${esc(appState.freightRef)}" class="${M_INPUT} font-mono">`) + `<button onclick="$('freight-ref').value = $('m-dis-freight').value; saveFreightRef()" class="${M_BUTTON}">Confirm Freight</button>` : '');
        $('m-dis-row').value = key;
      } else {
        const reminders = allReminders().filter(r => r.state !== 'LATER').slice(0, 4);
        $('m-screen').innerHTML = open.slice(0, 6).map(a => `<div class="p-2.5 rounded-lg bg-slate-800 border border-slate-700"><div class="font-bold ${a.severity === 'HIGH' ? 'text-rose-400' : 'text-amber-300'}">${a.severity}: ${a.rule}</div><div class="text-[11px] text-slate-300">${esc(a.message)}</div></div>`).join('')
          + reminders.map(r => `<div class="p-2.5 rounded-lg bg-slate-800 border border-slate-700"><div class="font-bold text-sky-300">Reminder, ${esc(r.date)}</div><div class="text-[11px] text-slate-300">${esc(r.title)}</div></div>`).join('');
      }
    }
    function mobilePhotoName(id) { return $(id)?.files[0]?.name || ''; }
    function mobileSaveSite() {
      const m2 = parseFloat($('m-site-m2').value);
      if (!(m2 > 0)) { notify('Enter the site progress in m² as a number above 0.', 'error'); return; }
      if (recordSiteProgress({ m2, where: $('m-site-block').value, note: $('m-site-note').value, evidence: mobilePhotoName('m-site-photo'), source: 'Mobile', lorry: '' })) {
        notify('Site progress saved from Mobile.', 'success');
        mobileGo('home');
      }
    }
    function mobileSavePanels() {
      const saved = recordPanelActuals({ codesText: $('m-panel-codes').value, stage: 'PRODUCED', date: $('m-panel-date').value, sourceType: 'Photo', evidence: mobilePhotoName('m-panel-photo'), reason: '', source: 'Mobile' });
      if (saved) mobileGo('home');
    }
    function mobileSavePayment() {
      const amount = parseFloat($('m-pay-amount').value);
      if (!(amount > 0)) { notify('Enter the amount as a number above 0.', 'error'); return; }
      const key = $('m-pay-row').value;
      const row = allMr11Rows().find(r => r.key === key);
      addBankLine({ date: DEMO_TODAY, ref: $('m-pay-ref').value.trim() || 'MOBILE-REPORT', amount, desc: `${row.customerProject.trim().toUpperCase()} ${row.projectNo}`, source: 'Mobile' });
      appState.updates.unshift({ kind: 'PAYMENT', row: row.customerProject.trim(), detail: `${formatUSD(amount)} reported from the field`, sourceType: 'Document Link', ref: $('m-pay-ref').value.trim(), source: 'Mobile', who: ROLES[appState.role], when: nowStamp(), urgent: true });
      notify('Sent to Finance to confirm.', 'success');
      mobileGo('home');
      refreshAll();
    }

    // =========================================================================
    // RULES (ADMIN)
    // =========================================================================
    const RULE_FIELDS = [
      ['productionCapacity', 'Plant capacity (m²/month, unweighted)', 'number'],
      ['designCapacity', 'Design capacity (weighted m²/month)', 'number', true],
      ['complexWeight', 'Complex DCF weight', 'number', true],
      ['reconTolerancePct', '4-way m² tolerance (%)', 'number', true],
      ['paymentMatchTolerancePct', 'Payment match tolerance (%)', 'number', true],
      ['accessoriesSlaHours', 'Accessories & holing SLA (hours)', 'number', true],
      ['shellPlanClockDays', 'Shell plan clock (days to approval)', 'number', true],
      ['designToProductionDays', 'Design to production clock (days)', 'number', true],
      ['productionToSailingDays', 'Production to sailing clock (days)', 'number', true],
      ['reminderLeadDays', 'Reminder lead time (days)', 'number'],
      ['lorryCapacityM2', 'Lorry capacity (m²)', 'number', true],
      ['reportRecipients', 'Weekly report recipients', 'text']
    ];
    const RULE_SWITCHES = [
      ['autoConfirmPayments', 'Auto-confirm mailbox payments scoring ≥ 90', true],
      ['enforceGateOnLorries', 'Refuse lorries for rows that are not green'],
      ['paymentLocksDesign', 'Advance payment also locks Design (management ruling, task 19)', true],
      ['weeklyReport', 'Save the weekly report every Monday'],
      ['sampleProjects', 'Show the four sample projects beside the BD project (for demonstrations)'],
      ['importOpen', 'Open the one-time go-live workbook import', true]
    ];
    function renderRules() {
      const admin = isAdmin();
      const disabled = admin ? '' : 'disabled';
      const confirmTag = '<span class="ml-1 text-[10px] font-bold text-amber-700">to confirm</span>';
      const fields = RULE_FIELDS.map(([key, label, type, open]) => `<div>
        <label for="rule-${key}" class="block font-semibold text-slate-700 mb-1">${label}${open ? confirmTag : ''}</label>
        <input id="rule-${key}" type="${type}" value="${esc(appState.rules[key])}" ${disabled} onchange="saveRule('${key}', this.value)" class="w-full px-3 py-2 border border-slate-300 rounded-lg ${type === 'number' ? 'font-mono' : ''} disabled:bg-slate-100">
      </div>`).join('');
      const switches = RULE_SWITCHES.map(([key, label, open]) => `<label class="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200"><input type="checkbox" ${appState.rules[key] ? 'checked' : ''} ${disabled} onchange="saveRule('${key}', this.checked)"><span>${label}${open ? confirmTag : ''}</span></label>`).join('');
      const gates = GATE_DEFS.map(d => `<label class="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200"><input type="checkbox" ${appState.rules.gateChecks[d.id] ? 'checked' : ''} ${disabled} onchange="saveGateRule('${d.id}', this.checked)"><span>${d.name}</span></label>`).join('');
      const kinds = ['SITE', 'PROCESSED', 'PRODUCED', 'DISPATCHED', 'DELIVERED'];
      const evidence = kinds.map(k => `<label class="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200"><input type="checkbox" ${appState.rules.evidenceRequiredFor.includes(k) ? 'checked' : ''} ${disabled} onchange="saveEvidenceRule('${k}', this.checked)"><span>${k}</span></label>`).join('');
      $('rules-form').innerHTML = `${fields}
        <div class="sm:col-span-2 lg:col-span-3 space-y-2 pt-2"><h3 class="text-xs font-bold uppercase text-slate-500">Switches</h3><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${switches}</div></div>
        <div class="sm:col-span-2 lg:col-span-3 space-y-2"><h3 class="text-xs font-bold uppercase text-slate-500">Gate Checks</h3><div class="grid grid-cols-2 sm:grid-cols-5 gap-2">${gates}</div></div>
        <div class="sm:col-span-2 lg:col-span-3 space-y-2"><h3 class="text-xs font-bold uppercase text-slate-500">No Evidence, No Change Applies To</h3><div class="grid grid-cols-2 sm:grid-cols-5 gap-2">${evidence}</div></div>
        ${admin ? '' : '<p class="sm:col-span-2 lg:col-span-3 text-amber-700 font-semibold">Only administrators can change the rules.</p>'}`;
    }
    function afterRuleChange() {
      recalculateCommercial();
      validateShellPlanSchedule();
      applyDesignLock();
      renderRules();
      refreshAll();
    }
    function saveRule(key, value) {
      if (!guard(['ADMIN'], 'change the rules')) return;
      const isText = typeof appState.rules[key] === 'string', isFlag = typeof appState.rules[key] === 'boolean';
      const parsed = isText || isFlag ? value : parseFloat(value);
      if (!isText && !isFlag && !(parsed > 0)) { notify('Enter a number above 0.', 'error'); renderRules(); return; }
      logActivity(`Rule ${key} changed from ${appState.rules[key]} to ${parsed}`);
      appState.rules[key] = parsed;
      afterRuleChange();
    }
    function saveGateRule(id, on) {
      if (!guard(['ADMIN'], 'change the rules')) return;
      appState.rules.gateChecks[id] = on;
      logActivity(`Gate check ${id} turned ${on ? 'on' : 'off'}`);
      afterRuleChange();
    }
    function saveEvidenceRule(kind, on) {
      if (!guard(['ADMIN'], 'change the rules')) return;
      const list = appState.rules.evidenceRequiredFor;
      if (on && !list.includes(kind)) list.push(kind);
      if (!on) list.splice(list.indexOf(kind), 1);
      logActivity(`Evidence rule for ${kind} turned ${on ? 'on' : 'off'}`);
      afterRuleChange();
    }

    // =========================================================================
    // PHASE 1: MR11 TOOLS (SEARCH, FILTERS, COLUMN GROUPS, HIGHLIGHT, ZOOM, SYNC)
    // =========================================================================
    // Page settings are remembered on this computer; the page still works if storage is blocked
    function loadPref(key, fallback) {
      try { const stored = localStorage.getItem(key); return stored !== null ? JSON.parse(stored) : fallback; } catch { return fallback; }
    }
    function savePref(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
    const MR11_GROUPS = {
      project: { label: 'PROJECT & CONTRACT IDENTIFICATION (STEP 1 BD)', cls: 'bg-slate-800', depts: ['BD'], locked: true },
      finance: { label: 'FINANCE GATE (STEP 2)', short: 'Finance', cls: 'bg-indigo-900', depts: ['FINANCE'] },
      design: { label: 'TECH DESIGN (STEP 3)', short: 'Shell Plan & Design', cls: 'bg-sky-900', depts: ['DESIGN', 'SHELLPLAN'] },
      pricing: { label: 'DYNAMIC LME & SELLING PRICE ENGINE (STEP 1)', short: 'Pricing & LME', cls: 'bg-emerald-900', depts: ['BD'] },
      months: { label: "MONTHLY m² (ACTUAL / F'CAST)", short: 'Monthly m²', cls: 'bg-amber-800', depts: ['BD'] },
      system: { label: 'SYSTEM', short: 'Formwork System', cls: 'bg-slate-800', depts: ['BD'] },
      revenue: { label: 'MONTHLY REVENUE VALUATION (USD)', short: 'Monthly Revenue', cls: 'bg-teal-900', depts: ['FINANCE'] },
      yard: { label: 'PRODUCTION, LOGISTICS & SITE RECON (STEPS 4–7)', short: 'Production, Logistics & Site', cls: 'bg-purple-900', depts: ['PLANNING', 'PRODUCTION', 'DISPATCH'] }
    };
    const monthKind = i => (MONTH_KEYS[i] < DEMO_TODAY.slice(0, 7) ? 'ACTUAL' : "F'CAST");
    // Dark green: completed and the date has passed. Yellow: completed, date ahead. Red: not completed.
    function completionDateClass(value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'font-bold text-rose-600';
      return value <= DEMO_TODAY ? 'font-bold text-green-800' : 'font-bold text-yellow-600';
    }
    function mr11EditCell(r, field, inner, cls = '') {
      const editable = appState.editMode && MR11_EDITABLE.includes(field);
      const pending = r._pending[field];
      return `<td class="${cls} ${pending !== undefined ? 'bg-amber-200' : ''} ${editable ? 'cursor-pointer outline outline-1 outline-amber-400' : ''}"
        ${editable ? `onclick="startCellEdit('${r.key}', '${field}')"` : ''} ${pending !== undefined ? `title="Waiting for approval: ${esc(pending)}"` : ''}>${inner}${pending !== undefined ? ' <span class="text-[9px] font-bold">(waiting)</span>' : ''}</td>`;
    }
    function actualReceivedOf(r) {
      if (r.isLive) return termsList().reduce((a, t) => a + (t.idx === advanceTerm().idx ? (appState.advanceCleared ? (appState.advanceReceived ?? t.amount) : 0) : (appState.otherPaid[t.idx]?.amount || 0)), 0);
      return /CLEARED/.test(r.advStatus) ? r.ncaQty * r.finalPrice * (r.advancePct || 0) / 100 : 0;
    }
    function mr11Columns() {
      const td = (inner, cls = '') => `<td class="${cls}">${inner}</td>`;
      const col = (group, head, cell) => ({ group, head, cell });
      const physical = (r, value) => (/Re-Design Only/.test(r.product) ? '-' : value);
      const monthCols = (group, suffix, value) => MONTH_LABELS.map((label, i) => col(group, `${label} (${suffix})<span class="block text-[9px] font-normal">${monthKind(i)}</span>`, r => td(value(r, i), 'text-right')));
      return [
        col('project', 'Row', (r, n) => {
          const count = (appState.comments[r.key] || []).length;
          const del = appState.editMode && !r.isLive ? `<button onclick="requestRowDelete('${r.key}')" class="ml-1 text-rose-700 font-bold" title="Delete this row">✕</button>` : '';
          return td(`${r.isLive ? '1 (LIVE)' : n + 1} <button onclick="openComments('${r.key}')" title="Comments on this row" aria-label="Comments on this row${count ? `: ${count}` : ''}" class="inline-flex items-center gap-0.5 align-middle"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/></svg>${count || ''}</button>${del}`, `text-center font-bold ${r.isLive ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-900'}`);
        }),
        col('project', 'Customer &amp; Project Name', r => td(esc(r.customerProject), 'font-bold')),
        col('project', 'Stream / Building / Block', r => td(esc(r.buildingStream))),
        col('project', 'Project No', r => td(esc(r.projectNo))),
        col('project', 'Short Name', r => td(esc(r.shortName))),
        col('project', 'Stream', r => td(esc(rowStreamNo(r)), 'text-center')),
        col('project', 'Countries', r => mr11EditCell(r, 'country', esc(r.country))),
        col('project', 'Location', r => td(esc(r.location))),
        col('project', 'PIC', r => mr11EditCell(r, 'pic', esc(r.pic))),
        col('project', 'Status', r => mr11EditCell(r, 'status', `<span class="px-2 py-0.5 rounded text-[10px] font-bold ${/Alert/.test(r.status) ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">${esc(r.status)}</span>`)),
        col('project', 'Products', r => td(esc(r.product), 'font-bold')),
        col('project', 'PO', r => mr11EditCell(r, 'po', esc(r.po))),
        col('project', 'NCA', r => mr11EditCell(r, 'nca', esc(r.nca))),
        col('finance', 'NCA Qty (m²)', r => td(r.ncaQty.toFixed(2), 'text-right font-bold')),
        col('finance', 'Payment Term', r => td(esc(r.paymentTerm))),
        col('finance', 'Advance Received / Status', r => td(`<span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.advStatus.includes('CLEARED') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${esc(r.advStatus)}</span>`)),
        col('finance', 'Actual Received', r => td(formatUSD(actualReceivedOf(r)), 'text-right')),
        col('finance', 'Payment Date', r => td(esc(r.paymentDate) || '—')),
        col('design', 'Shell Plan Status', r => td(esc(r.shellStatus))),
        col('design', 'Shell Plan Completion Date', r => td(`<span class="px-1 rounded bg-white ${completionDateClass(r.shellDate)}">${esc(r.shellDate)}</span>`)),
        col('design', 'Design Completion Date', r => td(`<span class="px-1 rounded bg-white ${completionDateClass(r.designDate)}">${esc(r.designDate)}</span>`)),
        col('design', 'Formwork Design Status', r => td(esc(r.designStatus))),
        col('design', 'Total Quantity Ordered m²', r => td(r.designFinal ? fmtNum(r.designFinal) : '—', 'text-right')),
        col('pricing', 'LME Type', r => td(esc(r.lmeType))),
        col('pricing', 'LME Rate ($/MT)', r => td(`$${r.lme}`, 'text-right')),
        col('pricing', 'Incoterms', r => mr11EditCell(r, 'incoterms', esc(r.incoterms), 'text-center')),
        col('pricing', 'Selling Price ($/m²)', r => td(formatUSD(r.basePrice), 'text-right')),
        col('pricing', 'Props/WPB/Waler/Acc', r => td(formatUSD(r.propsAcc), 'text-right')),
        col('pricing', 'Aluminium Weight ($/m²)', r => td(`$${(r.aluminium || 0).toFixed(3)}`, 'text-right')),
        col('pricing', 'LME Adjusted ($/m²)', r => td(`$${r.lmeAdj.toFixed(3)}`, 'text-right')),
        col('pricing', 'Freight Adjusted ($/m²)', r => td(`$${r.freightAdj.toFixed(3)}`, 'text-right')),
        col('pricing', 'Final Selling Price ($/m²)', r => td(formatUSD(r.finalPrice), 'text-right font-bold')),
        ...monthCols('months', 'm²', (r, i) => r.monthsM2[i].toFixed(1)),
        col('months', 'Total m²', r => td(r.totalForecastM2.toFixed(2), 'text-right font-bold')),
        col('system', 'Comments / Formwork System', r => td(esc(r.formworkSystem), 'font-bold')),
        ...monthCols('revenue', 'USD', (r, i) => formatUSD(r.monthsM2[i] * r.finalPrice)),
        col('revenue', 'Total USD', r => td(formatUSD(r.totalForecastM2 * r.finalPrice), 'text-right font-extrabold')),
        col('yard', 'Check', r => { const d = r.totalForecastM2 - r.ncaQty; return td(Math.abs(d) < 0.05 ? 'OK (0.0)' : d.toFixed(1), 'text-center font-bold'); }),
        col('yard', 'Total Processed (m²)', r => td(fmtNum(processedOf(r)), 'text-right font-bold')),
        col('yard', 'Processed Date', r => td(esc(r.processedDate) || '—')),
        col('yard', 'Actual Produced (m²)', r => td(physical(r, r.producedM2.toFixed(2)), 'text-right font-bold')),
        col('yard', 'Produced Date', r => td(physical(r, esc(r.producedDate) || '—'))),
        col('yard', 'Actual Del. Qty (Shipped m²)', r => td(physical(r, r.shippedM2.toFixed(2)), 'text-right font-bold')),
        col('yard', 'Dispatch Date', r => td(physical(r, esc(r.dispatchDate) || '—'))),
        col('yard', 'ETD/ATD', r => td(physical(r, esc(r.etd ? `ETD ${r.etd}` : r.dispatchDate ? `Delivered: ${r.dispatchDate}` : '') || '—'))),
        col('yard', 'Sailed (m²)', r => td(physical(r, fmtNum(sailedOf(r))), 'text-right')),
        col('yard', 'Pending Delivery (m²)', r => td(physical(r, r.pendingM2.toFixed(2)), 'text-right font-bold'))
      ];
    }
    const MR11_FILTERS = [['customerProject', 'Project'], ['country', 'Country'], ['location', 'Location'], ['pic', 'PIC'], ['status', 'Status'], ['product', 'Product Type'], ['formworkSystem', 'Formwork Type'], ['_stream', 'Stream'], ['shellStatus', 'Shell Plan Status'], ['_design', 'Design Status'], ['_payment', 'Payment Status'], ['paymentTerm', 'Payment Term'], ['lmeType', 'LME Type'], ['_dispatch', 'Dispatch Stage']];
    function mr11FilterValue(r, field) {
      if (field === '_stream') return `Stream ${rowStreamNo(r)}`;
      if (field === '_payment') return /CLEARED/.test(r.advStatus) ? 'Advance Received' : 'Awaiting Advance';
      if (field === '_design') return r.designStatus || 'Not Completed';
      if (field === '_dispatch') return r.shippedM2 <= 0 ? 'Not Dispatched' : r.shippedM2 < r.ncaQty ? 'Partly Dispatched' : 'Fully Dispatched';
      return String(r[field] ?? '(blank)').trim();
    }
    function mr11ShownRows(allRows) {
      const term = $('mr11-search').value.trim().toLowerCase();
      return allRows.filter(r => {
        if (term && ![r.customerProject, r.projectNo, r.buildingStream].some(v => String(v).toLowerCase().includes(term))) return false;
        return Object.entries(appState.mr11Filters).every(([field, value]) => !value || mr11FilterValue(r, field) === value);
      });
    }
    function renderMr11Table(allRows) {
      const shown = mr11ShownRows(allRows);
      const cols = mr11Columns().filter(c => !appState.hiddenGroups.includes(c.group));
      const lit = group => appState.highlightDept && MR11_GROUPS[group].depts.includes(appState.highlightDept);
      const groupRow = [];
      cols.forEach(c => {
        const last = groupRow[groupRow.length - 1];
        if (last && last.group === c.group) last.span++; else groupRow.push({ group: c.group, span: 1 });
      });
      $('mr11-head').innerHTML = `<tr class="sf-mr11-groups">${groupRow.map(g => `<th colspan="${g.span}" class="${lit(g.group) ? 'hl-col' : ''}">${esc(MR11_GROUPS[g.group].label)}</th>`).join('')}</tr>
        <tr class="sf-mr11-cols">${cols.map(c => `<th class="${lit(c.group) ? 'hl-col' : ''}">${c.head}</th>`).join('')}</tr>`;
      if ($('mr11-count')) $('mr11-count').textContent = shown.length === allRows.length ? `${allRows.length} contracts` : `${shown.length} of ${allRows.length} contracts`;
      $('mr11-master-tbody').innerHTML = shown.map(r => {
        const fill = FORMWORK_FILL[r.formworkSystem];
        const rowBg = r.isLive ? `${fill ? '' : 'bg-sky-50/90'} font-semibold` : `${fill ? '' : 'bg-white'}`;
        const position = allRows.indexOf(r);
        const cells = cols.map(c => {
          const html = c.cell(r, position);
          return lit(c.group) ? html.replace('<td class="', '<td class="hl-col ') : html;
        }).join('');
        return `<tr class="${rowBg} hover:brightness-95 transition" style="color:${PRODUCT_FONT[r.product] || '#000000'};${fill ? `background:${fill};` : ''}">${cells}</tr>`;
      }).join('') || `<tr><td colspan="${cols.length}" class="text-center text-slate-500 py-4">No rows match the search and filters.</td></tr>`;
      renderMr11Tools(allRows, shown);
    }
    function renderMr11Tools(allRows, shown) {
      const label = 'text-[10px] font-bold uppercase text-slate-500';
      const active = Object.values(appState.mr11Filters).filter(Boolean).length;
      $('mr11-filters').innerHTML = `<span class="${label}">Filters</span>` + MR11_FILTERS.map(([field, name]) => {
        const counts = {};
        allRows.forEach(r => { const v = mr11FilterValue(r, field); counts[v] = (counts[v] || 0) + 1; });
        const selected = appState.mr11Filters[field] || '';
        return `<select onchange="setMr11Filter('${field}', this.value)" aria-label="${name}" class="px-2 py-1 bg-white border ${selected ? 'border-indigo-500 font-bold' : 'border-slate-300'} rounded-lg max-w-[170px]"><option value="">${name}</option>${Object.keys(counts).sort().map(v => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v)} (${counts[v]})</option>`).join('')}</select>`;
      }).join('') + `<button onclick="clearMr11Filters()" class="px-2 py-1 rounded-lg border border-slate-300 bg-white font-semibold ${active ? '' : 'opacity-50'}">Clear All Filters</button><span class="text-[11px] text-slate-500">Showing ${shown.length} of ${allRows.length} rows</span>`;
      const groups = Object.entries(MR11_GROUPS).filter(([, g]) => !g.locked).map(([key, g]) => `<label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" ${appState.hiddenGroups.includes(key) ? '' : 'checked'} onchange="toggleMr11Group('${key}', this.checked)"><span>${esc(g.short)}</span></label>`).join('');
      const deptOptions = DEPT_KEYS.map(k => `<option value="${k}" ${appState.highlightDept === k ? 'selected' : ''}>${ROLES[k]}</option>`).join('');
      $('mr11-groups').innerHTML = `<span class="${label}">Columns</span>${groups}<span class="${label} ml-2">Highlight</span><select onchange="setMr11Highlight(this.value)" aria-label="Highlight department" class="px-2 py-1 bg-white border border-slate-300 rounded-lg"><option value="">None</option>${deptOptions}</select>`;
      $('mr11-zoom-label').textContent = `${appState.mr11Zoom}%`;
      $('mr11-table-wrap').style.zoom = `${appState.mr11Zoom}%`;
      $('mr11-sync-label').textContent = `Last rebuilt ${appState.lastSync}`;
      const deleted = referenceMR11Projects.filter(r => r.deleted);
      $('mr11-deleted-btn').textContent = `Deleted Rows (${deleted.length})`;
      $('mr11-deleted-btn').classList.toggle('hidden', !isAdmin());
      $('mr11-deleted').classList.toggle('hidden', !appState.deletedOpen || !isAdmin());
      $('mr11-deleted').innerHTML = deleted.length ? deleted.map(r => {
        const entry = appState.approvals.find(a => a.type === 'DELETE' && a.row === r.key && a.status === 'APPROVED');
        return `<div class="p-2 rounded bg-white border border-slate-200 flex items-center justify-between gap-2"><span><strong>${esc(r.customerProject)}</strong> • ${esc(r.buildingStream)}${entry ? ` • Deleted by ${esc(entry.by)}, ${esc(entry.when)}` : ''}</span>${entry ? `<button onclick="undoApproval(${entry.id})" class="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-bold">Restore</button>` : ''}</div>`;
      }).join('') : '<p class="text-slate-400">No rows have been deleted.</p>';
    }
    function setMr11Filter(field, value) { appState.mr11Filters[field] = value; renderMR11PipelineTab(); }
    function clearMr11Filters() { appState.mr11Filters = {}; $('mr11-search').value = ''; renderMR11PipelineTab(); }
    function toggleMr11Group(key, on) {
      appState.hiddenGroups = on ? appState.hiddenGroups.filter(k => k !== key) : [...appState.hiddenGroups, key];
      savePref('mr11.hiddenGroups', appState.hiddenGroups);
      renderMR11PipelineTab();
    }
    function setMr11Highlight(dept) { appState.highlightDept = dept; renderMR11PipelineTab(); }
    function setMr11Zoom(step) {
      appState.mr11Zoom = step === 0 ? 100 : Math.min(135, Math.max(20, appState.mr11Zoom + step));
      savePref('mr11.zoom', appState.mr11Zoom);
      renderMR11PipelineTab();
    }
    function toggleMr11Fullscreen() {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      const card = $('mr11-card');
      if (card.requestFullscreen) card.requestFullscreen().catch(() => notify('Full screen is not available in this browser window.', 'error'));
      else notify('Full screen is not available in this browser window.', 'error');
    }
    function syncMr11() {
      appState.lastSync = nowStamp();
      logActivity('MR11 rebuilt from every department\'s latest entries (Sync)');
      notify('MR11 rebuilt from every department\'s latest entries.', 'success');
      refreshAll();
    }
    function toggleDeletedRows() { appState.deletedOpen = !appState.deletedOpen; renderMR11PipelineTab(); }

    // Market cards: sample figures here; the live system reads Bank Negara Malaysia and Westmetall LME
    function renderMarket() {
      const cash = appState.lmeToday;
      const change = cash - appState.lmePrev;
      const badge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">SAMPLE</span>';
      $('market-cards').innerHTML = `
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-2 text-xs">
          <div class="flex items-center justify-between"><h3 class="text-sm font-bold text-slate-900">Exchange Rates (1 USD)</h3>${badge}</div>
          <div class="flex flex-wrap gap-2">${Object.entries(USD_RATES).filter(([c]) => c !== 'USD').map(([c, v]) => `<div class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200"><span class="text-slate-500">${c}</span> <strong class="font-mono">${v.toFixed(2)}</strong></div>`).join('')}</div>
          <p class="text-[11px] text-slate-500">Live system source: Bank Negara Malaysia, refreshed hourly. Selling prices in other currencies convert to USD with these rates.</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-2 text-xs">
          <div class="flex items-center justify-between"><h3 class="text-sm font-bold text-slate-900">LME Aluminium (USD/MT)</h3><div class="flex items-center gap-1.5">${badge}<button onclick="refreshLmeSample()" class="px-2 py-0.5 rounded border border-slate-300 text-[11px] font-semibold hover:bg-slate-50">Refresh Price</button></div></div>
          <div class="flex flex-wrap gap-2">
            <div class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200"><span class="text-slate-500">Cash</span> <strong class="font-mono">${fmtNum(cash, 0)}</strong></div>
            <div class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200"><span class="text-slate-500">3-Month</span> <strong class="font-mono">${fmtNum(cash + 15, 0)}</strong></div>
            <div class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200"><span class="text-slate-500">Change</span> <strong class="font-mono ${change >= 0 ? 'text-emerald-700' : 'text-rose-600'}">${change >= 0 ? '+' : ''}${fmtNum(change, 0)}</strong></div>
          </div>
          <p class="text-[11px] text-slate-500">Live system source: Westmetall LME table, refreshed hourly. LME Adjusted and Final Selling Price re-price with it on every read.</p>
        </div>`;
    }
    function refreshLmeSample() {
      appState.lmePrev = appState.lmeToday;
      $('bd-lme-today').value = appState.lmeToday + 15;
      recalculateCommercial();
      notify(`LME cash moved to ${fmtNum(appState.lmeToday, 0)}. Live row re-priced to ${formatUSD(appState.finalUnitRate)} / m².`, 'info');
    }

    // =========================================================================
    // PHASE 1: PLANNING / PRODUCTION SERIES & MONTHLY DISPATCH HISTORY
    // =========================================================================
    function renderSeriesHistory() {
      const seriesNames = [...new Set(appState.panels.map(p => p.series).filter(Boolean))].sort();
      $('production-series').innerHTML = `<h4 class="text-xs font-bold text-slate-700 uppercase mb-2">Production Series</h4>` + table(['Series', 'Panels', 'Total m²', 'Produced m²', 'Still to Produce m²'], seriesNames.map(s => {
        const list = appState.panels.filter(p => p.series === s);
        const total = list.reduce((a, p) => a + p.m2, 0);
        const produced = list.filter(p => PANEL_STAGES.indexOf(p.stage) >= PANEL_STAGES.indexOf('PRODUCED')).reduce((a, p) => a + p.m2, 0);
        return [esc(s), list.length, `<span class="font-mono">${fmtNum(total)}</span>`, `<span class="font-mono font-bold">${fmtNum(produced)}</span>`, `<span class="font-mono">${fmtNum(total - produced)}</span>`];
      }));
    }
    function dispatchedInMonth(r, key) {
      const lorries = appState.lorries.filter(l => l.row === r.key && l.status === 'Departed' && l.date.startsWith(key)).reduce((a, l) => a + l.m2, 0);
      return lorries + ((r.monthStages && r.monthStages[key]?.dispatched) || 0);
    }
    function renderMonthlyDispatch() {
      const rows = allMr11Rows();
      $('monthly-dispatched').innerHTML = table(['MR11 Row', ...MONTH_LABELS, 'Total'], rows.map(r => {
        const values = MONTH_KEYS.map(key => dispatchedInMonth(r, key));
        return [esc(r.customerProject.trim()), ...values.map((v, i) => `<span class="font-mono ${v ? 'font-bold' : 'text-slate-300'}">${fmtNum(v, 0)}${i === 0 && v ? ' <span class="text-[9px] text-slate-500 font-normal">so far</span>' : ''}</span>`), `<span class="font-mono font-bold">${fmtNum(values.reduce((a, b) => a + b, 0), 0)}</span>`];
      }));
    }

    // =========================================================================
    // PHASE 1: VALIDATION FLAGS & PRODUCTION-RELEASE FLAG
    // =========================================================================
    function validationIssues(r) {
      const issues = [];
      if (/pending/i.test(r.po) || !r.po) issues.push('PO number is missing');
      if (!r.designFinal) issues.push('Design final quantity is missing');
      if (!/^\d{4}-/.test(r.designDate)) issues.push('Design completion date is missing');
      if (Math.abs(r.totalForecastM2 - r.ncaQty) >= 0.05) issues.push(`Monthly forecast differs from NCA by ${fmtNum(r.totalForecastM2 - r.ncaQty)} m²`);
      if (r.isLive && Math.abs(termsList().reduce((a, t) => a + t.pct, 0) - 100) >= 0.001) issues.push('Payment terms do not total 100%');
      if (r.isLive && appState.lmeMode === 'Variable' && !appState.lmeHasRate) issues.push('LME is Variable with no LME rate');
      return issues;
    }
    function renderValidation() {
      const flagged = allMr11Rows().map(r => ({ r, issues: validationIssues(r) })).filter(x => x.issues.length);
      $('validation-list').innerHTML = flagged.length
        ? flagged.map(x => `<div class="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex flex-wrap items-center justify-between gap-2"><div><strong>${esc(x.r.customerProject.trim())}</strong><div class="text-[11px] text-slate-600">${x.issues.map(esc).join(' • ')}</div></div>${pill('FLAGGED', 'amber')}</div>`).join('')
        : '<p class="text-slate-400">No rows are flagged. Every row passes validation.</p>';
    }
    // Production-release rule: a row is flagged, not stopped, until advance and freight are both in place
    function productionReleaseFlag(key) {
      const g = gateFor(key);
      const missing = [];
      if (g.nonPhysical) return missing;
      if (!g.checks.find(c => c.id === 'payment').pass) missing.push('advance');
      if (!g.checks.find(c => c.id === 'freight').pass) missing.push('freight');
      return missing;
    }

    // =========================================================================
    // PHASE 1: CEO EXECUTIVE HUB
    // =========================================================================
    const CEO_REGIONS = { MALAYSIA: 'Malaysia', INDIA: 'India', ROW: 'Rest of World' };
    // Sample history, so the chart has ended months to compare against the forecast
    const CEO_HISTORY_LABELS = ['Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'];
    const CEO_HISTORY = { MALAYSIA: { actual: [300, 420, 380, 650], forecast: [350, 400, 400, 600] }, INDIA: { actual: [0, 0, 0, 0], forecast: [0, 0, 0, 0] }, ROW: { actual: [120, 0, 90, 140], forecast: [100, 50, 100, 150] } };
    const DEPT_LAST_ENTRY = { BD: '2026-11-17', FINANCE: '2026-11-16', SHELLPLAN: '2026-11-14', DESIGN: '2026-11-17', PLANNING: '2026-11-13', PRODUCTION: '2026-11-13', DISPATCH: '2026-11-16' };
    function regionOf(r) {
      const text = String(r.country || r.customerProject).toLowerCase();
      if (text.includes('malaysia')) return 'MALAYSIA';
      if (text.includes('india')) return 'INDIA';
      return 'ROW';
    }
    function processedOf(r) { return r.isLive ? appState.planningSeries.reduce((a, s) => a + s.processed, 0) : (r.processedM2 || 0); }
    function sailedOf(r) { return r.isLive ? appState.sailedM2 : (r.sailedM2 || 0); }
    function ceoRows() { return allMr11Rows().filter(r => !appState.ceoRegion || regionOf(r) === appState.ceoRegion); }
    function stageTotals(rows) {
      return { Design: rows.reduce((a, r) => a + (r.designFinal || 0), 0), Processed: rows.reduce((a, r) => a + processedOf(r), 0), Produced: rows.reduce((a, r) => a + r.producedM2, 0), Dispatched: rows.reduce((a, r) => a + r.shippedM2, 0), Sailed: rows.reduce((a, r) => a + sailedOf(r), 0) };
    }
    function monthStage(r, key) {
      if (!r.isLive) return { design: r.monthStages?.[key]?.design || 0, processed: r.monthStages?.[key]?.processed || 0, produced: r.monthStages?.[key]?.produced || 0, dispatched: dispatchedInMonth(r, key) };
      return {
        design: ($('des-act-date').value || '').startsWith(key) ? (r.designFinal || 0) : 0,
        processed: appState.planningSeries.filter(s => (s.date || '').startsWith(key)).reduce((a, s) => a + s.processed, 0),
        produced: appState.panelLog.filter(l => l.stage === 'PRODUCED' && (l.date || '').startsWith(key)).reduce((a, l) => a + l.m2, 0),
        dispatched: dispatchedInMonth(r, key)
      };
    }
    function ceoSeries(rows) {
      const regions = appState.ceoRegion ? [appState.ceoRegion] : Object.keys(CEO_REGIONS);
      const history = CEO_HISTORY_LABELS.map((_, i) => ({ actual: regions.reduce((a, g) => a + CEO_HISTORY[g].actual[i], 0), forecast: regions.reduce((a, g) => a + CEO_HISTORY[g].forecast[i], 0) }));
      const future = MONTH_KEYS.map((key, i) => ({ actual: null, forecast: rows.reduce((a, r) => a + (r.monthsM2[i] || 0), 0), key }));
      return [...history.map((h, i) => ({ label: CEO_HISTORY_LABELS[i], ...h })), ...future.map((f, i) => ({ label: MONTH_LABELS[i], ...f }))];
    }
    // Charts speak the same materials: verdigris for what happened, formwork steel (dashed) for the forecast, ochre for the third series
    const CHART_SERIES = { blue: '#2F6B5E', orange: '#3A3D40', aqua: '#A86A12' };
    const CHART_INK = { primary: '#1C1C1A', secondary: '#55534E', muted: '#625F5A', grid: '#DDDAD3' };
    function ceoChart(series) {
      const W = 760, H = 250, L = 52, R = 72, T = 30, B = 30;
      const max = Math.max(100, ...series.map(s => Math.max(s.actual || 0, s.forecast || 0)));
      const x = i => L + i * (W - L - R) / (series.length - 1);
      const y = v => T + (H - T - B) * (1 - v / max);
      const line = key => series.map((s, i) => (s[key] === null ? null : `${x(i)},${y(s[key])}`)).filter(Boolean).join(' ');
      const todayX = (x(CEO_HISTORY_LABELS.length - 1) + x(CEO_HISTORY_LABELS.length)) / 2;
      const band = (W - L - R) / (series.length - 1);
      const ticks = [0, max / 2, max].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${CHART_INK.grid}"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end" font-size="10" fill="${CHART_INK.muted}">${fmtNum(v, 0)}</text>`).join('');
      const labels = series.map((s, i) => { const on = s.key && s.key === appState.ceoMonth; return `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="10" fill="${on ? CHART_INK.primary : CHART_INK.muted}" font-weight="${on ? '700' : '400'}">${s.label}</text>`; }).join('');
      const points = series.map((s, i) => `${s.actual !== null ? `<circle cx="${x(i)}" cy="${y(s.actual)}" r="4" fill="${CHART_SERIES.blue}" stroke="#ffffff" stroke-width="2"/>` : ''}<circle cx="${x(i)}" cy="${y(s.forecast)}" r="4" fill="#ffffff" stroke="${CHART_SERIES.orange}" stroke-width="2"/>`).join('');
      const hits = series.map((s, i) => {
        const tip = `${s.label}\nActual: ${s.actual === null ? 'not ended yet' : fmtNum(s.actual, 0) + ' m²'}\nForecast: ${fmtNum(s.forecast, 0)} m²`;
        return `<rect x="${x(i) - band / 2}" y="${T}" width="${band}" height="${H - T - B}" fill="transparent" data-tip="${esc(tip)}" data-cx="${x(i)}" ${s.key ? `onclick="ceoPickMonth('${s.key}')" style="cursor:pointer"` : ''}/>`;
      }).join('');
      const lastActual = [...series].reverse().find(s => s.actual !== null);
      const lastActualIndex = lastActual ? series.indexOf(lastActual) : -1;
      const last = series[series.length - 1];
      const legend = `<circle cx="${L + 4}" cy="11" r="4" fill="${CHART_SERIES.blue}"/><text x="${L + 13}" y="14" font-size="10" fill="${CHART_INK.secondary}">Actual dispatched</text><line x1="${L + 112}" x2="${L + 132}" y1="11" y2="11" stroke="${CHART_SERIES.orange}" stroke-width="2" stroke-dasharray="6 4"/><text x="${L + 137}" y="14" font-size="10" fill="${CHART_INK.secondary}">Forecast</text>`;
      return `<svg viewBox="0 0 ${W} ${H}" class="w-full" role="img" aria-label="Monthly square metres, actual against forecast">${ticks}${legend}
        <line x1="${todayX}" x2="${todayX}" y1="${T - 4}" y2="${H - B}" stroke="${CHART_INK.muted}" stroke-dasharray="3 3"/><text x="${todayX + 4}" y="${T + 6}" font-size="10" font-weight="700" fill="${CHART_INK.secondary}">Today</text>
        <polyline points="${line('forecast')}" fill="none" stroke="${CHART_SERIES.orange}" stroke-width="2" stroke-dasharray="6 4"/>
        <polyline points="${line('actual')}" fill="none" stroke="${CHART_SERIES.blue}" stroke-width="2"/>${points}${labels}
        ${lastActual ? `<text x="${x(lastActualIndex)}" y="${y(lastActual.actual) - 10}" text-anchor="middle" font-size="10" font-weight="700" fill="${CHART_INK.primary}">${fmtNum(lastActual.actual, 0)}</text>` : ''}
        <text x="${x(series.length - 1) + 8}" y="${y(last.forecast) + 3}" font-size="10" fill="${CHART_INK.secondary}">Forecast</text>
        <line class="chart-cross" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="${CHART_INK.secondary}" visibility="hidden"/>${hits}</svg>`;
    }
    // Horizontal bars for one measure: one hue, rounded end at the value, direct value labels in ink
    function ceoBars(items, unit) {
      const W = 520, rowH = 30, L = 168, R = 92;
      const max = Math.max(1, ...items.map(i => i.value));
      const H = items.length * rowH + 4;
      const rows = items.map((it, n) => {
        const w = Math.max(it.value > 0 ? 3 : 0, (W - L - R) * it.value / max);
        const y = n * rowH + 7;
        const value = unit === 'USD' ? formatUSD(it.value) : `${fmtNum(it.value, 0)} m²`;
        const name = it.label.length > 26 ? `${it.label.slice(0, 25)}…` : it.label;
        return `<g data-tip="${esc(`${it.label}\n${value}`)}"><rect x="0" y="${y - 7}" width="${W}" height="${rowH}" fill="transparent"/>
          <text x="${L - 8}" y="${y + 10}" text-anchor="end" font-size="11" fill="${CHART_INK.secondary}">${esc(name)}</text>
          <rect x="${L}" y="${y}" width="${w}" height="14" rx="4" fill="${CHART_SERIES.blue}"/>
          <text x="${L + w + 6}" y="${y + 11}" font-size="11" font-weight="700" fill="${CHART_INK.primary}">${value}</text></g>`;
      }).join('');
      return `<svg viewBox="0 0 ${W} ${H}" class="w-full" role="img" aria-label="${unit === 'USD' ? 'Outstanding amount for each row' : 'Square metres at each stage'}">${rows}</svg>`;
    }
    function wireChartTips() {
      if (window.chartTip) return;
      const tip = document.createElement('div');
      tip.className = 'fixed z-50 hidden pointer-events-none px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium whitespace-pre-line shadow-lg';
      document.body.appendChild(tip);
      window.chartTip = tip;
      document.addEventListener('pointermove', e => {
        const el = e.target.closest?.('[data-tip]');
        document.querySelectorAll('.chart-cross').forEach(c => c.setAttribute('visibility', 'hidden'));
        if (!el) { tip.classList.add('hidden'); return; }
        tip.textContent = el.dataset.tip;
        tip.classList.remove('hidden');
        const box = tip.getBoundingClientRect();
        tip.style.left = `${Math.min(window.innerWidth - box.width - 8, e.clientX + 14)}px`;
        tip.style.top = `${Math.max(8, e.clientY - box.height - 10)}px`;
        if (el.dataset.cx) {
          const cross = el.ownerSVGElement?.querySelector('.chart-cross');
          if (cross) { cross.setAttribute('x1', el.dataset.cx); cross.setAttribute('x2', el.dataset.cx); cross.setAttribute('visibility', 'visible'); }
        }
      });
    }
    function ceoRegionChart() {
      const W = 760, H = 230, L = 52, R = 16, T = 30, B = 28;
      const colours = { MALAYSIA: CHART_SERIES.blue, INDIA: CHART_SERIES.orange, ROW: CHART_SERIES.aqua };
      const rows = allMr11Rows();
      const regions = Object.keys(CEO_REGIONS);
      const values = MONTH_KEYS.map((_, i) => regions.map(g => rows.filter(r => regionOf(r) === g).reduce((a, r) => a + (r.monthsM2[i] || 0), 0)));
      const max = Math.max(100, ...values.map(v => v.reduce((a, b) => a + b, 0)));
      const band = (W - L - R) / MONTH_KEYS.length;
      const scale = v => (H - T - B) * v / max;
      const barW = Math.min(44, band * 0.5);
      const bars = values.map((v, i) => {
        const bx = L + i * band + (band - barW) / 2;
        let top = H - B;
        const present = v.map((m, g) => ({ m, g })).filter(x => x.m > 0);
        const total = v.reduce((a, b) => a + b, 0);
        const parts = present.map((p, n) => {
          const h = Math.max(2, scale(p.m) - (n < present.length - 1 ? 2 : 0));
          top -= h;
          const y = top;
          top -= n < present.length - 1 ? 2 : 0;
          const name = regions[p.g];
          const isTop = n === present.length - 1;
          const shape = isTop
            ? `<path d="M${bx},${y + h} V${y + Math.min(4, h)} Q${bx},${y} ${bx + Math.min(4, h)},${y} H${bx + barW - Math.min(4, h)} Q${bx + barW},${y} ${bx + barW},${y + Math.min(4, h)} V${y + h} Z" fill="${colours[name]}"/>`
            : `<rect x="${bx}" y="${y}" width="${barW}" height="${h}" fill="${colours[name]}"/>`;
          return `<g data-tip="${esc(`${MONTH_LABELS[i]}, ${CEO_REGIONS[name]}\n${fmtNum(p.m, 0)} m² of ${fmtNum(total, 0)} m²`)}">${shape}</g>`;
        }).join('');
        return `${parts}${total ? `<text x="${bx + barW / 2}" y="${top - 5}" text-anchor="middle" font-size="10" font-weight="700" fill="${CHART_INK.primary}">${fmtNum(total, 0)}</text>` : ''}<text x="${bx + barW / 2}" y="${H - 9}" text-anchor="middle" font-size="10" fill="${CHART_INK.muted}">${MONTH_LABELS[i]}</text>`;
      }).join('');
      const ticks = [0, max / 2, max].map(v => `<line x1="${L}" x2="${W - R}" y1="${H - B - scale(v)}" y2="${H - B - scale(v)}" stroke="${CHART_INK.grid}"/><text x="${L - 6}" y="${H - B - scale(v) + 3}" text-anchor="end" font-size="10" fill="${CHART_INK.muted}">${fmtNum(v, 0)}</text>`).join('');
      const legend = regions.map((g, i) => `<rect x="${L + i * 100}" y="5" width="10" height="10" rx="2" fill="${colours[g]}"/><text x="${L + 14 + i * 100}" y="14" font-size="10" fill="${CHART_INK.secondary}">${CEO_REGIONS[g]}</text>`).join('');
      return `<svg viewBox="0 0 ${W} ${H}" class="w-full" role="img" aria-label="Monthly square metres stacked by region">${ticks}${bars}${legend}</svg>`;
    }
    function ceoDataTable(head, rows) {
      return `<details class="text-xs"><summary class="cursor-pointer text-slate-500 font-semibold">View as a table</summary><div class="overflow-x-auto pt-2">${table(head, rows)}</div></details>`;
    }
    function ceoPickMonth(key) { appState.ceoMonth = appState.ceoMonth === key ? '' : key; renderCeo(); }
    function setCeoRegion(value) { appState.ceoRegion = value; renderCeo(); }
    function setCeoMonth(value) { appState.ceoMonth = value; renderCeo(); }
    function renderCeo() {
      const root = $('ceo-content');
      if (!can('CEO')) {
        root.innerHTML = '<div class="p-6 rounded-xl bg-white border border-slate-200 text-sm text-slate-600">The CEO Executive Hub opens for the CEO and administrators. Switch "Viewing as" to try it.</div>';
        return;
      }
      const rows = ceoRows();
      const series = ceoSeries(rows);
      const month = appState.ceoMonth;
      const monthIdx = MONTH_KEYS.indexOf(month);
      let stages;
      let stageNote = 'Totals for the rows in this region.';
      if (month) {
        const sum = f => rows.reduce((a, r) => a + monthStage(r, month)[f], 0);
        stages = { 'BD Forecast': rows.reduce((a, r) => a + (r.monthsM2[monthIdx] || 0), 0), Design: sum('design'), Processed: sum('processed'), Produced: sum('produced'), Dispatched: sum('dispatched') };
        const redesign = rows.filter(r => /Re-Design Only/.test(r.product)).reduce((a, r) => a + (r.monthsM2[monthIdx] || 0), 0);
        stageNote = `Pipeline for ${MONTH_LABELS[monthIdx]}. Re-Design Only rows, shown apart: ${fmtNum(redesign, 0)} m².`;
      } else {
        stages = stageTotals(rows);
      }
      const value = rows.reduce((a, r) => a + r.ncaQty * r.finalPrice, 0);
      const area = rows.reduce((a, r) => a + r.ncaQty, 0);
      const avg = area ? value / area : 0;
      const outstanding = rows.reduce((a, r) => a + cashAtRisk(r), 0);
      const green = rows.filter(r => gateFor(r.key).green).length;
      const ended = series.filter(s => s.actual !== null && s.forecast > 0);
      const accuracy = ended.length ? Math.max(0, 100 - ended.reduce((a, s) => a + Math.abs(s.actual - s.forecast), 0) / ended.reduce((a, s) => a + s.forecast, 0) * 100) : null;
      const card = (label, val, unit = 'm²') => `<div class="p-4 rounded-xl bg-white border border-slate-200 shadow-xs"><span class="text-xs font-semibold text-slate-500 block">${label}</span><span class="text-xl font-extrabold font-mono text-slate-900">${fmtNum(val, 0)}</span> <span class="text-[11px] text-slate-500">${unit}</span></div>`;
      const byRegion = Object.entries(CEO_REGIONS).map(([k, name]) => {
        const list = allMr11Rows().filter(r => regionOf(r) === k);
        const s = stageTotals(list);
        return [name, list.length, ...Object.values(s).map(v => `<span class="font-mono">${fmtNum(v, 0)}</span>`), `<span class="font-mono">${formatUSD(list.reduce((a, r) => a + cashAtRisk(r), 0))}</span>`];
      });
      const latency = DEPT_KEYS.map(k => {
        const mine = appState.updates.concat(appState.activity).some(u => u.who === ROLES[k] && (u.when || '').startsWith(DEMO_TODAY));
        const last = mine ? DEMO_TODAY : DEPT_LAST_ENTRY[k];
        const days = daysBetween(last, DEMO_TODAY);
        return [ROLES[k], esc(last), `<span class="font-mono ${days > 3 ? 'text-amber-700 font-bold' : ''}">${days} day(s)</span>`];
      });
      root.innerHTML = `
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 class="text-base font-bold text-slate-900">CEO Executive Intelligence Overview</h2><p class="text-xs text-slate-500">Worked out from the latest MR11. It reads MR11 without approved edits in the built system. History before Nov 26 is sample data.</p></div>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <select onchange="setCeoRegion(this.value)" aria-label="Region" class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"><option value="">All regions</option>${Object.entries(CEO_REGIONS).map(([k, n]) => `<option value="${k}" ${appState.ceoRegion === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
            <select onchange="setCeoMonth(this.value)" aria-label="Month" class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"><option value="">All months</option>${MONTH_KEYS.map((k, i) => `<option value="${k}" ${month === k ? 'selected' : ''}>${MONTH_LABELS[i]}</option>`).join('')}</select>
            <button onclick="appState.ceoRegion = ''; appState.ceoMonth = ''; renderCeo()" class="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold">Clear</button>
            <button onclick="syncMr11()" class="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold">Refresh Data</button>
          </div>
        </div>
        <div><div class="grid grid-cols-2 sm:grid-cols-6 gap-3">${card('Projects', rows.length, 'rows')}${Object.entries(stages).map(([k, v]) => card(k, v)).join('')}</div><p class="text-[11px] text-slate-500 mt-1.5">${esc(stageNote)}</p></div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-2">
            <h3 class="text-sm font-bold text-slate-900">Monthly m² · Actual vs Forecast</h3>
            <p class="text-[11px] text-slate-500">Click a forecast point to see that month's pipeline.</p>
            ${ceoChart(series)}
            ${ceoDataTable(['Month', 'Actual m²', 'Forecast m²'], series.map(x => [x.label, x.actual === null ? '—' : fmtNum(x.actual, 0), fmtNum(x.forecast, 0)]))}
          </div>
          <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-2.5 text-xs">
            <h3 class="text-sm font-bold text-slate-900">Pricing, Readiness &amp; Cash</h3>
            ${[['Average price per m² (USD)', formatUSD(avg)], ['Average price per m² (MYR)', `MYR ${fmtNum(avg * USD_RATES.MYR)}`], ['USD to MYR', fmtNum(USD_RATES.MYR)], ['LME cash (USD/MT)', fmtNum(appState.lmeToday, 0)], ['Green / blocked rows', `${green} / ${rows.length - green}`], ['Outstanding (cash at risk)', formatUSD(outstanding)], ['Forecast accuracy, ended months', accuracy === null ? 'n/a' : `${fmtNum(accuracy, 1)}%`]].map(([k, v]) => `<div class="flex justify-between gap-2 border-b border-slate-100 pb-1.5"><span class="text-slate-500">${k}</span><strong class="font-mono text-right">${v}</strong></div>`).join('')}
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-2">
            <h3 class="text-sm font-bold text-slate-900">Production Pipeline (m²)</h3>
            <p class="text-[11px] text-slate-500">${esc(month ? `How far ${MONTH_LABELS[monthIdx]} has moved through each stage.` : 'How far the work has moved through each stage.')}</p>
            ${ceoBars(Object.entries(stages).map(([label, value]) => ({ label, value })), 'm2')}
          </div>
          <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-2">
            <h3 class="text-sm font-bold text-slate-900">Cash at Risk by Project</h3>
            <p class="text-[11px] text-slate-500">Contract value not yet received, largest first.</p>
            ${ceoBars(rows.map(r => ({ label: r.customerProject.trim(), value: cashAtRisk(r) })).sort((a, b) => b.value - a.value), 'USD')}
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-2">
            <h3 class="text-sm font-bold text-slate-900">Total m² by Region</h3>
            <p class="text-[11px] text-slate-500">Design, processed, produced and dispatched per region.</p>
            <div class="overflow-x-auto">${table(['Region', 'Rows', 'Design', 'Processed', 'Produced', 'Dispatched', 'Sailed', 'Outstanding'], byRegion)}</div>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-2">
            <h3 class="text-sm font-bold text-slate-900">KPI Baseline: Data Latency</h3>
            <div class="overflow-x-auto">${table(['Department', 'Last Entry', 'Age'], latency)}</div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-2">
          <h3 class="text-sm font-bold text-slate-900">Monthly m² by Region</h3>
          <p class="text-[11px] text-slate-500">Entered monthly values, stacked by region.</p>
          ${ceoRegionChart()}
          ${ceoDataTable(['Month', ...Object.values(CEO_REGIONS)], MONTH_LABELS.map((label, i) => [label, ...Object.keys(CEO_REGIONS).map(g => fmtNum(allMr11Rows().filter(r => regionOf(r) === g).reduce((a, r) => a + (r.monthsM2[i] || 0), 0), 0))]))}
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-2">
          <h3 class="text-sm font-bold text-slate-900">MR11 Raw Data</h3>
          <div class="overflow-x-auto">${table(['MR11 Row', 'Region', 'Status', 'NCA m²', 'Final Price', 'Produced m²', 'Shipped m²', 'Advance', 'Gate'], rows.map(r => [esc(r.customerProject.trim()), CEO_REGIONS[regionOf(r)], esc(r.status), `<span class="font-mono">${fmtNum(r.ncaQty)}</span>`, `<span class="font-mono">${formatUSD(r.finalPrice)}</span>`, `<span class="font-mono">${fmtNum(r.producedM2)}</span>`, `<span class="font-mono">${fmtNum(r.shippedM2)}</span>`, esc(r.advStatus), gateFor(r.key).green ? pill('GREEN', 'emerald') : pill('NOT GREEN', 'rose')]))}</div>
        </div>`;
    }

    // =========================================================================
    // PHASE 1: ADMIN PERMISSIONS
    // =========================================================================
    const MAIN_ADMIN = 'admin@mfeformwork.com';
    // No CEO preset: as in the built system, the CEO role is added by IT in the database
    const ADMIN_PRESETS = { ADMIN: 'System Administrator', BD: 'Business Development', FINANCE: 'Finance', SHELLPLAN: 'Shell Plan', DESIGN: 'Design', PLANNING: 'Planning', PRODUCTION: 'Production', DISPATCH: 'Dispatch' };
    function presetOf(roles) {
      if (roles.includes('CEO')) return 'CEO';
      if (roles.includes('ADMIN')) return 'ADMIN';
      return roles.length === 1 && ADMIN_PRESETS[roles[0]] ? roles[0] : 'CUSTOM';
    }
    function renderAdminUsers() {
      const root = $('admin-users');
      if (!isAdmin()) {
        root.innerHTML = '<p class="text-sm text-slate-600">Admin Permissions opens for administrators only. Switch "Viewing as" to Administrator to try it.</p>';
        $('admin-form').classList.add('hidden');
        return;
      }
      $('admin-form').classList.remove('hidden');
      const presetOptions = Object.entries(ADMIN_PRESETS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
      $('admin-new-preset').innerHTML = $('admin-new-preset').innerHTML || presetOptions;
      root.innerHTML = table(['User Account', 'Primary Role (Auto-Config)', 'Global MR11', ...DEPT_KEYS.map(k => ROLES[k]), 'State', 'Action'], appState.users.map(u => {
        const protectedUser = u.email === MAIN_ADMIN;
        const current = presetOf(u.roles);
        const presetCell = current === 'CEO'
          ? '<span class="font-semibold">CEO (set by IT)</span>'
          : `<select onchange="setUserPreset('${esc(u.email)}', this.value)" ${protectedUser ? 'disabled' : ''} aria-label="Primary role for ${esc(u.name)}" class="px-2 py-1 bg-white border border-slate-300 rounded-lg font-semibold disabled:bg-slate-100">${Object.entries(ADMIN_PRESETS).map(([k, v]) => `<option value="${k}" ${current === k ? 'selected' : ''}>${v}</option>`).join('')}<option value="CUSTOM" ${current === 'CUSTOM' ? 'selected' : ''} disabled>Custom Permissions</option></select>`;
        const deptCells = DEPT_KEYS.map(k => {
          const on = u.roles.includes('ADMIN') || u.roles.includes(k);
          return `<button onclick="toggleUserDept('${esc(u.email)}', '${k}')" ${protectedUser || u.roles.includes('ADMIN') ? 'disabled' : ''} class="px-2 py-0.5 rounded text-[10px] font-bold ${on ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}">${on ? 'Enabled' : 'Hidden'}</button>`;
        });
        const action = protectedUser ? pill('Protected System Account', 'amber') : `<button onclick="deleteUser('${esc(u.email)}')" class="px-2 py-1 rounded border border-rose-300 text-rose-700 text-[11px] font-semibold whitespace-nowrap">Delete User Account</button>`;
        return [`<strong>${esc(u.name)}</strong><div class="text-[11px] text-slate-500">${esc(u.email)}</div>`, presetCell, pill('Enabled', 'emerald'), ...deptCells, pill('ACTIVE', 'emerald'), action];
      }));
    }
    function createUser() {
      if (!guard(['ADMIN'], 'create users')) return;
      const name = $('admin-new-name').value.trim(), email = $('admin-new-email').value.trim().toLowerCase();
      if (!name) { notify('Enter the person\'s full name.', 'error'); return; }
      if (!/^[^@\s'"<>]+@[^@\s'"<>]+\.[^@\s'"<>]+$/.test(email)) { notify('Enter a valid corporate email address.', 'error'); return; }
      if (appState.users.some(u => u.email === email)) { notify('That email address already has an account.', 'error'); return; }
      const temporary = $('admin-new-password').value;
      if (temporary.length < 8) { notify('The temporary password needs at least 8 characters.', 'error'); return; }
      appState.users.push({ name, email, roles: [$('admin-new-preset').value], password: temporary, usingDefault: true });
      $('admin-new-name').value = ''; $('admin-new-email').value = ''; $('admin-new-password').value = '';
      logActivity(`Created user ${email} as ${ADMIN_PRESETS[appState.users[appState.users.length - 1].roles[0]]}`);
      notify(`Account created for ${name}. They change the starting password when they first sign in.`, 'success');
      renderAdminUsers();
      renderApprovals();
    }
    function setUserPreset(email, preset) {
      if (!guard(['ADMIN'], 'change roles')) return;
      const u = appState.users.find(x => x.email === email);
      u.roles = [preset];
      logActivity(`Changed ${email} to ${ADMIN_PRESETS[preset]}`);
      notify('Saved. It takes full effect the next time this person signs in.', 'info');
      renderAdminUsers();
      renderApprovals();
    }
    function toggleUserDept(email, dept) {
      if (!guard(['ADMIN'], 'change roles')) return;
      const u = appState.users.find(x => x.email === email);
      u.roles = u.roles.includes(dept) ? u.roles.filter(r => r !== dept) : [...u.roles, dept];
      logActivity(`${u.roles.includes(dept) ? 'Enabled' : 'Hid'} ${ROLES[dept]} for ${email}`);
      renderAdminUsers();
      renderApprovals();
    }
    function deleteUser(email) {
      if (!guard(['ADMIN'], 'delete users')) return;
      if (email === MAIN_ADMIN) { notify('The main administrator account cannot be deleted.', 'error'); return; }
      askModal({
        title: 'Delete User Account', desc: `This removes ${email} and cannot be undone. Type the email address to confirm.`, label: 'Email address', confirm: 'Delete User', min: 3,
        onOk: typed => {
          if (typed.toLowerCase() !== email) { notify('The email address did not match, so nothing was deleted.', 'error'); return; }
          appState.users = appState.users.filter(u => u.email !== email);
          logActivity(`Deleted user ${email}`);
          notify('User deleted.', 'success');
          renderAdminUsers();
          renderApprovals();
        }
      });
    }

    // =========================================================================
    // PHASE 1: DEPARTMENT WORKBOOK VIEWER, PLANNING LEDGER & PRODUCTION REGISTRY
    // =========================================================================
    const WORKBOOK_DEPTS = { BD: 'Business Development', FINANCE: 'Finance', DESIGN: 'Shell Plan & Design', PLANNING: 'Planning', PRODUCTION: 'Production', DISPATCH: 'Dispatch' };
    const ENTRY_STEP = { BD: 'Step 1', FINANCE: 'Step 2', DESIGN: 'Step 3', PLANNING: 'Step 4', PRODUCTION: 'Step 4', DISPATCH: 'Step 6' };
    function allowedWorkbookDepts() {
      if (appState.role === 'ADMIN') return Object.keys(WORKBOOK_DEPTS);
      if (appState.role === 'SHELLPLAN') return ['DESIGN'];
      return Object.keys(WORKBOOK_DEPTS).filter(k => k === appState.role);
    }
    const columnLetter = n => { let s = ''; n += 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
    function rowStreamNo(r) { return r.isLive ? (/^\d{6,7}$/.test(r.projectNo) ? String(parseInt(r.projectNo.slice(5), 10)) : '1') : r.stream; }
    function buildDeptSheet(dept, part) {
      // One row per MR11 line, each with its own figures
      const rows = typeof mr11Lines === 'function' ? mr11Lines(allMr11Rows()) : allMr11Rows();
      const defs = {
        BD: [['Customer & Project Name', r => r.customerProject.trim()], ['Project No', r => r.projectNo], ['Project Shortname', r => r.shortName], ['Stream', rowStreamNo], ['Countries', r => r.country], ['Location', r => r.location], ['PIC', r => r.pic], ['Status', r => r.status], ['Product Type', r => r.product], ['Formwork Type', r => r.formworkSystem]],
        FINANCE: [['Customer & Project Name', r => r.customerProject.trim()], ['Project No', r => r.projectNo], ['Stream', rowStreamNo], ['Payment Term', r => r.paymentTerm], ['Advance Received / Payment Status', r => r.advStatus], ['Actual Received', r => formatUSD(r.actualReceived)], ['Payment Date', r => r.paymentDate || '']],
        DESIGN: [['Project No', r => r.projectNo], ['Project Name', r => r.customerProject.trim()], ['Stream', rowStreamNo], ['Shell Plan Status - Pending Consultant Drawings', r => r.shellStatus], ['Shell Plan Approved Date', r => r.shellDate], ['Formwork Design Status', r => r.designStatus], ['Actual Formwork Order Completion Date', r => r.designDate], ['Total Quantity Ordered m2', r => r.designFinal ?? '']],
        PLANNING: [['Contract No.', r => r.projectNo], ['Project Shortname', r => r.shortName], ['Project Name', r => r.customerProject.trim()], ['Stream', rowStreamNo], ['Cumulative Processed (Project)', r => processedOf(r)], ['Processed Date', r => r.processedDate || '']],
        PRODUCTION: [['Contract No.', r => r.projectNo], ['Project Shortname', r => r.shortName], ['Stream', rowStreamNo], ['Cumulative Produced (Project)', r => r.producedM2], ['Latest Day With Output', r => r.producedDate || '']],
        DISPATCH: part === 'OVERSEAS'
          ? [['Project Name', r => r.customerProject.trim()], ['Stream', rowStreamNo], ['ETD', r => r.etd || ''], ['ATD', r => r.atd || ''], ['Formwork Quantity Sailed (m2)', r => sailedOf(r)]]
          : [['Project Name', r => r.customerProject.trim()], ['Stream', rowStreamNo], ['Delivered', r => r.dispatchDate || ''], ['Cumulative Dispatched (Project)', r => r.shippedM2]]
      };
      const list = dept === 'DISPATCH' ? rows.filter(r => (regionOf(r) === 'MALAYSIA') === (part !== 'OVERSEAS')) : rows;
      const def = defs[dept];
      return {
        name: 'Sheet1', merges: [],
        rows: [def.map(d => d[0]), ...list.map(r => def.map(d => d[1](r)))],
        style: [{ fill: '#00FFFF', font: '#000000', bold: true }, ...list.map(r => ({ fill: FORMWORK_FILL[r.formworkSystem] || '', font: PRODUCT_FONT[r.product] || '#000000' }))]
      };
    }
    const workbookKey = () => (appState.wbDept === 'DISPATCH' ? `DISPATCH-${appState.wbPart}` : appState.wbDept);
    function renderWorkbook() {
      const root = $('wb-content');
      const allowed = allowedWorkbookDepts();
      if (!allowed.length) {
        root.innerHTML = '<div class="p-6 rounded-xl bg-white border border-slate-200 text-sm text-slate-600">No department tabs assigned. Ask an administrator to give you your department\'s role.</div>';
        return;
      }
      if (!allowed.includes(appState.wbDept)) { appState.wbDept = allowed[0]; appState.wbView = 'SHEET'; }
      const dept = appState.wbDept;
      const uploaded = appState.workbooks[workbookKey()];
      const hasLedger = dept === 'PLANNING' || dept === 'PRODUCTION';
      if (!hasLedger) appState.wbView = 'SHEET';
      const uploadLabel = dept === 'DISPATCH' ? `Upload ${appState.wbPart === 'OVERSEAS' ? 'Overseas' : 'Local'}` : hasLedger ? 'Upload &amp; Sync' : 'Upload &amp; Deploy';
      const btn = (active, onclick, label) => `<button onclick="${onclick}" class="px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300 text-slate-700'}">${label}</button>`;
      let body;
      if (appState.wbView === 'LEDGER') {
        body = dept === 'PLANNING' ? renderSeriesLedger() : renderProductionRegistry();
      } else {
        const sheets = uploaded ? uploaded.sheets : [buildDeptSheet(dept, appState.wbPart)];
        const index = Math.min(appState.wbSheet, sheets.length - 1);
        const tabs = sheets.map((s, i) => `<button onclick="appState.wbSheet = ${i}; renderWorkbook()" class="px-3 py-1 rounded border text-xs font-semibold ${i === index ? 'bg-white border-slate-300 text-sky-700' : 'border-transparent text-slate-500'}">${esc(s.name)}</button>`).join('');
        body = `<div class="overflow-auto custom-scrollbar max-h-[560px] border border-slate-300 rounded-t-lg" style="zoom:${appState.wbZoom}%">${renderSheetGrid(sheets[index])}</div>
          <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-t-0 border-slate-300 rounded-b-lg text-[10px] font-bold uppercase text-slate-500">Sheets: ${tabs}</div>`;
      }
      const ledgerLabel = dept === 'PLANNING' ? 'Series Ledger' : 'Production Series';
      root.innerHTML = `<div id="wb-card" class="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2"><h2 class="text-sm font-extrabold tracking-wider uppercase text-slate-900">${esc(WORKBOOK_DEPTS[dept])}</h2>${pill('ONLINE', 'emerald')}</div>
            <p class="text-[11px] text-slate-500">Active ledger: <span class="font-mono text-slate-800">${esc(uploaded ? uploaded.file : `online entry, ${ENTRY_STEP[dept]}`)}</span> • Verified by ${esc(uploaded ? uploaded.by : ROLES[appState.role])}</p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            ${allowed.length > 1 ? `<select onchange="setWorkbookDept(this.value)" aria-label="Department" class="px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold">${allowed.map(k => `<option value="${k}" ${k === dept ? 'selected' : ''}>${esc(WORKBOOK_DEPTS[k])}</option>`).join('')}</select>` : ''}
            ${dept === 'DISPATCH' ? btn(appState.wbPart === 'LOCAL', "setWorkbookPart('LOCAL')", 'Local') + btn(appState.wbPart === 'OVERSEAS', "setWorkbookPart('OVERSEAS')", 'Overseas') : ''}
            ${hasLedger ? btn(appState.wbView === 'SHEET', "setWorkbookView('SHEET')", 'Active Sheet') + btn(appState.wbView === 'LEDGER', "setWorkbookView('LEDGER')", ledgerLabel) : ''}
            <button onclick="setWorkbookZoom(-15)" aria-label="Zoom out" class="px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-bold">−</button>
            <button onclick="setWorkbookZoom(0)" title="Reset zoom" class="px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono">${appState.wbZoom}%</button>
            <button onclick="setWorkbookZoom(15)" aria-label="Zoom in" class="px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-bold">+</button>
            <button onclick="toggleWorkbookFullscreen()" class="px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold">Full Screen</button>
            <button onclick="startWorkbookUpload()" id="wb-upload-btn" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold">${uploadLabel}</button>
          </div>
        </div>
        ${appState.rules.importOpen ? '<p class="text-[11px] font-semibold text-amber-800 p-2 rounded bg-amber-50 border border-amber-200">The one-time go-live import is open. After it closes, uploads are refused and departments enter online.</p>' : ''}
        ${body}
      </div>`;
    }
    function renderSheetGrid(sheet) {
      const rows = sheet.rows.slice(0, 5000);
      const width = Math.min(200, rows.reduce((a, r) => Math.max(a, r.length), 0));
      const merges = sheet.merges || [];
      const covered = new Set();
      const start = {};
      merges.forEach(m => {
        start[`${m.s.r}_${m.s.c}`] = m;
        for (let r = m.s.r; r <= m.e.r; r++) for (let c = m.s.c; c <= m.e.c; c++) if (r !== m.s.r || c !== m.s.c) covered.add(`${r}_${c}`);
      });
      const head = `<tr><th class="sticky top-0 bg-slate-200 border border-slate-300 px-2 py-1 text-[11px] text-slate-600">#</th>${Array.from({ length: width }, (_, c) => `<th class="sticky top-0 bg-slate-200 border border-slate-300 px-2 py-1 text-[11px] text-slate-600">${columnLetter(c)}</th>`).join('')}</tr>`;
      const body = rows.map((row, r) => {
        const st = sheet.style?.[r] || {};
        const cells = Array.from({ length: width }, (_, c) => {
          if (covered.has(`${r}_${c}`)) return '';
          const m = start[`${r}_${c}`];
          const span = m ? ` rowspan="${m.e.r - m.s.r + 1}" colspan="${m.e.c - m.s.c + 1}"` : '';
          return `<td${span} class="border border-slate-200 px-2 py-1 whitespace-nowrap ${st.bold ? 'font-bold' : ''}" style="${st.fill ? `background:${st.fill};` : ''}${st.font ? `color:${st.font};` : ''}">${esc(row[c] ?? '')}</td>`;
        }).join('');
        return `<tr><td class="bg-slate-100 border border-slate-200 px-2 py-1 text-center text-[10px] font-mono text-slate-500">${r + 1}</td>${cells}</tr>`;
      }).join('');
      return `<table class="text-xs border-collapse bg-white">${head}${body}</table>`;
    }
    function setWorkbookDept(dept) { appState.wbDept = dept; appState.wbView = 'SHEET'; appState.wbSheet = 0; renderWorkbook(); }
    function setWorkbookPart(part) { appState.wbPart = part; appState.wbSheet = 0; renderWorkbook(); }
    function setWorkbookView(view) { appState.wbView = view; renderWorkbook(); }
    function setWorkbookZoom(step) { appState.wbZoom = step === 0 ? 100 : Math.min(135, Math.max(20, appState.wbZoom + step)); renderWorkbook(); }
    function toggleWorkbookFullscreen() {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      const card = $('wb-card');
      if (card.requestFullscreen) card.requestFullscreen().catch(() => notify('Full screen is not available in this browser window.', 'error'));
    }
    // Phase 2 retires uploads: only the one-time go-live import can still load a workbook
    function startWorkbookUpload() {
      if (!appState.rules.importOpen) {
        notify(`Excel uploads are retired. ${WORKBOOK_DEPTS[appState.wbDept]} enters online in ${ENTRY_STEP[appState.wbDept]}. An administrator can open the one-time go-live import in Rules.`, 'error');
        return;
      }
      $('wb-file').click();
    }
    function handleWorkbookFile(input) {
      const file = input.files[0];
      input.value = '';
      if (!file) return;
      if (!/\.xlsx$/i.test(file.name)) { notify('Only .xlsx workbooks can be imported.', 'error'); return; }
      if (file.size > 25 * 1024 * 1024) { notify('The file is over the 25 MB limit.', 'error'); return; }
      if (typeof XLSX === 'undefined') { notify('SheetJS library is still loading. Please try again in a moment.', 'error'); return; }
      const key = workbookKey();
      const uploadBtn = $('wb-upload-btn');
      if (uploadBtn) uploadBtn.textContent = 'Deploying...';
      file.arrayBuffer().then(buffer => {
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheets = wb.SheetNames.map(name => {
          const ws = wb.Sheets[name];
          return { name, merges: ws['!merges'] || [], rows: XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) };
        });
        appState.workbooks[key] = { file: file.name, by: ROLES[appState.role], sheets };
        appState.wbSheet = 0;
        logActivity(`Imported workbook ${file.name} for ${key}`);
        notify(`${file.name} imported with ${sheets.length} sheet(s). This viewer shows its values; the file stays on this computer.`, 'success');
        renderWorkbook();
      }).catch(() => {
        notify('That file could not be read. Your previous data is still active.', 'error');
        renderWorkbook();
      });
    }
    function renderSeriesLedger() {
      const rows = allMr11Rows();
      const swatch = hex => `<span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-full inline-block" style="background:${hex}"></span><span class="font-mono text-[10px] text-slate-500">${hex}</span></span>`;
      const entries = [];
      rows.forEach(r => (r.isLive ? appState.planningSeries : (r.seriesLedger || [])).forEach(s => entries.push({ r, s })));
      return `<div class="space-y-2"><div><h3 class="text-[11px] font-bold tracking-wider uppercase text-slate-500">Planning Sequence Ledger</h3><p class="text-xs text-slate-500">${entries.length} series phases, kept as history for the cumulative processed figure.</p></div>
        <div class="overflow-x-auto">${table(['Contract No.', 'Shortcode', 'Customer &amp; Project Name', 'Stream', 'Signature Color', 'Series', 'Processed (m²)', 'Target Volume (m²)', 'Closing Timestamp', 'Recorded Date'], entries.map(({ r, s }) => [
          esc(r.projectNo), esc(r.shortName), `<span style="color:${PRODUCT_FONT[r.product]}">${esc(r.customerProject.trim())}</span>`, `Stream ${esc(rowStreamNo(r))}`, swatch(PRODUCT_FONT[r.product] || '#000000'), esc(s.series), `<span class="font-mono font-bold">${fmtNum(s.processed)}</span>`, `<span class="font-mono">${fmtNum(s.area)}</span>`, esc(s.closing || '—'), esc(s.date)
        ]))}</div></div>`;
    }
    function renderProductionRegistry() {
      const rows = [];
      [...new Set(appState.panels.map(p => p.series).filter(Boolean))].sort().forEach(series => {
        const list = appState.panels.filter(p => p.series === series && PANEL_STAGES.indexOf(p.stage) >= PANEL_STAGES.indexOf('PRODUCED'));
        rows.push({ contract: appState.projectNo, short: $('bd-short-name').value, project: appState.projectName, stream: rowStreamNo(allMr11Rows()[0]), hex: PRODUCT_FONT[appState.productType], series, produced: list.reduce((a, p) => a + p.m2, 0), updated: appState.panelLog[0]?.date || '' });
      });
      referenceMR11Projects.filter(r => !r.deleted && r.producedM2 > 0).forEach(r => rows.push({ contract: r.projectNo, short: r.shortName, project: r.customerProject.trim(), stream: r.stream, hex: PRODUCT_FONT[r.product], series: 'S1', produced: r.producedM2, updated: r.producedDate }));
      return `<div class="space-y-2"><div><h3 class="text-[11px] font-bold tracking-wider uppercase text-slate-500">Production Series Registry</h3><p class="text-xs text-slate-500">Monthly files reset, but earlier months are kept here.</p></div>
        <div class="overflow-x-auto">${table(['Contract No.', 'Shortcode', 'Customer &amp; Project Name', 'Stream', 'Signature Color', 'Series', 'Produced (m²)', 'Updated'], rows.map(x => [esc(x.contract), esc(x.short), `<span style="color:${x.hex}">${esc(x.project)}</span>`, `Stream ${esc(x.stream)}`, `<span class="w-3 h-3 rounded-full inline-block" style="background:${x.hex}"></span>`, esc(x.series), `<span class="font-mono font-bold">${fmtNum(x.produced)}</span>`, esc(x.updated)]), 'No production series recorded yet.')}</div></div>`;
    }

    // Shell Plan approval history, newest first, with a project picker
    function renderApprovalHistory() {
      const live = appState.shellRevisions.filter(x => /Approved|Reapprove/.test(x.status)).map(x => ({ project: appState.projectName, no: appState.projectNo, stream: rowStreamNo(allMr11Rows()[0]), status: x.status, revision: x.rev, approved: x.status === 'Approved' ? x.date : '', submitted: $('sp-sub-date').value, seen: x.date }));
      const samples = referenceMR11Projects.filter(r => !r.deleted).flatMap(r => (r.approvals || []).map(a => ({ project: r.customerProject.trim(), no: r.projectNo, stream: r.stream, ...a })));
      const all = [...live, ...samples].sort((a, b) => String(b.seen).localeCompare(String(a.seen)));
      const picker = $('approval-project');
      const current = picker.value;
      picker.innerHTML = `<option value="">All projects</option>${[...new Set(all.map(a => a.project))].map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}`;
      picker.value = current;
      $('approval-history').innerHTML = table(['Project', 'Project No', 'Stream', 'Status', 'Revision', 'Approved', 'Submitted', 'First Seen'], all.filter(a => !picker.value || a.project === picker.value).map(a => [esc(a.project), esc(a.no), esc(a.stream), pill(a.status, a.status === 'Approved' ? 'emerald' : 'amber'), `Rev ${esc(a.revision)}`, esc(a.approved) || '—', esc(a.submitted) || '—', esc(a.seen)]));
    }

    // =========================================================================
    // PHASE 1: PAGES BY ROLE, SIGN-IN, SIGN-OUT & CHANGE PASSWORD
    // =========================================================================
    const COMMON_TABS = [6, 9, 10, 11, 12, 13, 18, 19];
    const ROLE_TABS = { BD: [1, 17], FINANCE: [2, 17], SHELLPLAN: [3, 17], DESIGN: [3, 17], PLANNING: [4, 17], PRODUCTION: [4, 17], DISPATCH: [7, 8, 17], CEO: [15] };
    function tabAllowed(tab, role = appState.role) { return role === 'ADMIN' || COMMON_TABS.includes(tab) || (ROLE_TABS[role] || []).includes(tab); }
    function applyRoleNav() {
      const admin = isAdmin();
      document.querySelectorAll('[id^="tab-btn-"]').forEach(btn => {
        btn.classList.toggle('hidden', !tabAllowed(Number(btn.id.replace('tab-btn-', ''))));
      });
      document.querySelectorAll('#step-bar .lucide-chevron-right').forEach(el => el.classList.toggle('hidden', !admin));
      document.querySelectorAll('#step-bar .step-divider').forEach(el => el.classList.toggle('hidden', !admin));
    }
    const PROTOTYPE_PASSWORD = /*@if hosted*/''/*@else*/'demo1234'/*@endif*/;
    function currentUser() { return appState.users.find(u => u.email === appState.currentUserEmail); }
    function renderUserChip() {
      const u = currentUser();
      $('header-user').textContent = u ? u.name : '';
      const key = $('header-key-btn');
      const flagged = u && u.usingDefault;
      key.dataset.state = flagged ? 'warn' : '';
      key.title = flagged ? 'You are using the default password. Change it.' : 'Change password';
    }
    function signOut() {
      appState.currentUserEmail = '';
      $('signin-email').value = '';
      $('signin-password').value = '';
      $('signin-error').textContent = '';
      $('signin-screen').classList.remove('hidden');
      $('signin-screen').classList.add('flex');
      $('signin-email').focus();
    }
    function performLogin() {
      const email = $('signin-email').value.trim().toLowerCase();
      const password = $('signin-password').value;
      const error = $('signin-error');
      if (!email || !password) { error.textContent = 'Enter your email and password.'; return; }
      const user = appState.users.find(u => u.email === email);
      if (!user) { error.textContent = 'No account found for this email'; return; }
      if (user.password !== password) {
        error.textContent = 'Wrong password';
        $('signin-password').value = '';
        $('signin-password').focus();
        return;
      }
      appState.currentUserEmail = email;
      $('signin-screen').classList.add('hidden');
      $('signin-screen').classList.remove('flex');
      $('role-select').value = user.roles[0];
      setRole(user.roles[0]);
      logActivity(`${user.name} signed in`);
      if (user.usingDefault) notify('You are using the default password. Please change it with the key icon.', 'info');
      renderUserChip();
      // Signing in opens the MR11 Master Schedule first
      if (tabAllowed(9)) switchTab(9);
    }
    function openPasswordModal() {
      ['pw-current', 'pw-new', 'pw-confirm'].forEach(id => { $(id).value = ''; });
      $('pw-error').textContent = '';
      $('password-modal').classList.remove('hidden');
      $('password-modal').classList.add('flex');
      $('pw-current').focus();
    }
    function closePasswordModal() {
      $('password-modal').classList.add('hidden');
      $('password-modal').classList.remove('flex');
    }
    function submitPasswordChange() {
      const u = currentUser();
      const current = $('pw-current').value, next = $('pw-new').value, confirmValue = $('pw-confirm').value;
      const error = $('pw-error');
      if (current !== u.password) { error.textContent = 'Your current password is not correct.'; return; }
      if (next.length < 8) { error.textContent = 'Your new password needs at least 8 characters.'; return; }
      if (next !== confirmValue) { error.textContent = 'The two new passwords do not match.'; return; }
      if (next === current || next === PROTOTYPE_PASSWORD) { error.textContent = 'It cannot be the same as your current password or the default one.'; return; }
      u.password = next;
      u.usingDefault = false;
      logActivity(`${u.name} changed their password`);
      closePasswordModal();
      renderUserChip();
      notify('Password changed. Use your new password the next time you sign in.', 'success');
    }

    // =========================================================================
    // SHARED REFRESH & START-UP
    // =========================================================================
    function fillRowSelects() {
      const rows = allMr11Rows();
      ['item-row', 'lorry-row'].forEach(id => {
        const el = $(id);
        const current = el.value;
        el.innerHTML = rows.map(r => `<option value="${r.key}">${esc(r.customerProject.trim())}</option>`).join('');
        if (rows.some(r => r.key === current)) el.value = current;
      });
    }
    function refreshAll() {
      if (!appState.ready) return;
      fillRowSelects();
      renderBdWarnings();
      renderNca();
      renderFinance();
      renderShellHistory();
      renderApprovalHistory();
      renderItems();
      renderCapacity();
      renderPanels();
      renderSeriesHistory();
      renderYardEvidence();
      renderGate6Cards();
      renderLorries();
      renderEtdLog();
      renderMonthlyDispatch();
      renderSite();
      renderIncidents();
      renderMarket();
      // The two heaviest views are drawn only while their page is open; switchTab draws them on arrival
      if (appState.activeTab === 9) renderMR11PipelineTab();
      renderNotes();
      renderReminders();
      renderAlerts();
      renderApprovals();
      renderValidation();
      renderReports();
      if (appState.activeTab === 15) renderCeo();
      renderAdminUsers();
      renderWorkbook();
      renderUserChip();
      applyRoleNav();
      if (typeof renderFeatures === 'function') renderFeatures();
      if (appState.mobileScreen === 'home' || appState.activeTab !== 13) renderMobile();
      refreshIcons();
    }
    // Every saved change to an online form is logged with who changed what, and the old and new values
    function watchFormChanges() {
      document.addEventListener('focusin', e => { if (e.target.matches?.('input, select, textarea')) e.target.dataset.prev = e.target.value; });
      document.addEventListener('change', e => {
        const el = e.target;
        if (!el.id || el.type === 'file' || el.type === 'checkbox' || !el.closest('.step-panel') || el.closest('#step-panel-14') || el.closest('#step-panel-10') || el.closest('#step-panel-13') || el.closest('#step-panel-15') || el.closest('#step-panel-16') || el.closest('#step-panel-17') || el.closest('#step-panel-18') || el.closest('#step-panel-19')) return;
        if (el.dataset.prev === undefined || el.dataset.prev === el.value) return;
        const label = el.closest('div')?.querySelector('label')?.textContent?.trim() || el.getAttribute('aria-label') || el.placeholder || el.id;
        logActivity(`${label}: "${el.dataset.prev}" to "${el.value}"`);
        el.dataset.prev = el.value;
        refreshAll();
      });
    }

    function resetAllDemoData() {
      try { localStorage.removeItem('mr11.zoom'); localStorage.removeItem('mr11.hiddenGroups'); } catch {}
      location.reload();
    }

    // Initialize on load
    function pinMenuOnly() {
      const header = document.querySelector('header');
      const bar = document.getElementById('step-bar');
      if (!header || !bar) return;
      const menu = [...header.children].find(c => c.contains(bar)) || bar;
      header.style.top = `${-Math.round(menu.getBoundingClientRect().top - header.getBoundingClientRect().top)}px`;
    }
    window.addEventListener('DOMContentLoaded', () => {
      pinMenuOnly();
      if (window.ResizeObserver) new ResizeObserver(pinMenuOnly).observe(document.querySelector('header'));
      window.addEventListener('resize', pinMenuOnly);
    });
    window.addEventListener('DOMContentLoaded', () => {
      $('role-select').innerHTML = Object.entries(ROLES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
      const deptOptions = DEPT_KEYS.map(k => `<option value="${k}">${ROLES[k]}</option>`).join('');
      $('reminder-filter').innerHTML = `<option value="">All departments</option>${deptOptions}`;
      $('rem-dept').innerHTML = deptOptions;
      propagateBDData();
      renderForecastInputs();
      recalculateCommercial();
      validateShellPlanSchedule();
      validateDesignSchedule();
      appState.lorrySeq = 1;
      appState.users.forEach(u => Object.assign(u, { password: PROTOTYPE_PASSWORD, usingDefault: true }));
      appState.hiddenGroups = loadPref('mr11.hiddenGroups', []);
      appState.mr11Zoom = loadPref('mr11.zoom', 100);
      generateReport('Automatic, Monday', '2026-11-16');
      appState.activity.shift();
      appState.ready = true;
      renderRules();
      refreshAll();
      watchFormChanges();
      wireChartTips();
      refreshIcons();
    });
  