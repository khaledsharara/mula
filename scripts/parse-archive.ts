/**
 * Runs the SMS parser over an exported message archive and prints coverage counts.
 * The archive stays where it is; only counts and digit-masked snippets are printed.
 *
 *   node scripts/parse-archive.ts path/to/messages.csv
 */
import { readFileSync } from 'node:fs';
import Papa from 'papaparse';

import { parseBankSms } from '../src/modules/inbox/utils/parser.ts';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/parse-archive.ts path/to/messages.csv');
  process.exit(1);
}
const csv = readFileSync(file, 'utf8');
const { data } = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });

const mask = (s: string) => s.replace(/[0-9٠-٩]/g, '#').replace(/\s+/g, ' ').slice(0, 110);

const counts: Record<string, number> = {};
const unrecognized: string[] = [];
const generic: string[] = [];
const missingCounterparty: string[] = [];
let received = 0;

for (const row of data) {
  if (row.direction && row.direction !== 'received') continue;
  received++;
  const ts = Date.parse(row.datetime?.replace(' ', 'T') ?? '') || Date.now();
  const r = parseBankSms(row.text ?? '', ts, { sender: (row.sender ?? row.chat ?? '').trim() || null });
  const key = r.status === 'transaction' ? `tx:${r.parsed.kind}` : r.status === 'ignored' ? `ignored:${r.reason}` : 'unrecognized';
  counts[key] = (counts[key] ?? 0) + 1;
  if (r.status === 'unrecognized') unrecognized.push(mask(row.text));
  if (r.status === 'transaction') {
    if (r.parsed.kind.startsWith('unknown')) generic.push(mask(row.text));
    const needsName = ['card_purchase', 'applepay_purchase', 'atm_withdrawal', 'refund', 'cash_deposit'].includes(r.parsed.kind);
    if (needsName && !r.parsed.counterparty) missingCounterparty.push(mask(row.text));
    if (!r.parsed.last4) missingCounterparty.push(`[no last4] ${mask(row.text)}`);
  }
}

console.log(`received messages: ${received}`);
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(28)} ${v}`);
const show = (title: string, list: string[]) => {
  console.log(`\n${title}: ${list.length}`);
  for (const s of [...new Set(list)].slice(0, 15)) console.log(`  - ${s}`);
};
show('generic fallback (template gap)', generic);
show('unrecognized', unrecognized);
show('missing counterparty/last4', missingCounterparty);
