// backend/src/models/personalization.ts
import db from './db';

function bootstrapPersonalization() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS user_dict (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      phrase TEXT NOT NULL,
      canonical_food_id TEXT,
      canonical_food_name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, phrase)
    )
  `).run();

  db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_dict_user ON user_dict(user_id)`).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS meal_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      local_hour INTEGER NOT NULL,
      dow INTEGER NOT NULL,
      food_id TEXT,
      food_name TEXT NOT NULL,
      portion_json TEXT,
      source TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run();

  db.prepare(`CREATE INDEX IF NOT EXISTS idx_mevents_user_dow ON meal_events(user_id, dow, ts DESC)`).run();
}

export default bootstrapPersonalization;
