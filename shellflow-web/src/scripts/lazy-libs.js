    // =========================================================================
    // The Excel library (SheetJS, about 900 KB) loads the first time someone exports or
    // imports a workbook, instead of with every page. The four functions that use it wait
    // for it; a message says so if it is slow, and an error says what to do if it fails.
    // =========================================================================
    const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    let xlsxLoading = null;
    function loadXLSX() {
      if (window.XLSX) return Promise.resolve();
      if (!xlsxLoading) {
        xlsxLoading = new Promise((done, failed) => {
          const s = document.createElement('script');
          s.src = XLSX_URL;
          s.crossOrigin = 'anonymous';
          s.onload = () => done();
          s.onerror = () => { xlsxLoading = null; s.remove(); failed(new Error('The Excel tools could not load. Check the internet connection and try again.')); };
          document.head.appendChild(s);
        });
      }
      return xlsxLoading;
    }
    ['downloadReport', 'exportMR11Workbook', 'handleWorkbookFile', 'exportMr11View'].forEach(name => {
      const run = window[name];
      if (typeof run !== 'function') return;
      window[name] = function (...args) {
        if (window.XLSX) return run.apply(this, args);
        const slow = setTimeout(() => notify('Loading the Excel tools…', 'info'), 400);
        return loadXLSX()
          .then(() => run.apply(this, args))
          .catch(err => notify(err.message, 'error'))
          .finally(() => clearTimeout(slow));
      };
    });
