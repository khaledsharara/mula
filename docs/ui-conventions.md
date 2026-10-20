# Mula UI conventions

Read this before adding a screen. The goal is one consistent, calm app ("Quiet mono").

## Stack
- Expo SDK 57, expo-router (routes in `src/app`, **thin**: `export { default } from '@/modules/<m>/pages/<Page>';`).
- NativeWind 4 + Tailwind v3. Colors are CSS-variable tokens — use these classes only:
  `bg-paper` (screen), `bg-sheet` (raised), `bg-sunk` (inputs, chips), `text-ink`, `text-graphite` (secondary), `text-mist` (tertiary),
  `border-hairline`, `bg-accent`/`text-accent` (ledger blue, interactive), `text-income` (green, income only), `text-alert`/`bg-alert-soft` (attention), `text-danger`.
  Never hardcode hex in className. For raw colors (SVG, icons) use `const { c } = useTheme()` → `c.ink`, `c.accent`…
- Tailwind's scanner needs full literal class names. Never build class names with template strings like `text-${x}`.
- Data: async SQLite repos in `src/modules/<m>/data/*Repo.ts`; read with the `use*` hooks (they re-run automatically after writes). Write only through repo functions.

## Kit (import from `src/modules/shared/...`)
- `components/Text` → `<Text variant="hero|display|title|heading|body|label|caption" weight tone tabular>`. Use `tabular` for every number.
- `components/Money` → `<Money minor={…} currency size="hero|display|lg|md|sm" sign colorIncome showCurrency />`. Amounts are integer minor units.
- `components/Button` → `Button` (variant primary|accent|secondary|ghost|danger, size lg|md|sm, full, icon, loading), `IconButton`.
- `components/List` → `Section` (sentence-case title + optional action + footer hint), `ListRow` (title, subtitle, left, right, value, chevron, onPress), `Divider`.
- `components/Fields` → `TextField` (label above, hint/error below), `ToggleRow`, `Stepper`.
- `components/Chip`, `components/SegmentedControl`, `components/Misc` (`IconTile`, `Avatar`, `ProgressBar`, `CountBadge`, `EmptyState`).
- `components/BottomSheet` for pickers/prompts; `components/DateTimeSheet` for dates.
- `components/Feedback` → `toast('Saved')`, `await confirm({ title, message, confirmLabel, destructive })`. Never use `Alert` or `window.confirm`.
- `components/Press` → pressable with feedback + `haptic`.
- `components/Icon` → `<Icon name="…" />` with lucide names from `components/iconSet.ts` (only those exist; add new ones there).
- `layouts/Screen` → every page: `<Screen title back|close large tabBar footer={…} right={…}>`. Pushed pages use `back`; tab pages use `large tabBar`. Put the primary action in `footer`.
- `transactions/components/Pickers` → `AccountPicker`, `CategoryPicker`, `PayeePicker`, `PaymentTypePicker`, `CurrencyPicker`. `transactions/components/FieldRow` for label/value form rows. `transactions/components/TransactionRow` + `transactions/data/useLookups` for record lists.
- Utils: `shared/utils/money` (`formatMoney`, `parseAmount`, `toMinor`), `shared/utils/dates` (`dayLabel`, `shortDate`, …), `shared/utils/text`.

## Visual rules
- Left-aligned, 20px side padding (`px-5`), hairline dividers between rows, few or no cards. Sections separated by space (`Section` adds `mt-7`).
- One accent. Spending amounts stay ink; only income uses `colorIncome`.
- Copy: sentence case, plain verbs, describe what happens ("Add account", "Delete record"). No ALL-CAPS labels, no "A · B · C" middle-dot chains, no "→" appended to buttons, no exclamation marks. Empty states say what to do next.
- Buttons say exactly what they do; the toast repeats the verb ("Template saved").
- Every interactive element gets a `testID` (kebab-case) so it can be tested in the browser.
- Destructive actions: `confirm({ destructive: true })`, then a toast.

## Module layout
`src/modules/<feature>/{pages,components,types,utils,data}` + `index.ts` re-exporting the public pieces. Bank SMS formats live in `src/modules/banks` (see [adding-a-bank.md](adding-a-bank.md)).
