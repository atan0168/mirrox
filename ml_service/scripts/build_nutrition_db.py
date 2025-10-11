import json, sqlite3, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "data" / "build"
CUR = ROOT / "data" / "curated"
DB = BUILD / "nutrition.db"


def first_value(value):
    """
    Return the first non-empty string from a scalar or list input.
    Splits comma separated strings and trims whitespace.
    """
    if isinstance(value, list):
        for item in value:
            result = first_value(item)
            if result:
                return result
        return None
    if isinstance(value, str):
        head = value.split(",")[0].strip()
        return head or None
    return None


def join_list(value):
    if isinstance(value, list):
        parts = [v.strip() for v in value if isinstance(v, str) and v.strip()]
        return ", ".join(parts) or None
    if isinstance(value, str):
        return value.strip() or None
    return None


def clean_brand(value):
    return first_value(value)


def resolve_category(*candidates):
    for candidate in candidates:
        resolved = first_value(candidate)
        if resolved:
            return resolved
    return None


def clean_name(name: str, max_tokens: int = 4) -> str:
    STOP_PREFIX = [
        r"^pillsbury",
        r"^kraft foods",
        r"^george weston",
        r"^nestl[eé]",
        r"^kellogg('s)?",
        r"^general mills",
        r"^pepsico",
        r"^coca[- ]cola",
        r"^campbell('s)?",
    ]
    DROP_WORDS = set(
        """microwaved microwave toasted frozen refrigerated dough ready-to-heat
        artificial flavor original recipe coating for dry prepared instant
        low-fat nonfat reduced no-sugar-added family size pack bottle canned
        percent % oz ounce fl lb pouch tray""".split()
    )
    n = name.lower().strip()
    n = re.sub(r"\s+", " ", n)
    for pat in STOP_PREFIX:
        n = re.sub(pat + r"[,\s]+", "", n)
    n = re.sub(r"\([^)]*\)", " ", n)
    n = n.replace(",", " ")
    words = [
        w
        for w in n.split()
        if w not in DROP_WORDS and not re.fullmatch(r"\d+([./]\d+)?", w)
    ]
    return " ".join(words[:max_tokens]) if words else n


NUTRIENT_FIELDS = [
    "energy_kcal",
    "protein_g",
    "fat_g",
    "sat_fat_g",
    "carb_g",
    "sugar_g",
    "fiber_g",
    "sodium_mg",
]


def coerce_float(value):
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def select_nutrients(item: dict) -> dict:
    for key in ("nutrients_per_100g", "nutrients_per_100ml", "nutrients"):
        nutrients = item.get(key)
        if isinstance(nutrients, dict) and nutrients:
            return nutrients
    return {}


def format_default_portion(portion):
    if not isinstance(portion, dict):
        return None
    unit = (portion.get("unit") or "").strip()
    grams = coerce_float(portion.get("grams"))
    ml = coerce_float(portion.get("ml"))
    pieces = coerce_float(portion.get("pieces"))

    details = []
    if grams is not None:
        details.append(f"{grams:g} g")
    if ml is not None:
        details.append(f"{ml:g} ml")
    if pieces is not None:
        details.append(f"{pieces:g} pcs")
    parts = []
    if unit:
        parts.append(f"1 {unit}")
    if details:
        parts.append(f"({' / '.join(details)})")
    quantity = " ".join(parts).strip()
    return quantity or None


def format_quantity(item: dict):
    quantity = item.get("quantity")
    if isinstance(quantity, str) and quantity.strip():
        return quantity.strip()
    if quantity is not None and not isinstance(quantity, (dict, list)):
        return str(quantity)
    portion = item.get("default_portion")
    return format_default_portion(portion)


def prepare_curated_entry(item: dict, source: str, id_prefix: str | None = None):
    base_id = item.get("id")
    if not base_id:
        raise ValueError("Curated item missing id")
    if id_prefix and not str(base_id).startswith(id_prefix):
        food_id = f"{id_prefix}{base_id}"
    else:
        food_id = str(base_id)

    name = str(item.get("name") or "").strip()
    short = clean_name(name)
    category = first_value(item.get("category")) or join_list(item.get("food_groups"))
    quantity = format_quantity(item)
    brands = clean_brand(item.get("brands") or item.get("brand"))

    nutrients = select_nutrients(item)
    values = {field: coerce_float(nutrients.get(field)) for field in NUTRIENT_FIELDS}

    food_groups = join_list(item.get("food_groups"))
    if not food_groups and category:
        food_groups = category

    row = (
        food_id,
        name,
        short,
        category,
        quantity,
        brands,
        food_groups,
        values["energy_kcal"],
        values["protein_g"],
        values["fat_g"],
        values["sat_fat_g"],
        values["carb_g"],
        values["sugar_g"],
        values["fiber_g"],
        values["sodium_mg"],
        source,
    )

    alias_candidates = set()
    for alias in item.get("aliases") or []:
        if isinstance(alias, str):
            sanitized = alias.strip().lower()
            if sanitized:
                alias_candidates.add(sanitized)
    if name:
        alias_candidates.add(name.lower())
    if short:
        alias_candidates.add(short.lower())
    alias_rows = [(alias, food_id) for alias in alias_candidates if alias]
    return row, alias_rows


