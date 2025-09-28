// backend/src/models/personalization.ts
import db from './db';

function bootstrapPersonalization() {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS user_dict (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phrase TEXT NOT NULL,
      canonical_food_id TEXT,
      canonical_food_name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(phrase)
    )
  `
  ).run();


  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS meal_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      local_hour INTEGER NOT NULL,
      dow INTEGER NOT NULL,
      food_id TEXT,
      food_name TEXT NOT NULL,
      portion_json TEXT,
      source TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `
  ).run();

 
}

export default bootstrapPersonalization;
