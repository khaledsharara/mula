/**
 * Renders the Review inbox widget the way the iOS widget extension does, without a Mac:
 * builds Expo Widgets' JS runtime, compiles our widget file with the app's Babel config, then
 * evaluates both in a bare JS context and calls the render entry point for every family.
 *
 *   node scripts/check-widget.mjs
 *
 * Fails on any exception (e.g. a name the widget runtime doesn't provide) or an empty tree.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const widgetsDir = require('node:path').dirname(require.resolve('expo-widgets/package.json'));
const runtimePath = `${widgetsDir}/bundle/build/ExpoWidgets.bundle`;

if (!existsSync(runtimePath) || process.argv.includes('--rebuild')) {
  execFileSync(process.execPath, [`${widgetsDir}/scripts/build-bundle.mjs`, root], { stdio: 'inherit', cwd: root });
}

// The widget function as the app bundle carries it: a string produced by babel-preset-expo.
const babel = require('@babel/core');
const file = `${root}src/modules/integrations/widgets/ReviewInboxWidget.tsx`;
const { code } = babel.transformFileSync(file, { cwd: root, filename: file, caller: { name: 'metro', platform: 'ios', bundler: 'metro' } });
// Run the compiled module with a stand-in createWidget that keeps the layout string.
const layouts = {};
const fakeRequire = (id) =>
  id === 'expo-widgets'
    ? {
        createWidget: (name, layout) => {
          layouts[name] = layout;
          return {};
        },
      }
    : {};
const module = { exports: {} };
vm.runInNewContext(`(function (exports, require, module) {\n${code}\n})`, {})(module.exports, fakeRequire, module);
const layout = layouts.ReviewInbox;
if (typeof layout !== 'string') throw new Error('The widget layout was not compiled to a string (is the "widget" directive missing?)');

const context = vm.createContext({ console });
vm.runInContext(readFileSync(runtimePath, 'utf8'), context);
context.__expoWidgetLayout = vm.runInContext(`(${layout})`, context);

const families = ['systemSmall', 'systemMedium', 'accessoryRectangular', 'accessoryCircular'];
const cases = {
  empty: { count: 0, oldest: 0, items: [] },
  busy: {
    count: 5,
    oldest: Date.now() - 3 * 3_600_000,
    items: [
      { title: 'Talabat', amount: 'EGP 123.45' },
      { title: 'InstaPay sent', amount: 'EGP 850.00' },
      { title: 'Nour Test', amount: 'EGP 300.00' },
    ],
  },
};

let failures = 0;
for (const [name, props] of Object.entries(cases)) {
  for (const family of families) {
    for (const colorScheme of ['light', 'dark']) {
      try {
        const tree = context.__expoWidgetRender(props, { widgetFamily: family, colorScheme, timestamp: Date.now() });
        const json = JSON.stringify(tree);
        if (!tree || json.length < 20) throw new Error('empty tree');
        if (family.startsWith('system') && !json.includes('containerBackground')) throw new Error('no container background');
        if (!json.includes('widgetURL')) throw new Error('no tap target');
        console.log(`ok   ${name} ${family} ${colorScheme} (${json.length} bytes)`);
      } catch (e) {
        failures++;
        console.log(`FAIL ${name} ${family} ${colorScheme}: ${e?.message ?? e}`);
      }
    }
  }
}
process.exit(failures ? 1 : 0);
