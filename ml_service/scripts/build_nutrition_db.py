# ml_service/scripts/build_nutrition_db.py
import json, sqlite3, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "data" / "build"
CUR   = ROOT / "data" / "curated"
DB    = BUILD / "nutrition.db"

def clean_name(name: str, max_tokens: int = 4) -> str:
    STOP_PREFIX = [r"^pillsbury", r"^kraft foods", r"^george weston", r"^nestl[eé]",
                   r"^kellogg('s)?", r"^general mills", r"^pepsico", r"^coca[- ]cola", r"^campbell('s)?"]
    DROP_WORDS = set("""microwaved microwave toasted frozen refrigerated dough ready-to-heat
        artificial flavor original recipe coating for dry prepared instant
        low-fat nonfat reduced no-sugar-added family size pack bottle canned
        percent % oz ounce fl lb pouch tray""".split())
    n = name.lower().strip()
    n = re.sub(r"\s+", " ", n)
    for pat in STOP_PREFIX:
        n = re.sub(pat + r"[,\s]+", "", n)
    n = re.sub(r"\([^)]*\)", " ", n)
    n = n.replace(",", " ")
    words = [w for w in n.split() if w not in DROP_WORDS and not re.fullmatch(r"\d+([./]\d+)?", w)]
    return " ".join(words[:max_tokens]) if words else n

def main():
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB)
    cur = con.cursor()

    # 主表：统一放 USDA + 本地补充
    cur.executescript("""
    DROP TABLE IF EXISTS foods;
    CREATE TABLE foods(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT,
      energy_kcal REAL, protein_g REAL, fat_g REAL, sat_fat_g REAL,
      carb_g REAL, sugar_g REAL, fiber_g REAL, sodium_mg REAL,
      source TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_foods_short ON foods(short_name);
    CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);

    DROP TABLE IF EXISTS alias;
    CREATE TABLE alias(alias TEXT PRIMARY KEY, food_id TEXT REFERENCES foods(id));
    """)

    # 1) 先写入 USDA
    usda_path = BUILD / "foods.usda.json"
    with open(usda_path, "r", encoding="utf-8") as f:
        foods = json.load(f)

    to_row = []
    for it in foods:
        n = it.get("nutrients", {}) or {}
        row = (
            it["id"],
            it["name"],
            clean_name(it["name"]),
            n.get("energy_kcal"), n.get("protein_g"), n.get("fat_g"), n.get("sat_fat_g"),
            n.get("carb_g"), n.get("sugar_g"), n.get("fiber_g"), n.get("sodium_mg"),
            it.get("source","USDA")
        )
        to_row.append(row)
    cur.executemany("""INSERT OR REPLACE INTO foods
        (id,name,short_name,energy_kcal,protein_g,fat_g,sat_fat_g,carb_g,sugar_g,fiber_g,sodium_mg,source)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", to_row)
    print(f"✅ Inserted USDA: {len(to_row)} rows")

    # 2) OpenFoodFacts
    off_path = BUILD / "foods.openfoodfacts.json"
    if off_path.exists():
        with open(off_path, "r", encoding="utf-8") as f:
            off_items = json.load(f)
        rows = []
        alias_rows = []
        for it in off_items:
            n = it.get("nutrients", {}) or {}
            rows.append((
                it["id"],
                it["name"],
                clean_name(it["name"]),
                n.get("energy_kcal"), n.get("protein_g"), n.get("fat_g"), n.get("sat_fat_g"),
                n.get("carb_g"), n.get("sugar_g"), n.get("fiber_g"), n.get("sodium_mg"),
                it.get("source","OpenFoodFacts")
            ))
            for a in it.get("aliases", []) or []:
                alias_rows.append((a.strip().lower(), it["id"]))
            alias_rows.append((it["name"].strip().lower(), it["id"]))
        cur.executemany("""INSERT OR REPLACE INTO foods
            (id,name,short_name,energy_kcal,protein_g,fat_g,sat_fat_g,carb_g,sugar_g,fiber_g,sodium_mg,source)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", rows)
        if alias_rows:
            cur.executemany("INSERT OR REPLACE INTO alias(alias, food_id) VALUES(?,?)", alias_rows)
        print(f"🌍 Inserted OpenFoodFacts: {len(rows)} rows")

    # 3) 再写入本地补充（若存在）
    local_file = CUR / "local_additions.json"
    if local_file.exists():
        with open(local_file, "r", encoding="utf-8") as f:
            local = json.load(f)
        rows = []
        for it in local:
            n = it.get("nutrients", {}) or {}
            rows.append((
                it["id"],
                it["name"],
                clean_name(it["name"]),
                n.get("energy_kcal"), n.get("protein_g"), n.get("fat_g"), n.get("sat_fat_g"),
                n.get("carb_g"), n.get("sugar_g"), n.get("fiber_g"), n.get("sodium_mg"),
                it.get("source","LOCAL")
            ))
        cur.executemany("""INSERT OR REPLACE INTO foods
            (id,name,short_name,energy_kcal,protein_g,fat_g,sat_fat_g,carb_g,sugar_g,fiber_g,sodium_mg,source)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", rows)
        print(f"➕ Inserted LOCAL: {len(rows)} rows")

        # alias 表
        alias_rows = []
        for it in local:
            for a in it.get("aliases", []) or []:
                alias_rows.append((a.strip().lower(), it["id"]))
            alias_rows.append((it["name"].strip().lower(), it["id"]))
        cur.executemany("INSERT OR REPLACE INTO alias(alias, food_id) VALUES(?,?)", alias_rows)
        print(f"🔗 Inserted ALIAS: {len(alias_rows)} rows")

    con.commit(); con.close()
    print(f"📦 Done -> {DB}")

if __name__ == "__main__":
    main()
