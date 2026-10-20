# How Mula is built

An Expo (SDK 57) React Native app with expo-router, NativeWind 4 (Tailwind 3) and SQLite. Everything runs on the phone; the optional relay on Cloudflare runs the same data code.

## Layout

```
src/app/                  routes only, each a one-line re-export of a page
src/modules/<feature>/    pages, components, data (SQLite repositories), utils, types, index.ts
src/modules/banks/        bank SMS definitions (one file per bank) and the registry
src/modules/shared/       database, settings, theme, UI kit, layouts, helpers
modules/mula-sms/         Android: native SMS receiver and catch-up (Kotlin, local Expo module)
native/ios/               iPhone: Shortcuts actions (Swift App Intents)
plugins/                  config plugins (Shortcuts actions, free-account signing, Android release signing)
patches/                  expo-widgets fix so the widget finds its App Group after SideStore renames it
relay/                    Cloudflare Worker: cloud copy + Claude connector (MCP + OAuth)
tests/                    unit tests (jest), browser e2e (Playwright), Android emulator test
```

Design rules for screens: [ui-conventions.md](ui-conventions.md).

## Data

- SQLite through `expo-sqlite`, async only (the web build can't use the sync API). Schema and migrations: `src/modules/shared/db/migrations.ts`. Never edit a migration that shipped; append a new one.
- Repositories in `src/modules/<feature>/data/*Repo.ts` are the only writers. Screens read through `use*` hooks built on `useLiveQuery`, which re-run after writes to the tables they depend on.
- Amounts are integer minor units. A transaction's `amount` is in its account's currency; when it was charged in another currency, `original_amount`, `original_currency` and `fx_rate` keep what was charged. `base_amount` is in the base currency for statistics.
- Exchange rates come from free, keyless sources and are cached per day in `fx_rates` (`src/modules/integrations/utils/fx.ts`).

## From bank SMS to a transaction

1. **Capture.**
   - iPhone: the Shortcuts actions in `native/ios/MulaIntents.swift` write one JSON file per message to `Documents/intents/`.
   - Android: `modules/mula-sms` writes the same files from an `SMS_RECEIVED` receiver, for configured senders only, plus a catch-up scan of the SMS inbox for anything missed while the app was stopped.
   - Anywhere: paste, or import an SMS history CSV.
2. **Drain.** `src/modules/integrations/utils/intents.ts` files the queue into the inbox when Mula opens or comes back.
3. **Parse.** `parseBankSms(text, receivedAt, { sender })` tries the sender's bank first, then every other bank in `src/modules/banks`, then a generic money-out / money-in fallback.
4. **Inbox.** `ingestSms` stores the item (deduplicated), updates the account's bank balance, pairs card holds with their reversals, and merges Apple Pay entries with their SMS (`src/modules/inbox`).
5. **Suggestion.** `buildSuggestion` picks the account (card digits), payee (learned aliases), category, fee, conversion, a possible duplicate and a matching planned payment. Trusted payees are confirmed automatically; everything else waits for a swipe.

## Planned payments

`src/modules/recurring`. On each foreground, `processDueRecurring` logs due "auto" payments and queues "ask me" ones in the inbox. A payment can be charged in another currency than its account's: it's converted at the rate of its date, and waits in the inbox if no rate is available yet.

## Cloud copy and Claude (relay)

Claude can't reach the phone, so the relay (`relay/`, one SQLite Durable Object on Cloudflare's free plan) holds a full copy of the data and Claude works on that copy through MCP tools.

**Sync**
- Both sides run the same schema. Triggers on every synced table note each insert, update or delete in `sync_outbox`, one entry per record (`src/modules/shared/db/syncSchema.ts`).
- The app pushes its outbox (current rows, or `null` for deleted ones), then pulls everything the relay changed after its cursor (`src/modules/sync/data/syncEngine.ts`). Rows being applied from the other side don't echo back.
- Rows are upserted column by column, so a side with a newer schema never loses columns the other lacks. A clashing local record (unique payee names, bank-message keys) is renamed or re-keyed instead of overwritten.
- Conflicts: per record, the newer change wins. A phone change that loses gets the relay's version re-stamped, so the phone pulls it again and both sides end up equal.
- Exchange rates and device settings stay local; only the settings listed in `SYNCED_SETTINGS` travel.
- The relay keeps a dataset id. "Keep this phone's data" resets it, and other devices then have to choose which copy to keep.

**The relay runs the app's code.** `relay/wrangler.jsonc` aliases `expo-sqlite` and `expo-crypto` to small Worker shims, so the repositories in `src/modules/**/data` run unchanged. Fees, transfers, conversions, debts and inbox suggestions behave the same for Claude as in the app. The relay never runs `processDueRecurring`: only the phone logs planned payments, so they can't double up.

**Claude's changes and undo.** Each writing tool call is one change set (`relay/src/changes.ts`). Triggers record each touched record's state before the call, and its state after is captured when the call ends, in one transaction (a failing call changes nothing). Undo restores the earlier state for records still as Claude left them; records edited again since are skipped. The last 300 change sets are kept.

**Sign-in.** `relay/src/oauth.ts`: OAuth 2.1 with dynamic client registration, PKCE (S256), 1-hour access tokens and rotating 30-day refresh tokens, all stored hashed. The consent page asks for `OWNER_PASSWORD`; ten wrong attempts in an hour lock it. Only Claude's callbacks and loopback addresses are accepted as redirects. The app syncs with a separate bearer token (`APP_TOKEN`).

**Deploying.** `relay-bundle.yml` builds a self-contained bundle onto the `relay-deploy` branch for the Deploy to Cloudflare button; `relay-deploy.yml` deploys from a fork with repository secrets.

## Builds

- `release.yml` builds an unsigned IPA on a macOS runner (`ldid` embeds the entitlements; SideStore signs it on the phone) and an APK on Linux, then publishes both on one release. Public builds fail if any `EXPO_PUBLIC_MULA_*` variable is set or a relay address ends up in a JS bundle.
- `ci.yml` runs types, lint and unit tests on every pull request; `android-e2e.yml` exercises SMS capture on an emulator.

## Tests

- `npm test`: parser and bank registry, matching, money and recurrence rules, planned payments in another currency (real SQLite through Node's `node:sqlite`), sync, Android capture's JS side.
- `npm run e2e`: the web build in Chrome at iPhone size, against the dev server. The cloud steps also need `cd relay && npm run dev`.
- `cd relay && npm run smoke`: sync, conflicts, sign-in, every tool, undo and sign-out against the local relay (it erases the local relay's data).
- `tests/android/sms-capture.sh`: run by `android-e2e.yml` on an emulator.
