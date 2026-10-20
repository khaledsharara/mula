/**
 * Stamps a release version into app.json before a build:
 *   node scripts/set-version.mjs 1.2.0 57
 * sets expo.version (what people see) and the build number both stores compare (iOS buildNumber,
 * Android versionCode), which must grow with every release.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [version, build] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version ?? '') || !/^\d+$/.test(build ?? '')) {
  console.error('Usage: node scripts/set-version.mjs <major.minor.patch> <build number>');
  process.exit(1);
}

const file = new URL('../app.json', import.meta.url);
const app = JSON.parse(readFileSync(file, 'utf8'));
app.expo.version = version;
app.expo.ios = { ...app.expo.ios, buildNumber: build };
app.expo.android = { ...app.expo.android, versionCode: Number(build) };
writeFileSync(file, `${JSON.stringify(app, null, 2)}\n`);
console.log(`Mula ${version} (build ${build})`);
