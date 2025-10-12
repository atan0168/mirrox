import sqlite3, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "build" / "nutrition.db"


def classify(n: dict, strategy="conservative"):
    RULES = {
        "high_sugar_g": 20,
        "high_fat_g": 17,
        "low_fiber_g": 3,
        "high_sodium_mg": 600,
    }

    def get(x):
        return (
            None if x is None or (isinstance(x, float) and math.isnan(x)) else float(x)
        )

    sugar, fat, fiber, sodium = map(
        get, (n.get("sugar_g"), n.get("fat_g"), n.get("fiber_g"), n.get("sodium_mg"))
    )
    tags, unk = [], []
    if sugar is None:
        unk.append("sugar_g")
    elif sugar > RULES["high_sugar_g"]:
        tags.append("High Sugar")
    if fat is None:
        unk.append("fat_g")
    elif fat > RULES["high_fat_g"]:
        tags.append("High Fat")
    if fiber is None:
        unk.append("fiber_g")
    elif fiber < RULES["low_fiber_g"]:
        tags.append("Low Fiber")
    if sodium is None:
        unk.append("sodium_mg")
    elif sodium > RULES["high_sodium_mg"]:
        tags.append("High Sodium")
    if len(tags) >= 2:
        tags.append("Unbalanced")
    return {"tags": tags, "unknown": unk}


def search_food(q: str, limit=5):
    q = q.strip().lower()
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    # A. 先查 alias（只来自本地补充，更精准）
    r = cur.execute("SELECT food_id FROM alias WHERE alias = ?", (q,)).fetchone()
    if r:
        food = cur.execute(
            "SELECT * FROM foods WHERE id = ?", (r["food_id"],)
        ).fetchone()
        con.close()
        return [dict(food)] if food else []

    # B. 精确命中（name / short_name）
    rows = cur.execute(
        """
        SELECT * FROM foods 
        WHERE name = ? OR short_name = ?
        LIMIT ?""",
        (q, q, limit),
    ).fetchall()
    if rows:
        con.close()
        return [dict(r) for r in rows]

    # C. 模糊匹配（LIKE；简单可用）
    rows = cur.execute(
        """
        SELECT * FROM foods 
        WHERE name LIKE ? OR short_name LIKE ?
        LIMIT ?""",
        (f"%{q}%", f"%{q}%", limit),
    ).fetchall()
    con.close()
    return [dict(r) for r in rows]


if __name__ == "__main__":
    # demo
    for term in ["roti canai", "teh tarik", "waffle"]:
        res = search_food(term, limit=3)
        print("\n===", term, "===")
        for r in res:
            n = {
                k: r[k]
                for k in [
                    "energy_kcal",
                    "protein_g",
                    "fat_g",
                    "sat_fat_g",
                    "carb_g",
                    "sugar_g",
                    "fiber_g",
                    "sodium_mg",
                ]
            }
            print(r["id"], r["short_name"] or r["name"], n, classify(n))
