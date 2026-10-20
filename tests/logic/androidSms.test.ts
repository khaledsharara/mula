/**
 * Android SMS capture, JS side: which senders the receiver listens to, how permission answers
 * are read, and that what the Kotlin receiver writes is understood by the queue drain.
 */
import { BANK_SENDERS } from '@/modules/banks';
import { permissionState, senderList } from '@/modules/integrations/utils/androidSms';
import { parseQueuedIntent } from '@/modules/integrations/utils/intentQueue';
import { parseBankSms } from '@/modules/inbox/utils/parser';

import { CIB_SMS } from '../fixtures/banks';

describe('senderList', () => {
  it('starts with every known bank sender', () => {
    expect(senderList()).toEqual([...BANK_SENDERS]);
  });

  it('adds extra senders once, ignoring case and spaces', () => {
    const list = senderList(['  MyBank ', 'cib', 'MYBANK', '']);
    expect(list.filter((s) => s.toLowerCase() === 'mybank')).toEqual(['MyBank']);
    expect(list.filter((s) => s.toLowerCase() === 'cib')).toHaveLength(1);
    expect(list).not.toContain('');
  });
});

describe('permissionState', () => {
  it('is granted only when every SMS permission is', () => {
    expect(permissionState({ a: 'granted', b: 'granted' })).toBe('granted');
    expect(permissionState({ a: 'granted', b: 'denied' })).toBe('denied');
    expect(permissionState({ a: 'never_ask_again', b: 'denied' })).toBe('blocked');
    expect(permissionState({})).toBe('denied');
  });
});

describe('queued message from the Android receiver', () => {
  it('drains like a Shortcuts message and parses with its sender', () => {
    // The exact shape SmsQueue.kt writes (org.json: numbers stay numbers, Arabic text as is).
    const file = JSON.stringify({ kind: 'sms', text: CIB_SMS.card, sender: 'CIB', receivedAt: 1_787_000_000_000 });
    const intent = parseQueuedIntent(file, 0);
    expect(intent).toEqual({ kind: 'sms', text: CIB_SMS.card.trim(), sender: 'CIB', receivedAt: 1_787_000_000_000 });
    if (intent?.kind !== 'sms') throw new Error('expected an SMS');
    expect(parseBankSms(intent.text, intent.receivedAt, { sender: intent.sender })).toMatchObject({ status: 'transaction', parsed: { amount: 23456, last4: '9002' } });
  });
});
