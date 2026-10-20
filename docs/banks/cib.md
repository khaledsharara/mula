# CIB (Egypt)

Definition: [`src/modules/banks/definitions/cib.ts`](../../src/modules/banks/definitions/cib.ts). Samples: [`tests/fixtures/banks/cib.ts`](../../tests/fixtures/banks/cib.ts).

**Senders:** `CIB`, `CIB OTP`, `CIB VOUCHER`, `CIBEG`, `CIB EG`. Most alerts are in Arabic; the English wording is read by the generic templates.

**iPhone Shortcuts keywords:** `بطاق` (cards, Apple Pay, ATM, refunds, deposits) and `حساب` (InstaPay).

The examples below are made up (amounts, digits, names, branches, references); the wording and spacing are CIB's.

| Kind | Example | Notes |
|---|---|---|
| InstaPay sent | `يرجى العلم انه تم تنفيذ تحويل لحظي بمبلغ 750.00 جم من حسابك المنتهي بـ ********9001 برقم مرجعي a1b2c3d4 بتاريخ 20-08-2026 17:10` | No recipient name and no fee. Mula adds the InstaPay fee (0.1%, EGP 0.50 to 20) and asks who it went to. |
| InstaPay received | `… بمبلغ 120.00 جم إلى حسابك المنتهي بـ ********9001 من NOUR TEST PERSON برقم مرجعي b2c3d4e5 بتاريخ 20-08-2026 22:26` | The sender's name becomes the payee (renameable, remembered). |
| Apple Pay | `تم خصم EGP 123.45  من بطاقة الخصم المباشر # **9002 باستخدام Apple Pay عند  Talabat في  20/08/26 22:31الرصيد المتاح  EGP1234.56.` | The balance runs into the time. |
| Card payment | `تم خصم مبلغ  EGP 234.56 من بطاقة الخصم المباشر المنتهية بـ **9002 عند Uber في 18/08/26 10:31 ، الرصيد المتاح 98.76 EGP` | Can be in another currency (`INR 450.00`) with the balance in the account's currency. |
| ATM withdrawal | `تم سحب مبلغ  EGP 500.00  من بطاقة … **9002 من   SAMPLE ATM في 11/07/26 15:51 ، الرصيد المتاح EGP 765.43` | Suggested as a transfer to Cash. |
| Cash deposit | `تم إيداع مبلغ 600.00 EGP  في CIB Example Branch في بطاقتك المنتهية بـ **9002 بتاريخ 21/02/26 01:54 ،الرصيد المتاح 4321.09 EGP` | Suggested as a transfer from Cash. |
| Refund or hold reversal | `تم اضافة المعاملة من Uber بقيمة 5.00 EGP إلى بطاقتك المنتهية بـ **9002 . الرصيد المتاح EGP 338.33` | A charge reversed for the same amount within 30 minutes is a card hold, and both are dismissed. |
| Order refund | `تم اضافة المعاملة الخاصة بـ SAMPLE MARKETPLACE ONLINE 00X على بطاقتكم المنتهية بـ 9002 بقيمة EGP 210.00 بتاريخ 10-08-2026` | |
| Apple Pay refund | `تم اضافة المعاملة الخاصة بـ Breadfast على بطاقة# **9002 باستخدام Apple Pay بقيمة 187.65 EGP بتاريخ 17/07/26 الرصيدالمتاح EGP 876.54` | |
| Skipped | declined payments (`تم رفض المعاملة`), one-time codes (`الرقم السري المتغير`), vouchers and points, offers and notices | |

**Quirks**
- Card and account digits appear as `**9002` or `********9001`. Put the last four on the account in Mula and messages land there.
- A dollar card can be charged in pounds or any other currency: Mula converts the amount to the account's currency and keeps the original.
- Ride-hailing apps place small card holds that are reversed minutes later. Mula pairs them and dismisses both.
- Amounts may use Arabic-Indic digits (`٢٣٤.٥٦`).
