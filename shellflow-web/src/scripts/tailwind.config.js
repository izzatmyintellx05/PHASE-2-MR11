
    // ShellFlow design system: Fair-Face Concrete.
    // Every Tailwind colour used in the page maps onto one of four material ramps, so the
    // whole app follows this file. Greys, blues and violets are concrete (light) to formwork
    // steel (dark); green and teal are verdigris, the one accent (actions, selection, met);
    // amber is ochre (waiting) and red is iron oxide (critical).
    (function () {
      const concrete = { 50: '#FAFAF9', 100: '#F4F4F2', 200: '#E7E7E3', 300: '#D4D4CF', 400: '#A3A39C', 500: '#6B6C66', 600: '#52534D', 700: '#3A3B36', 800: '#262723', 900: '#1C1D1A', 950: '#121310' };
      const verdigris = { 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399', 500: '#10B981', 600: '#059669', 700: '#047857', 800: '#065F46', 900: '#064E3B', 950: '#022C22' };
      const ochre = { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B', 600: '#B45309', 700: '#92400E', 800: '#78350F', 900: '#5C2A0C', 950: '#3A1A06' };
      const oxide = { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#F87171', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D', 950: '#450A0A' };
      window.SF_RAMPS = { concrete, verdigris, ochre, oxide };
      window.tailwind = window.tailwind || {};
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              white: '#FFFFFF',
              slate: concrete, gray: concrete, zinc: concrete, neutral: concrete, stone: concrete,
              emerald: verdigris, green: verdigris, teal: verdigris, lime: verdigris,
              sky: concrete, blue: concrete, cyan: concrete, indigo: concrete, violet: concrete, purple: concrete, fuchsia: concrete,
              amber: ochre, yellow: ochre, orange: ochre,
              rose: oxide, red: oxide, pink: oxide
            },
            fontFamily: {
              sans: ['Inter', 'system-ui', 'sans-serif'],
              mono: ['Inter', 'system-ui', 'sans-serif']
            },
            borderRadius: { sm: '4px', DEFAULT: '6px', md: '6px', lg: '8px', xl: '10px', '2xl': '12px', '3xl': '14px' },
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
