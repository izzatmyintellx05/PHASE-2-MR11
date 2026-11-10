
    // ShellFlow design system: Fair-Face Concrete.
    // Every Tailwind colour used in the page maps onto one of four material ramps, so the
    // whole app follows this file. Greys, blues and violets are concrete (light) to formwork
    // steel (dark); green and teal are verdigris, the one accent (actions, selection, met);
    // amber is ochre (waiting) and red is iron oxide (critical).
    (function () {
      const concrete = { 50: '#F7F6F3', 100: '#F1F0EC', 200: '#E4E2DD', 300: '#CFCCC5', 400: '#A6A39C', 500: '#6B6863', 600: '#55534E', 700: '#3A3D40', 800: '#2C2E30', 900: '#1C1C1A', 950: '#111212' };
      const verdigris = { 50: '#EEF5F2', 100: '#DCE8E4', 200: '#BCD5CD', 300: '#B3D4CA', 400: '#8FBFB1', 500: '#4A8373', 600: '#2F6B5E', 700: '#275A4F', 800: '#1F4840', 900: '#183932', 950: '#0E2420' };
      const ochre = { 50: '#FBF5EA', 100: '#F5E8CF', 200: '#EBD2A3', 300: '#DDB571', 400: '#CC9443', 500: '#B87B22', 600: '#A86A12', 700: '#8A560E', 800: '#6B430D', 900: '#52340C', 950: '#2F1E07' };
      const oxide = { 50: '#FBF1EF', 100: '#F5DEDA', 200: '#EBBCB4', 300: '#DD9488', 400: '#CB6A5C', 500: '#B9493B', 600: '#A8322A', 700: '#8C2822', 800: '#6F201C', 900: '#561A17', 950: '#300D0B' };
      window.SF_RAMPS = { concrete, verdigris, ochre, oxide };
      window.tailwind = window.tailwind || {};
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              white: '#FCFCFA',
              slate: concrete, gray: concrete, zinc: concrete, neutral: concrete, stone: concrete,
              emerald: verdigris, green: verdigris, teal: verdigris, lime: verdigris,
              sky: concrete, blue: concrete, cyan: concrete, indigo: concrete, violet: concrete, purple: concrete, fuchsia: concrete,
              amber: ochre, yellow: ochre, orange: ochre,
              rose: oxide, red: oxide, pink: oxide
            },
            fontFamily: {
              sans: ['"Albert Sans"', 'system-ui', 'sans-serif'],
              mono: ['"Albert Sans"', 'system-ui', 'sans-serif']
            },
            borderRadius: { sm: '2px', DEFAULT: '3px', md: '3px', lg: '3px', xl: '4px', '2xl': '5px', '3xl': '6px' },
            boxShadow: {
              xs: '0 1px 1px rgba(28, 28, 26, 0.04)',
              sm: '0 1px 2px rgba(28, 28, 26, 0.06)',
              DEFAULT: '0 1px 3px rgba(28, 28, 26, 0.08)',
              md: '0 4px 10px -4px rgba(28, 28, 26, 0.16)',
              lg: '0 10px 24px -10px rgba(28, 28, 26, 0.24)',
              xl: '0 18px 36px -16px rgba(28, 28, 26, 0.3)',
              '2xl': '0 28px 56px -24px rgba(28, 28, 26, 0.38)'
            }
          }
        }
      };
    })();
