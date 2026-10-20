import { loadSettings } from '../settings/settingsStore';
import { first, getDb } from './client';
import { notify } from './live';
import { seedCategoryRows } from './seeds/categories';

/** Opens the database, runs migrations, seeds Wallet's categories once and loads settings. */
export async function bootstrap(): Promise<void> {
  const db = await getDb();
  const existing = await first<{ n: number }>('SELECT COUNT(*) AS n FROM categories');
  if (!existing?.n) {
    await db.withTransactionAsync(async () => {
      for (const r of seedCategoryRows()) {
        await db.runAsync(
          `INSERT INTO categories (id, parent_id, name, kind, icon, color, nature, system_key, archived, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [r.id, r.parent_id, r.name, r.kind, r.icon, r.color, r.nature, r.system_key, r.sort_order],
        );
      }
    });
    notify(['categories']);
  }
  await loadSettings();
}
