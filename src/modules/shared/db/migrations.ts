import { SYNC_MIGRATION } from './syncSchema';

/** Ordered schema migrations; PRAGMA user_version records how many have run. Never edit one that shipped. */
export const migrations: string[] = [
  `
  CREATE TABLE accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    currency TEXT NOT NULL,
    initial_balance INTEGER NOT NULL DEFAULT 0,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    default_payment_type TEXT NOT NULL,
    identifiers TEXT NOT NULL DEFAULT '[]',
    bank_balance INTEGER,
    bank_balance_at INTEGER,
    exclude_from_stats INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    nature TEXT NOT NULL DEFAULT 'none',
    system_key TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX categories_parent ON categories(parent_id);

  CREATE TABLE payees (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'merchant',
    default_category_id TEXT,
    default_account_id TEXT,
    auto_confirm INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER
  );
  CREATE UNIQUE INDEX payees_name ON payees(name COLLATE NOCASE);

  CREATE TABLE payee_aliases (
    raw TEXT PRIMARY KEY NOT NULL,
    payee_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX payee_aliases_payee ON payee_aliases(payee_id);

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    account_id TEXT NOT NULL,
    to_account_id TEXT,
    to_amount INTEGER,
    category_id TEXT,
    payee_id TEXT,
    payment_type TEXT NOT NULL,
    date INTEGER NOT NULL,
    note TEXT,
    is_instapay INTEGER NOT NULL DEFAULT 0,
    parent_id TEXT,
    nature_override TEXT,
    original_amount INTEGER,
    original_currency TEXT,
    fx_rate REAL,
    base_amount INTEGER NOT NULL,
    recurring_id TEXT,
    debt_id TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    source_ref TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX tx_date ON transactions(date);
  CREATE INDEX tx_account ON transactions(account_id);
  CREATE INDEX tx_to_account ON transactions(to_account_id);
  CREATE INDEX tx_parent ON transactions(parent_id);
  CREATE INDEX tx_payee ON transactions(payee_id);
  CREATE INDEX tx_debt ON transactions(debt_id);

  CREATE TABLE inbox_items (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    parsed TEXT,
    received_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_id TEXT,
    recurring_id TEXT,
    dedupe_key TEXT,
    note TEXT,
    resolved_at INTEGER
  );
  CREATE INDEX inbox_status ON inbox_items(status);
  CREATE UNIQUE INDEX inbox_dedupe ON inbox_items(dedupe_key);

  CREATE TABLE recurring (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER,
    currency TEXT,
    account_id TEXT,
    to_account_id TEXT,
    category_id TEXT,
    payee_id TEXT,
    payment_type TEXT,
    note TEXT,
    is_instapay INTEGER NOT NULL DEFAULT 0,
    frequency TEXT NOT NULL,
    interval INTEGER NOT NULL DEFAULT 1,
    start_date INTEGER NOT NULL,
    end_type TEXT NOT NULL DEFAULT 'never',
    end_date INTEGER,
    end_count INTEGER,
    occurrences INTEGER NOT NULL DEFAULT 0,
    next_due INTEGER,
    mode TEXT NOT NULL DEFAULT 'confirm',
    remind_days_before INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER,
    currency TEXT,
    account_id TEXT,
    to_account_id TEXT,
    category_id TEXT,
    payee_id TEXT,
    payment_type TEXT,
    note TEXT,
    is_instapay INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE debts (
    id TEXT PRIMARY KEY NOT NULL,
    direction TEXT NOT NULL,
    payee_id TEXT NOT NULL,
    account_id TEXT,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    date INTEGER NOT NULL,
    due_date INTEGER,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    closed_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE fx_rates (
    day TEXT NOT NULL,
    base TEXT NOT NULL,
    quote TEXT NOT NULL,
    rate REAL NOT NULL,
    fetched_at INTEGER NOT NULL,
    PRIMARY KEY (day, base, quote)
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  SYNC_MIGRATION,
];
