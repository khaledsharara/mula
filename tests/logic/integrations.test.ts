import { parseWalletAmount, parseWalletTransaction } from '@/modules/inbox/utils/matching';
import { parseQueuedIntent } from '@/modules/integrations/utils/intentQueue';
import { compactNumber, formatMoney, parseAmount } from '@/modules/shared/utils/money';

describe('Shortcuts queue files', () => {
  const now = 1_760_000_000_000;

  it('reads a bank SMS', () => {
    expect(parseQueuedIntent('{"kind":"sms","text":" تم خصم EGP 50 ","sender":"CIB","receivedAt":1760000000123}', now)).toEqual({
      kind: 'sms',
      text: 'تم خصم EGP 50',
      sender: 'CIB',
      receivedAt: 1760000000123,
    });
  });

  it('reads an Apple Pay payment and treats empty strings as missing', () => {
    expect(parseQueuedIntent('{"kind":"applepay","amount":"EGP 123.45","merchant":"","card":"CIB Debit"}', now)).toEqual({
      kind: 'applepay',
      amount: 'EGP 123.45',
      merchant: null,
      card: 'CIB Debit',
      receivedAt: now,
    });
  });

  it.each([['not json'], ['null'], ['[]'], ['{"kind":"sms","text":"   "}'], ['{"kind":"applepay","amount":""}'], ['{"kind":"other","text":"x"}']])(
    'ignores %s',
    (text) => {
      expect(parseQueuedIntent(text, now)).toBeNull();
    },
  );
});

describe('Wallet amounts', () => {
  it.each([
    ['EGP 123.45', 12345, 'EGP'],
    ['123.45', 12345, 'EGP'],
    ['EGP 1,250.00', 125000, 'EGP'],
    ['1.250,50 E£', 125050, 'EGP'],
    ['١٥٠٫٥٠ ج.م.', 15050, 'EGP'],
    ['$4.99', 499, 'USD'],
    ['USD 14.99', 1499, 'USD'],
    ['€12,50', 1250, 'EUR'],
    ['', 0, 'EGP'],
  ])('%s → %i %s', (raw, amount, currency) => {
    expect(parseWalletAmount(raw)).toEqual({ amount, currency });
  });

  it('keeps card digits, or the card name when there are none', () => {
    expect(parseWalletTransaction({ amount: '50', merchant: 'Talabat', card: 'CIB Debit ••9002' })).toMatchObject({ last4: '9002', accountHint: null });
    expect(parseWalletTransaction({ amount: '50', merchant: 'Talabat', card: 'CIB Debit' })).toMatchObject({ last4: null, accountHint: 'CIB Debit' });
  });
});

describe('amount input', () => {
  it.each([
    ['1,250.5', 125050],
    ['12,50', 1250],
    ['1.250,50', 125050],
    ['1,250', 125000],
    ['١٢٫٥', 1250],
    ['١٢٥٠', 125000],
    ['۱۲۵', 12500],
    [' 99 ', 9900],
  ])('%s → %i', (input, minor) => {
    expect(parseAmount(input)).toBe(minor);
  });

  it.each([['abc'], ['1.2.3'], ['']])('rejects %s', (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe('compact numbers', () => {
  it.each([
    [0, '0'],
    [950, '950'],
    [1200, '1.2K'],
    [12_000, '12K'],
    [123_456, '123.5K'],
    [999_960, '1M'],
    [3_400_000, '3.4M'],
    [2_000_000_000, '2B'],
  ])('%i → %s', (n, text) => {
    expect(compactNumber(n)).toBe(text);
  });

  it('formats compact money with the currency', () => {
    expect(formatMoney(120_000, { compact: true, currency: 'EGP' })).toBe('EGP 1.2K');
  });
});
