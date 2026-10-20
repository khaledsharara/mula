/**
 * Fails when a built JS bundle carries someone's personal relay setup. Public releases must start
 * empty: everyone enters their own relay address and token in the app.
 *   node scripts/check-public-bundle.mjs path/to/main.jsbundle
 * Checks for any *.workers.dev address other than the placeholder shown in the app.
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/check-public-bundle.mjs <bundle>');
  process.exit(1);
}

const PLACEHOLDERS = new Set(['mula-relay.you.workers.dev']);
const text = readFileSync(file).toString('latin1');
const hosts = new Set([...text.matchAll(/[a-z0-9][a-z0-9.-]*\.workers\.dev/gi)].map((m) => m[0].toLowerCase()));
const personal = [...hosts].filter((h) => !PLACEHOLDERS.has(h));

if (personal.length) {
  console.error(`::error::The bundle contains a relay address (${personal.join(', ')}). Build without EXPO_PUBLIC_MULA_* variables or .env.local.`);
  process.exit(1);
}
console.log(`OK: no personal relay settings in ${file}`);
