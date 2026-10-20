import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { ingestSms, ingestWalletTransaction } from '../../inbox/data/inboxRepo';
import { catchUpSms } from './androidSms';
import { parseQueuedIntent } from './intentQueue';

export type DrainResult = { added: number; skipped: number };

let running: Promise<DrainResult> | null = null;

/**
 * Files everything queued for the inbox: bank SMS and Apple Pay payments from the iPhone Shortcuts
 * actions, and bank SMS caught on Android. Safe to call often: runs one at a time, and the inbox
 * drops duplicates.
 */
export function drainShortcutQueue(): Promise<DrainResult> {
  running ??= drain().finally(() => {
    running = null;
  });
  return running;
}

async function drain(): Promise<DrainResult> {
  const result: DrainResult = { added: 0, skipped: 0 };
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return result;
  // Android: also pick up bank messages that arrived while the receiver couldn't run.
  if (Platform.OS === 'android') await catchUpSms();

  let files: File[];
  try {
    const dir = new Directory(Paths.document, 'intents');
    if (!dir.exists) return result;
    files = dir
      .list()
      .filter((entry): entry is File => entry instanceof File && entry.name.endsWith('.json'))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return result;
  }

  for (const file of files) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      continue;
    }
    const intent = parseQueuedIntent(text, Date.now());
    if (intent) {
      try {
        const r =
          intent.kind === 'sms'
            ? await ingestSms(intent.text, 'sms', intent.receivedAt, intent.sender)
            : await ingestWalletTransaction({ amount: intent.amount, merchant: intent.merchant, card: intent.card }, intent.receivedAt);
        if (r.result === 'added') result.added++;
        else result.skipped++;
      } catch {
        // Keep the file; the next launch tries again.
        continue;
      }
    } else {
      result.skipped++;
    }
    try {
      file.delete();
    } catch {
      // Already gone.
    }
  }
  return result;
}
