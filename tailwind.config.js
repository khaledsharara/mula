/** Colors resolve to CSS variables set by ThemeProvider (src/modules/shared/theme), so every
 * class works in light and dark mode without `dark:` variants. */
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        sheet: token('sheet'),
        sunk: token('sunk'),
        ink: token('ink'),
        graphite: token('graphite'),
        mist: token('mist'),
        hairline: token('hairline'),
        accent: token('accent'),
        'accent-soft': token('accent-soft'),
        'on-accent': token('on-accent'),
        income: token('income'),
        alert: token('alert'),
        'alert-soft': token('alert-soft'),
        danger: token('danger'),
      },
      fontFamily: {
        light: ['HostGrotesk_300Light'],
        regular: ['HostGrotesk_400Regular'],
        medium: ['HostGrotesk_500Medium'],
        semibold: ['HostGrotesk_600SemiBold'],
        bold: ['HostGrotesk_700Bold'],
      },
      fontSize: {
        hero: ['56px', { lineHeight: '60px', letterSpacing: '-1.6px' }],
        display: ['34px', { lineHeight: '40px', letterSpacing: '-0.8px' }],
        title: ['26px', { lineHeight: '32px', letterSpacing: '-0.4px' }],
        heading: ['19px', { lineHeight: '24px', letterSpacing: '-0.2px' }],
        body: ['16px', { lineHeight: '22px' }],
        label: ['14px', { lineHeight: '19px' }],
        caption: ['12.5px', { lineHeight: '16px' }],
      },
      borderRadius: {
        field: '14px',
        tile: '12px',
        sheet: '28px',
      },
    },
  },
  plugins: [],
};
