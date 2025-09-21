CREATE TABLE IF NOT EXISTS foods (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,           -- 'CURATED' | 'MyFCD' | 'USDA'
  name TEXT NOT NULL,
  category TEXT,
  aliases_json TEXT,
  default_portion_json TEXT,
  nutrients_per_100g_json TEXT,
  nutrients_per_100ml_json TEXT,
  modifiers_json TEXT
);

CREATE TABLE IF NOT EXISTS fixups (
  id TEXT PRIMARY KEY,
  category_fix TEXT,
  default_portion_fix_json TEXT,
  aliases_add_json TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS foods_fts USING fts5(
  name, aliases, content='',
  tokenize = 'unicode61 remove_diacritics 2'
);
