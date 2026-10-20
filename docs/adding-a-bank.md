# Add your bank

Mula reads bank SMS with a small definition per bank. Adding yours makes it work for everyone at that bank: the inbox, payee learning, account matching by card digits, the iPhone Shortcuts keywords and Android capture all pick it up automatically.

You need: Node 22, the repository cloned, `npm install`. No phone needed: the parser is plain TypeScript and the tests run on your computer.

## Privacy first

Bank messages contain your name, card and account digits, balances, branches and the people you pay. **Never commit, paste or attach real messages**, not even in an issue. Work from your real messages on your own computer, then write made-up samples that keep the bank's exact wording and spacing but change:

- amounts and balances (use obviously fake ones like `123.45`, `1,234.56`)
- card and account digits (use `9001`, `9002`, `9003`)
- people's names (`NOUR TEST PERSON`), merchant terminal numbers, branch names, reference codes

`.gitignore` already ignores `*.csv` so exports in the project folder can't be committed by accident.

## 1. Collect the formats

Go through your bank's SMS and list each kind of money message: card payment, online payment, Apple Pay, transfer in and out (InstaPay or other), ATM withdrawal, deposit, refund, reversal. Note the exact sender name(s) your phone shows (for example `CIB`, `NBE`, `QNB ALAHLI`).

Messages Mula should skip also matter: one-time codes, declined payments, offers.

## 2. Write the definition

Copy [`src/modules/banks/definitions/cib.ts`](../src/modules/banks/definitions/cib.ts) to `src/modules/banks/definitions/<your-bank>.ts`:

```ts
import type { BankDefinition } from '../types';
import { CCY, DMY2, HM, LAST4, NUM, clean, dt2, re } from '../utils/patterns';

export const EXAMPLE_BANK: BankDefinition = {
  id: 'examplebank',
  name: 'Example Bank',
  country: 'EG',
  senders: ['EXAMPLEBANK', 'EXAMPLE BK'],
  templates: [
    {
      // Your card **9002 was charged EGP 123.45 at SAMPLE STORE on 20/08/26 10:31.
      kind: 'card_purchase',
      regex: re(`card\\s*${LAST4}\\s+was charged\\s+${CCY}\\s*${NUM}\\s+at\\s+(.+?)\\s+on\\s+${DMY2}\\s+${HM}`),
      map: (m) => ({ last4: m[1], ccy: m[2], amountText: m[3], counterparty: clean(m[4]), occurredAt: dt2(m, 5) }),
    },
  ],
  ignore: [{ reason: 'otp', regex: /verification code/i }],
  shortcutKeywords: [{ word: 'charged', label: 'Cards', testID: 'copy-keyword-examplebank-card' }],
  example: 'Your card **9002 was charged EGP 123.45 at SAMPLE STORE on 20/08/26 10:31.',
};
```

- **`kind`** is one of `card_purchase`, `applepay_purchase`, `instapay_out`, `instapay_in`, `atm_withdrawal`, `cash_deposit`, `refund`. It decides whether money goes out or in, and the payment type.
- **`map`** returns `amountText` and `ccy` (ISO code; `'جم'` also means EGP), plus whatever the message says: `last4` (links it to the account that has those digits), `counterparty` (merchant or person), `reference`, `occurredAt`, `balance` with `balanceCurrency` (keeps the account's bank balance in step).
- [`utils/patterns.ts`](../src/modules/banks/utils/patterns.ts) has ready pieces: `NUM` (amounts with commas and Arabic digits), `CCY`, `LAST4`, `DMY2`/`DMY4` dates, `HM`, `BALANCE` and helpers to read them.
- Put a made-up example above each template, as in `cib.ts`.
- **`shortcutKeywords`**: the fewest words that appear in every money message (iPhone automations match on "message contains"). Short stems work well for Arabic.
- **`example`** is shown as the paste placeholder and must parse.

Then register it in [`src/modules/banks/index.ts`](../src/modules/banks/index.ts), above `GENERIC`:

```ts
export const BANKS: readonly BankDefinition[] = [CIB, EXAMPLE_BANK, GENERIC];
```

## 3. Add samples and tests

1. Create `tests/fixtures/banks/<your-bank>.ts` with one made-up message per format (and the ones to skip), like [`cib.ts`](../tests/fixtures/banks/cib.ts).
2. Add it to `BANK_FIXTURES` in [`tests/fixtures/banks/index.ts`](../tests/fixtures/banks/index.ts) under your bank's `id`.
3. Add a `describe` block in [`tests/inbox/parser.test.ts`](../tests/inbox/parser.test.ts) that checks what each sample parses to: amount, currency, last 4 digits, counterparty, balance.

Run `npm test`. The registry tests already check that your `example` parses and that **every template has at least one sample that matches it**.

Check your real messages locally (it prints counts and digit-masked snippets only, nothing leaves your computer):

```sh
node scripts/parse-archive.ts path/to/your-messages.csv
```

The CSV needs `datetime`, `sender` and `text` columns.

## 4. Open a pull request

- `npm run typecheck && npx expo lint && npm test` pass.
- Add a section for your bank to [docs/banks/](banks/), like [cib.md](banks/cib.md): the formats, its quirks and the Shortcuts keywords.
- Tick the privacy checklist in the pull request template.

If something about your bank doesn't fit (a format without card digits, statements instead of per-payment alerts, several banks sharing a sender), open the pull request anyway, or an issue, and we'll work it out.

## Not SMS?

If your bank offers an API, email alerts or something else that could feed Mula, please [open a data source idea](https://github.com/khaledsharara/mula/issues/new?template=data-source-idea.yml).
