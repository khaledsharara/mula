import { BANKS, banksFor, bankForSender, isBankSender } from '@/modules/banks';
import { normalizeDigits } from '@/modules/banks/utils/patterns';
import { isHoldReversal, isSamePayment, parseWalletTransaction, dedupeKey } from '@/modules/inbox/utils/matching';
import { parseBankSms, suggestPayeeName } from '@/modules/inbox/utils/parser';
import type { ParsedMessage } from '@/modules/shared/db/types';

import { BANK_FIXTURES, CIB_SMS as SMS, GENERIC_SMS } from '../fixtures/banks';

function tx(text: string, sender?: string): ParsedMessage {
  const r = parseBankSms(text, new Date(2026, 7, 20, 23, 0).getTime(), { sender });
  if (r.status !== 'transaction') throw new Error(`expected a transaction, got ${r.status}`);
  return r.parsed;
}

describe('parseBankSms (CIB)', () => {
  it('reads an outgoing InstaPay transfer (no name, no fee in the SMS)', () => {
    const p = tx(SMS.instapayOut);
    expect(p).toMatchObject({ kind: 'instapay_out', amount: 75000, currency: 'EGP', last4: '9001', reference: 'a1b2c3d4', counterparty: null });
    expect(new Date(p.occurredAt!)).toEqual(new Date(2026, 7, 20, 17, 10));
  });

  it('reads an incoming InstaPay transfer with the sender name', () => {
    expect(tx(SMS.instapayIn)).toMatchObject({ kind: 'instapay_in', amount: 12000, counterparty: 'NOUR TEST PERSON', last4: '9001', reference: 'b2c3d4e5' });
  });

  it('reads Apple Pay with merchant, time and run-together balance', () => {
    const p = tx(SMS.applePay);
    expect(p).toMatchObject({ kind: 'applepay_purchase', amount: 12345, currency: 'EGP', last4: '9002', counterparty: 'Talabat', balance: 123456, balanceCurrency: 'EGP' });
    expect(new Date(p.occurredAt!)).toEqual(new Date(2026, 7, 20, 22, 31));
  });

  it('reads Apple Pay in dollars', () => {
    expect(tx(SMS.applePayUsd)).toMatchObject({ amount: 1234, currency: 'USD', last4: '9003', balance: 43210, balanceCurrency: 'USD' });
  });

  it('reads a card purchase with the balance written after the amount', () => {
    expect(tx(SMS.card)).toMatchObject({ kind: 'card_purchase', amount: 23456, counterparty: 'Uber', balance: 9876, balanceCurrency: 'EGP' });
  });

  it('keeps a foreign charge in its own currency', () => {
    expect(tx(SMS.cardForeign)).toMatchObject({ kind: 'card_purchase', amount: 45000, currency: 'INR', last4: '9003', balanceCurrency: 'USD' });
  });

  it('reads ATM withdrawals and cash deposits', () => {
    expect(tx(SMS.atm)).toMatchObject({ kind: 'atm_withdrawal', amount: 50000, counterparty: 'SAMPLE ATM', balance: 76543 });
    expect(tx(SMS.deposit)).toMatchObject({ kind: 'cash_deposit', amount: 60000, counterparty: 'CIB Example Branch', balance: 432109 });
  });

  it('reads all three refund formats', () => {
    expect(tx(SMS.holdReversal)).toMatchObject({ kind: 'refund', amount: 500, counterparty: 'Uber', balance: 33833 });
    expect(tx(SMS.refundOrder)).toMatchObject({ kind: 'refund', amount: 21000, counterparty: 'SAMPLE MARKETPLACE ONLINE 00X', last4: '9002' });
    expect(tx(SMS.refundApplePay)).toMatchObject({ kind: 'refund', amount: 18765, counterparty: 'Breadfast', balance: 87654 });
  });

  it('ignores declines, codes and marketing', () => {
    expect(parseBankSms(SMS.declined)).toEqual({ status: 'ignored', reason: 'declined' });
    expect(parseBankSms(SMS.otp)).toEqual({ status: 'ignored', reason: 'otp' });
    expect(parseBankSms(SMS.marketing)).toMatchObject({ status: 'ignored' });
    expect(parseBankSms(SMS.cardAdded)).toMatchObject({ status: 'ignored' });
  });

  it('accepts Arabic-Indic digits', () => {
    const arabic = SMS.card.replace('234.56', '٢٣٤.٥٦');
    expect(tx(arabic).amount).toBe(23456);
  });

  it('reads the same message the same way with or without the sender', () => {
    expect(tx(SMS.card, 'CIB')).toEqual(tx(SMS.card));
    expect(tx(SMS.card, 'Some other sender')).toEqual(tx(SMS.card));
  });
});

