/**
 * Turns `wrangler deploy --dry-run --outdir <bundle>` output into a self-contained Worker project
 * for the "Deploy to Cloudflare" button (which needs everything inside one folder; the relay
 * normally pulls in the app's code from ../src). The relay-bundle workflow pushes the result to
 * the relay-deploy branch.
 *
 *   node scripts/make-deploy-bundle.mjs <bundle dir> <output dir>
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [bundleDir, outDir] = process.argv.slice(2);
if (!bundleDir || !outDir) {
  console.error('Usage: node scripts/make-deploy-bundle.mjs <bundle dir> <output dir>');
  process.exit(1);
}

const relayDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const deployDir = join(relayDir, 'deploy');

/** wrangler.jsonc without comments (none of its strings contain "//"). */
const config = JSON.parse(
  readFileSync(join(relayDir, 'wrangler.jsonc'), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n'),
);
const relayPkg = JSON.parse(readFileSync(join(relayDir, 'package.json'), 'utf8'));

mkdirSync(outDir, { recursive: true });
copyFileSync(join(bundleDir, 'index.js'), join(outDir, 'index.js'));

const { alias: _alias, $schema: _schema, ...rest } = config;
const wrangler = { $schema: 'node_modules/wrangler/config-schema.json', ...rest, main: 'index.js' };
writeFileSync(
  join(outDir, 'wrangler.jsonc'),
  `// Built from the Mula repository (relay/). Edit the source there, not this file.\n${JSON.stringify(wrangler, null, 2)}\n`,
);

const pkg = JSON.parse(readFileSync(join(deployDir, 'package.json'), 'utf8'));
pkg.version = relayPkg.version;
pkg.devDependencies = { wrangler: relayPkg.devDependencies.wrangler };
writeFileSync(join(outDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);

for (const name of readdirSync(deployDir)) {
  if (name !== 'package.json') copyFileSync(join(deployDir, name), join(outDir, name));
}
console.log(`Deploy bundle written to ${outDir}`);
