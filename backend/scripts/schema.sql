CREATE TABLE IF NOT EXISTS foods (
    id text PRIMARY KEY,
    source text NOT NULL, -- 'CURATED' | 'MyFCD' | 'USDA'
    name text NOT NULL,
    category text,
    aliases_json text,
    default_portion_json text,
    nutrients_per_100g_json text,
    nutrients_per_100ml_json text,
    modifiers_json text
);

CREATE VIRTUAL TABLE IF NOT EXISTS foods_fts
USING fts5 (
    name, aliases, content = '', tokenize = 'unicode61 remove_diacritics 2'
);

