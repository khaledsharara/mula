// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // relay/ is a separate Cloudflare Worker project with its own TypeScript setup.
    ignores: ['dist/*', '.expo/*', 'tests/e2e/output/*', 'relay/**', 'ios/**', 'android/**'],
  },
  {
    // The React Compiler is off (it conflicts with NativeWind's className handling), so the
    // compiler-oriented purity rules are advisory here: screens read `Date.now()` to label
    // "today" and sync some local state in effects on purpose.
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
]);