def main():
    DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB)
    cur = con.cursor()

    cur.executescript("""
    DROP TABLE IF EXISTS foods;
    CREATE TABLE foods(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT,
      category TEXT,
      quantity TEXT,
      brands TEXT,
      food_groups TEXT,
      energy_kcal REAL, protein_g REAL, fat_g REAL, sat_fat_g REAL,
      carb_g REAL, sugar_g REAL, fiber_g REAL, sodium_mg REAL,
      source TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_foods_short ON foods(short_name);
    CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);

    DROP TABLE IF EXISTS alias;
    CREATE TABLE alias(alias TEXT PRIMARY KEY, food_id TEXT REFERENCES foods(id));

    DROP TABLE IF EXISTS foods_fts;
    CREATE VIRTUAL TABLE foods_fts
    USING fts5(
      name,
      aliases,
      content='',
      tokenize = 'unicode61 remove_diacritics 2'
    );
    """)

    # 1) USDA
    # usda_path = BUILD / "foods.usda.json"
    # with open(usda_path, "r", encoding="utf-8") as f:
    #     foods = json.load(f)
    #
    # to_row = []
    # for it in foods:
    #     n = it.get("nutrients", {}) or {}
    #     row = (
    #         it["id"],
    #         it["name"],
    #         clean_name(it["name"]),
    #         it.get("quantity"),
    #         join_list(it.get("brands")),
    #         join_list(it.get("food_groups")),
    #         n.get("energy_kcal"),
    #         n.get("protein_g"),
    #         n.get("fat_g"),
    #         n.get("sat_fat_g"),
    #         n.get("carb_g"),
    #         n.get("sugar_g"),
    #         n.get("fiber_g"),
    #         n.get("sodium_mg"),
    #         it.get("source", "USDA"),
    #     )
    #     to_row.append(row)
    # cur.executemany(
    #     """INSERT OR REPLACE INTO foods
    #     (id,name,short_name,category,quantity,brands,food_groups,energy_kcal,protein_g,fat_g,sat_fat_g,carb_g,sugar_g,fiber_g,sodium_mg,source)
    #     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
    #     to_row,
    # )
    # print(f"✅ Inserted USDA: {len(to_row)} rows")

    # 2) OpenFoodFacts
    off_path = BUILD / "foods.openfoodfacts.json"
    if off_path.exists():
        with open(off_path, "r", encoding="utf-8") as f:
            off_items = json.load(f)
        rows = []
        alias_rows = []
        for it in off_items:
            n = it.get("nutrients", {}) or {}
            rows.append(
                (
                    it["id"],
                    it["name"],
                    clean_name(it["name"]),
                    resolve_category(it.get("category"), it.get("food_groups")),
                    it.get("quantity"),
                    clean_brand(it.get("brands")),
                    join_list(it.get("food_groups")),
                    n.get("energy_kcal"),
                    n.get("protein_g"),
                    n.get("fat_g"),
                    n.get("sat_fat_g"),
                    n.get("carb_g"),
                    n.get("sugar_g"),
                    n.get("fiber_g"),
                    n.get("sodium_mg"),
                    it.get("source", "OpenFoodFacts"),
                )
            )
            for a in it.get("aliases", []) or []:
                alias_rows.append((a.strip().lower(), it["id"]))
            alias_rows.append((it["name"].strip().lower(), it["id"]))
        cur.executemany(
            """INSERT OR REPLACE INTO foods
            (id,name,short_name,category,quantity,brands,food_groups,energy_kcal,protein_g,fat_g,sat_fat_g,carb_g,sugar_g,fiber_g,sodium_mg,source)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            rows,
        )
        if alias_rows:
            cur.executemany(
                "INSERT OR REPLACE INTO alias(alias, food_id) VALUES(?,?)", alias_rows
            )
        print(f"🌍 Inserted OpenFoodFacts: {len(rows)} rows")

    # 3) Nutritionix
    nix_path = BUILD / "foods.nutritionix.json"
    if nix_path.exists():
        with open(nix_path, "r", encoding="utf-8") as f:
            nix_items = json.load(f)
        rows = []
        alias_rows = []
        for it in nix_items:
            n = it.get("nutrients", {}) or {}
            rows.append(
                (
                    it["id"],
                    it["name"],
                    clean_name(it["name"]),
                    resolve_category(
                        it.get("category"), it.get("food_groups"), "fruits"
                    ),
                    it.get("quantity"),
                    clean_brand(it.get("brands")),
                    "fruits",
                    n.get("energy_kcal"),
                    n.get("protein_g"),
                    n.get("fat_g"),
                    n.get("sat_fat_g"),
                    n.get("carb_g"),
                    n.get("sugar_g"),
                    n.get("fiber_g"),
                    n.get("sodium_mg"),
                    it.get("source", "Nutritionix"),
                )
            )
            for a in it.get("aliases", []) or []:
                alias = a.strip().lower()
                if alias:
                    alias_rows.append((alias, it["id"]))
            name_alias = (it.get("name") or "").strip().lower()
            if name_alias:
                alias_rows.append((name_alias, it["id"]))
        if rows:
            cur.executemany(
                """INSERT OR REPLACE INTO foods
                (id,name,short_name,category,quantity,brands,food_groups,energy_kcal,protein_g,fat_g,sat_fat_g,carb_g,sugar_g,fiber_g,sodium_mg,source)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                rows,
            )
            print(f"🥝 Inserted Nutritionix: {len(rows)} rows")
        if alias_rows:
            cur.executemany(
                "INSERT OR REPLACE INTO alias(alias, food_id) VALUES(?,?)",
                alias_rows,
            )

    # 4) Add local additions
    local_file = CUR / "local_additions.json"
    if local_file.exists():
        with open(local_file, "r", encoding="utf-8") as f:
            local = json.load(f)
        rows, alias_rows = [], []
        for it in local:
            row, aliases = prepare_curated_entry(it, it.get("source", "Curated"))
            rows.append(row)
            alias_rows.extend(aliases)
        if rows:
            cur.executemany(
                """INSERT OR REPLACE INTO foods
                (id,name,short_name,category,quantity,brands,food_groups,energy_kcal,protein_g,fat_g,sat_fat_g,carb_g,sugar_g,fiber_g,sodium_mg,source)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                rows,
            )
            print(f"➕ Inserted LOCAL: {len(rows)} rows")
        if alias_rows:
            cur.executemany(
                "INSERT OR REPLACE INTO alias(alias, food_id) VALUES(?,?)", alias_rows
            )
            print(f"🔗 Inserted LOCAL aliases: {len(alias_rows)} rows")

    # 5) Add MyFCD curated data
    myfcd_file = CUR / "myfcd_clean.json"
    if myfcd_file.exists():
        with open(myfcd_file, "r", encoding="utf-8") as f:
            myfcd_items = json.load(f)
        rows, alias_rows = [], []
        for it in myfcd_items:
            row, aliases = prepare_curated_entry(it, "MyFCD", id_prefix="myfcd-")
            rows.append(row)
            alias_rows.extend(aliases)
        if rows:
            cur.executemany(
                """INSERT OR REPLACE INTO foods
                (id,name,short_name,category,quantity,brands,food_groups,energy_kcal,protein_g,fat_g,sat_fat_g,carb_g,sugar_g,fiber_g,sodium_mg,source)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                rows,
            )
            print(f"🇲🇾 Inserted MyFCD: {len(rows)} rows")
        if alias_rows:
            cur.executemany(
                "INSERT OR REPLACE INTO alias(alias, food_id) VALUES(?,?)", alias_rows
            )
            print(f"🔗 Inserted MyFCD aliases: {len(alias_rows)} rows")

    # Rebuild FTS index with current foods and aliases
    cur.execute("DELETE FROM foods_fts;")
    cur.execute(
        """
        INSERT INTO foods_fts(rowid, name, aliases)
        SELECT f.rowid,
               f.name,
               TRIM(COALESCE(a.aliases, ''))
        FROM foods AS f
        LEFT JOIN (
            SELECT food_id, GROUP_CONCAT(alias, ' ') AS aliases
            FROM alias
            GROUP BY food_id
        ) AS a
        ON a.food_id = f.id;
        """
    )

    con.commit()
    con.close()
    print(f"📦 Done -> {DB}")


if __name__ == "__main__":
    main()
