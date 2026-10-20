import type { BankDefinition } from '../types';
import { BALANCE, CCY, DMY2, DMY4, ENDING, HM, LAST4, NUM, balance, clean, dateOnly, dt2, dt4, re, toMinorText } from '../utils/patterns';

/**
 * CIB (Commercial International Bank, Egypt) SMS alerts, mostly Arabic. Each regex tolerates the
 * double spaces, tatweel ("بـ") and run-together text CIB sends. The examples above each template
 * are made up but keep CIB's exact wording and spacing; tests/fixtures/banks/cib.ts has one per template.
 */
export const CIB: BankDefinition = {
  id: 'cib',
  name: 'CIB',
  country: 'EG',
  senders: ['CIB', 'CIB OTP', 'CIB VOUCHER', 'CIBEG', 'CIB EG'],
  templates: [
    {
      // يرجى العلم انه تم تنفيذ تحويل لحظي بمبلغ 750.00 جم من حسابك المنتهي بـ ****9001 برقم مرجعي a1b2c3d4 بتاريخ 20-08-2026 17:10
      kind: 'instapay_out',
      regex: re(`تحويل لحظي بمبلغ\\s*${NUM}\\s*جم\\s*من حسابك\\s*${ENDING}\\s*${LAST4}.*?برقم مرجعي\\s*([A-Za-z0-9]+).*?بتاريخ\\s*${DMY4}\\s+${HM}`),
      map: (m) => ({ amountText: m[1], ccy: 'EGP', last4: m[2], reference: m[3], occurredAt: dt4(m, 4) }),
    },
    {
      // … بمبلغ 120.00 جم إلى حسابك المنتهي بـ ****9001 من NOUR TEST PERSON برقم مرجعي b2c3d4e5 بتاريخ 20-08-2026 22:26
      kind: 'instapay_in',
      regex: re(
        `تحويل لحظي بمبلغ\\s*${NUM}\\s*جم\\s*(?:إلى|الى|إلي)\\s*حسابك\\s*${ENDING}\\s*${LAST4}\\s*(?:من\\s+(.+?)\\s+)?برقم مرجعي\\s*([A-Za-z0-9]+).*?بتاريخ\\s*${DMY4}\\s+${HM}`,
      ),
      map: (m) => ({ amountText: m[1], ccy: 'EGP', last4: m[2], counterparty: clean(m[3]), reference: m[4], occurredAt: dt4(m, 5) }),
    },
    {
      // تم خصم EGP 123.45  من بطاقة الخصم المباشر # **9002 باستخدام Apple Pay عند  Talabat في  20/08/26 22:31الرصيد المتاح  EGP1234.56.
      kind: 'applepay_purchase',
      regex: re(`تم خصم\\s+${CCY}\\s*${NUM}\\s+من بطاقة.*?${LAST4}\\s*باستخدام Apple Pay\\s+عند\\s+(.+?)\\s+في\\s+${DMY2}\\s+${HM}\\s*(?:${BALANCE})?`),
      map: (m) => ({ ccy: m[1], amountText: m[2], last4: m[3], counterparty: clean(m[4]), occurredAt: dt2(m, 5), ...balance(m, 10) }),
    },
    {
      // تم خصم مبلغ  EGP 234.56 من بطاقة الخصم المباشر المنتهية بـ **9002 عند Uber في 18/08/26 10:31 ، الرصيد المتاح 98.76 EGP
      kind: 'card_purchase',
      regex: re(`تم خصم مبلغ\\s+${CCY}\\s*${NUM}\\s+من بطاقة.*?${LAST4}\\s+عند\\s+(.+?)\\s+في\\s+${DMY2}\\s+${HM}\\s*[،,]?\\s*(?:${BALANCE})?`),
      map: (m) => ({ ccy: m[1], amountText: m[2], last4: m[3], counterparty: clean(m[4]), occurredAt: dt2(m, 5), ...balance(m, 10) }),
    },
    {
      // تم سحب مبلغ  EGP 500.00  من بطاقة الخصم المباشر المنتهية بـ **9002 من   SAMPLE ATM في 11/07/26 15:51 ، الرصيد المتاح EGP 765.43
      kind: 'atm_withdrawal',
      regex: re(`تم سحب مبلغ\\s+${CCY}\\s*${NUM}\\s+من بطاقة.*?${LAST4}\\s+من\\s+(.+?)\\s+في\\s+${DMY2}\\s+${HM}\\s*[،,]?\\s*(?:${BALANCE})?`),
      map: (m) => ({ ccy: m[1], amountText: m[2], last4: m[3], counterparty: clean(m[4]), occurredAt: dt2(m, 5), ...balance(m, 10) }),
    },
    {
      // تم إيداع مبلغ 600.00 EGP  في CIB Example Branch في بطاقتك المنتهية بـ **9002 بتاريخ 21/02/26 01:54 ،الرصيد المتاح 4321.09 EGP
      kind: 'cash_deposit',
      regex: re(`تم (?:إيداع|ايداع) مبلغ\\s*${NUM}\\s*${CCY}\\s+في\\s+(.+?)\\s+في بطاقتك.*?${LAST4}\\s+بتاريخ\\s+${DMY2}\\s+${HM}\\s*[،,]?\\s*(?:${BALANCE})?`),
      map: (m) => ({ amountText: m[1], ccy: m[2], counterparty: clean(m[3]), last4: m[4], occurredAt: dt2(m, 5), ...balance(m, 10) }),
    },
    {
      // تم اضافة المعاملة من Uber بقيمة 5.00 EGP إلى بطاقتك المنتهية بـ **9002 . الرصيد المتاح EGP 338.33
      kind: 'refund',
      regex: re(`تم (?:اضافة|إضافة) المعاملة من\\s+(.+?)\\s+بقيمة\\s*${NUM}\\s*${CCY}\\s+(?:إلى|الى|على)\\s+بطاقت\\S*.*?${LAST4}\\s*\\.?\\s*(?:${BALANCE})?`),
      map: (m) => ({ counterparty: clean(m[1]), amountText: m[2], ccy: m[3], last4: m[4], ...balance(m, 5) }),
    },
    {
      // تم اضافة المعاملة الخاصة بـ SAMPLE MARKETPLACE ONLINE 00X على بطاقتكم المنتهية بـ 9002 بقيمة EGP 210.00 بتاريخ 10-08-2026
      kind: 'refund',
      regex: re(`تم (?:اضافة|إضافة) المعاملة الخاصة ب\\S*\\s+(.+?)\\s+على بطاقت\\S*\\s*${ENDING}\\s*${LAST4}\\s+بقيمة\\s+${CCY}\\s*${NUM}(?:\\s+بتاريخ\\s+${DMY4})?`),
      map: (m) => ({ counterparty: clean(m[1]), last4: m[2], ccy: m[3], amountText: m[4], occurredAt: m[5] ? dateOnly(+m[5], +m[6], +m[7]) : null }),
    },
    {
      // تم اضافة المعاملة الخاصة بـ Breadfast على بطاقة# **9002 باستخدام Apple Pay بقيمة 187.65 EGP بتاريخ 17/07/26 الرصيدالمتاح EGP 876.54
      kind: 'refund',
      regex: re(
        `تم (?:اضافة|إضافة) المعاملة الخاصة ب\\S*\\s+(.+?)\\s+على بطاقة\\S*\\s*${LAST4}\\s*باستخدام Apple Pay\\s+بقيمة\\s*${NUM}\\s*${CCY}(?:\\s+بتاريخ\\s+${DMY2})?\\s*(?:الرصيد\\s*المتاح\\s*${CCY}\\s*${NUM})?`,
      ),
      map: (m) => ({
        counterparty: clean(m[1]),
        last4: m[2],
        amountText: m[3],
        ccy: m[4],
        occurredAt: m[5] ? dateOnly(+m[5], +m[6], 2000 + +m[7]) : null,
        balance: toMinorText(m[9]),
        balanceCurrency: m[8] ?? null,
      }),
    },
  ],
  ignore: [
    { reason: 'declined', regex: /تم رفض المعاملة/ },
    { reason: 'otp', regex: /الرقم السري المتغير|كلمة المرور/ },
    { reason: 'info', regex: /قسيمة|نقطة BONUS/i },
  ],
  // Word stems that between them appear in every CIB money message (cards, Apple Pay, ATM,
  // refunds, deposits: بطاقة / بطاقتك; InstaPay: حسابك). Other texts that match are dropped by the parser.
  shortcutKeywords: [
    { word: 'بطاق', label: 'Cards', testID: 'copy-keyword-card' },
    { word: 'حساب', label: 'InstaPay', testID: 'copy-keyword-instapay' },
  ],
  example: 'تم خصم مبلغ  EGP 123.45 من بطاقة الخصم المباشر المنتهية بـ **9002 عند Talabat في 20/08/26 22:31 ، الرصيد المتاح 1,234.56 EGP',
  notes: 'Outgoing InstaPay alerts name neither the recipient nor the fee; incoming ones name the sender.',
};
