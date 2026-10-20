# Contributing to Mula

Thanks for helping. The most useful contributions right now:

1. **Support for another bank:** [docs/adding-a-bank.md](docs/adding-a-bank.md).
2. **Better data sources** than SMS (APIs, email alerts, aggregators): [open a data source idea](https://github.com/khaledsharara/mula/issues/new?template=data-source-idea.yml).
3. **Android testing** on real phones, especially Xiaomi, Oppo, Vivo, Huawei and Samsung with battery savers on.
4. Bug reports and fixes.

## Personal data

Mula handles bank messages, so this rule comes first: **no real messages, names, card or account digits, balances, branch names or reference numbers** in code, tests, issues, screenshots or pull requests. Use made-up values and keep only the bank's wording. Screenshots should use demo data (`node scripts/screenshots.mjs` makes them).

## Set up

```bash
git clone https://github.com/khaledsharara/mula.git && cd mula
npm install
npm start          # Expo Go
npm run web        # browser at http://localhost:8081
```

Node 22. Use `npx expo install <package>` to add packages, so versions match Expo SDK 57.

## Before a pull request

```bash
npm run typecheck
npx expo lint
npm test
```

For changes to screens, also run `npm run e2e` with `npm run web` running in another terminal (Chrome must be installed). The cloud and Claude steps also need `cd relay && cp .dev.vars.example .dev.vars && npm run dev`.

Native code (Shortcuts actions, the widget, Android SMS capture) only runs in the installed app. CI builds both, and the Android capture is tested on an emulator by `android-e2e.yml`.

## Conventions

- Routes in `src/app/` are one-line re-exports; code lives in `src/modules/<feature>/`.
- Read [docs/ui-conventions.md](docs/ui-conventions.md) before adding a screen. Every interactive element gets a `testID`.
- Copy is sentence case, plain and specific: buttons say what they do.
- Don't edit a database migration that shipped; add a new one.
- Keep commits focused, with messages that say what changes and why.

## Releases

Maintainers tag `vX.Y.Z`; [release.yml](.github/workflows/release.yml) builds the IPA and APK and publishes them. The Android signing key lives in repository secrets, so release APKs install over each other.
