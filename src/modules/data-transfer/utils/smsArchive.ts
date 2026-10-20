import Papa from 'papaparse';

import { isBankSender } from '../../banks';
import { isHoldReversal } from '../../inbox/utils/matching';
import { parseBankSms, suggestPayeeName } from '../../inbox/utils/parser';
import type { ParsedMessage } from '../../shared/db/types';
import { normalizeRaw } from '../../shared/utils/text';

/**
 * Reads a message-history export (columns chat, datetime, direction, sender, …, text, guid),
 * keeps the bank's received messages, and parses each into a transaction candidate.
 */

export type ArchiveCandidate = {
  ref: string;
  parsed: ParsedMessage;
  /** Normalized bank name used for grouping and aliases ("" for ATM/deposits/InstaPay out). */
  groupKey: string;
  displayName: string | null;
};

export type ArchiveScan = {
  totalMessages: number;
  candidates: ArchiveCandidate[];
  ignored: number;
  holdsRemoved: number;
  firstDate: number | null;
  lastDate: number | null;
};

export function scanArchive(text: string, opts: { from?: number | null } = {}): ArchiveScan {
  const { data } = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), { header: true, skipEmptyLines: true });
  const parsed: ArchiveCandidate[] = [];
  let ignored = 0;
  for (const [i, row] of data.entries()) {
    if (row.direction && row.direction !== 'received') continue;
    const sender = (row.sender ?? row.chat ?? '').trim();
    if (sender && !isBankSender(sender)) continue;
    const at = Date.parse((row.datetime ?? '').replace(' ', 'T'));
    const r = parseBankSms(row.text ?? '', Number.isFinite(at) ? at : Date.now(), { sender });
    if (r.status !== 'transaction') {
      ignored++;
      continue;
    }
    if (opts.from && (r.parsed.occurredAt ?? 0) < opts.from) continue;
    const name = r.parsed.kind === 'atm_withdrawal' || r.parsed.kind === 'cash_deposit' || r.parsed.kind === 'instapay_out' ? null : r.parsed.counterparty;
    parsed.push({
      ref: `archive:${row.guid || `${row.datetime}|${i}`}`,
      parsed: r.parsed,
      groupKey: name ? normalizeRaw(name) : '',
      displayName: name ? suggestPayeeName(name) : null,
    });
  }

  // Drop card holds that were reversed minutes later.
  parsed.sort((a, b) => (a.parsed.occurredAt ?? 0) - (b.parsed.occurredAt ?? 0));
  const drop = new Set<number>();
  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i].parsed.kind !== 'refund' || drop.has(i)) continue;
    for (let j = i - 1; j >= 0 && (parsed[i].parsed.occurredAt ?? 0) - (parsed[j].parsed.occurredAt ?? 0) <= 30 * 60_000; j--) {
      if (!drop.has(j) && isHoldReversal(parsed[j].parsed, parsed[i].parsed)) {
        drop.add(i);
        drop.add(j);
        break;
      }
    }
  }
  const candidates = parsed.filter((_, i) => !drop.has(i));
  const dates = candidates.map((c) => c.parsed.occurredAt ?? 0).filter(Boolean);
  return {
    totalMessages: data.length,
    candidates,
    ignored,
    holdsRemoved: drop.size,
    firstDate: dates.length ? Math.min(...dates) : null,
    lastDate: dates.length ? Math.max(...dates) : null,
  };
}

export type MerchantGroup = { key: string; name: string; count: number; total: number; kinds: Set<string> };

/** Groups candidates by merchant/sender so one category choice covers many records. */
export function groupByMerchant(candidates: ArchiveCandidate[]): MerchantGroup[] {
  const map = new Map<string, MerchantGroup>();
  for (const c of candidates) {
    if (!c.groupKey) continue;
    const g = map.get(c.groupKey) ?? { key: c.groupKey, name: c.displayName ?? c.groupKey, count: 0, total: 0, kinds: new Set<string>() };
    g.count++;
    g.total += c.parsed.amount;
    g.kinds.add(c.parsed.kind);
    map.set(c.groupKey, g);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