describe('parseBankSms (generic English)', () => {
  it('reads card payments and InstaPay in English', () => {
    expect(tx(GENERIC_SMS.card)).toMatchObject({ kind: 'card_purchase', amount: 12345, currency: 'EGP', last4: '9002', counterparty: 'SAMPLE MARKET' });
    expect(tx(GENERIC_SMS.instapayOut)).toMatchObject({ kind: 'instapay_out', amount: 75000, last4: '9001' });
    expect(tx(GENERIC_SMS.instapayIn)).toMatchObject({ kind: 'instapay_in', amount: 12000, last4: '9001', counterparty: 'NOUR TEST PERSON' });
  });
});

describe('bank registry', () => {
  it('knows each bank’s senders, ignoring case and spaces', () => {
    expect(bankForSender('CIB')?.id).toBe('cib');
    expect(bankForSender(' cib eg ')?.id).toBe('cib');
    expect(isBankSender('CIBX')).toBe(false);
    expect(isBankSender(null)).toBe(false);
  });

  it('tries the sender’s bank first', () => {
    expect(banksFor('CIB')[0].id).toBe('cib');
    expect(banksFor('unknown').map((b) => b.id)).toEqual(BANKS.map((b) => b.id));
  });

  it('has unique ids and senders', () => {
    const ids = BANKS.map((b) => b.id);
    const senders = BANKS.flatMap((b) => b.senders.map((s) => s.toLowerCase()));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(senders).size).toBe(senders.length);
  });

  it.each(BANKS.map((b) => [b.id, b] as const))('%s: its example message parses', (_id, bank) => {
    expect(parseBankSms(bank.example, Date.now(), { sender: bank.senders[0] }).status).toBe('transaction');
  });

  it.each(BANKS.map((b) => [b.id, b] as const))('%s: every template has a fixture that matches it', (id, bank) => {
    const samples = Object.values(BANK_FIXTURES[id] ?? {}).map((t) => normalizeDigits(t).replace(/ /g, ' '));
    bank.templates.forEach((t, i) => {
      expect({ template: i, kind: t.kind, covered: samples.some((s) => t.regex.test(s)) }).toEqual({ template: i, kind: t.kind, covered: true });
    });
  });
});

describe('matching', () => {
  it('pairs a card hold with its reversal minutes later', () => {
    const charge = tx(SMS.cardHold);
    const refund = { ...tx(SMS.holdReversal), occurredAt: charge.occurredAt! + 5 * 60_000 };
    expect(isHoldReversal(charge, refund)).toBe(true);
    expect(isHoldReversal(tx(SMS.card), refund)).toBe(false);
  });

  it('merges an Apple Pay automation entry with the bank SMS for the same payment', () => {
    const sms = tx(SMS.applePay);
    const wallet = parseWalletTransaction({ amount: 'EGP 123.45', merchant: 'Talabat', card: 'CIB ••9002' }, sms.occurredAt! + 60_000)!;
    expect(wallet).toMatchObject({ amount: 12345, currency: 'EGP', last4: '9002' });
    expect(isSamePayment(sms, wallet)).toBe(true);
    expect(isSamePayment(sms, { ...wallet, occurredAt: sms.occurredAt! + 30 * 60_000 })).toBe(false);
  });

  it('gives the same SMS the same dedupe key', () => {
    const a = tx(SMS.instapayOut);
    expect(dedupeKey(a, 'sms', SMS.instapayOut)).toBe(dedupeKey(tx(SMS.instapayOut), 'sms', SMS.instapayOut));
    expect(dedupeKey(tx(SMS.card), 'sms', SMS.card)).not.toBe(dedupeKey(tx(SMS.cardHold), 'sms', SMS.cardHold));
  });
});

describe('suggestPayeeName', () => {
  it('drops payment gateways and store numbers', () => {
    expect(suggestPayeeName('PAYMOB  Sample Coffee Co')).toBe('Sample Coffee Co');
    expect(suggestPayeeName('SAMPLE DONUTS  100200')).toBe('Sample Donuts');
    expect(suggestPayeeName('PAYTABS SampleShop')).toBe('SampleShop');
    expect(suggestPayeeName('Talabat')).toBe('Talabat');
    expect(suggestPayeeName('NOUR TEST PERSON')).toBe('Nour Test Person');
  });
});
