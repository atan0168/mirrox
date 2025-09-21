import json, re
from pathlib import Path
import pandas as pd

ROOT   = Path(__file__).resolve().parents[1]
RAW    = ROOT / "data" / "raw" / "usda"
BUILD  = ROOT / "data" / "build"
BUILD.mkdir(parents=True, exist_ok=True)

TARGETS = {
    "energy_kcal": {"names": [r"^energy(\s*\(kcal\))?$"], "ids": [1008]},
    "protein_g"  : {"names": [r"^protein$"],               "ids": [1003]},
    "fat_g"      : {"names": [r"(total lipid|total fat)$"],"ids": [1004]},
    "sat_fat_g"  : {"names": [r"saturated fat"],           "ids": [1258]},
    "carb_g"     : {"names": [r"carbohydrate"],            "ids": [1005]},
    "sugar_g"    : {"names": [r"sugars?,?\s*total"],       "ids": [2000]},
    "fiber_g"    : {"names": [r"fiber,?\s*total dietary"], "ids": [1079]},
    "sodium_mg"  : {"names": [r"^sodium$"],                "ids": [1093]},
}

def norm(s: str) -> str:
    import re
    return re.sub(r"\s+", " ", str(s).strip().lower())

# -------- 只读必要列，提速且省内存 --------
def read_food(path: Path) -> pd.DataFrame:
    df = pd.read_csv(
        path,
        usecols=["fdc_id", "description"],
        dtype={"fdc_id": "int64", "description": "string"},
        low_memory=False
    )
    df.columns = [c.lower() for c in df.columns]
    return df

def read_food_nutrient(path: Path) -> pd.DataFrame:
    # 有的版本只有 food_id；有的叫 fdc_id
    try:
        df = pd.read_csv(
            path,
            usecols=["food_id", "nutrient_id", "amount"],
            dtype={"food_id": "Int64", "nutrient_id": "int64", "amount": "float64"},
            low_memory=False
        )
    except ValueError:
        df = pd.read_csv(
            path,
            usecols=["fdc_id", "nutrient_id", "amount"],
            dtype={"fdc_id": "Int64", "nutrient_id": "int64", "amount": "float64"},
            low_memory=False
        ).rename(columns={"fdc_id": "food_id"})
    df.columns = [c.lower() for c in df.columns]
    return df

def read_nutrient(path: Path) -> pd.DataFrame:
    df = pd.read_csv(
        path,
        usecols=["id", "name", "unit_name"],
        dtype={"id": "int64", "name": "string", "unit_name": "string"},
        low_memory=False
    )
    df.columns = [c.lower() for c in df.columns]
    return df
# --------------------------------------

def build_nutrient_map(nutr_df: pd.DataFrame):
    id_to_key = {}
    ids_to_key = {nid: key for key, spec in TARGETS.items() for nid in spec["ids"]}
    for _, r in nutr_df.iterrows():
        nid = int(r["id"])
        if nid in ids_to_key:
            id_to_key[nid] = ids_to_key[nid]
            continue
        name = norm(r.get("name", ""))
        for key, spec in TARGETS.items():
            for pat in spec["names"]:
                if re.search(pat, name, flags=re.I):
                    id_to_key[nid] = key
                    break
    return id_to_key

def main():
    print("Step 1: 读取 CSV ...", flush=True)
    food = read_food(RAW / "food.csv")
    fn   = read_food_nutrient(RAW / "food_nutrient.csv")
    nutr = read_nutrient(RAW / "nutrient.csv")
    print(f"  food={len(food)}  fn={len(fn)}  nutr={len(nutr)}", flush=True)

    print("Step 2: 构建 nutrient 映射 ...", flush=True)
    id_to_key = build_nutrient_map(nutr)
    print(f"  映射 nutrient 种类={len(id_to_key)}", flush=True)

    print("Step 3: 过滤并打标签 ...", flush=True)
    fn = fn[fn["nutrient_id"].isin(id_to_key.keys())].copy()
    fn["target_key"] = fn["nutrient_id"].map(id_to_key)
    print(f"  过滤后行数={len(fn)}", flush=True)

    print("Step 4: pivot（较重，耐心等几秒~1分钟）...", flush=True)
    pivot = fn.pivot_table(
        index="food_id",
        columns="target_key",
        values="amount",
        aggfunc="mean"
    ).reset_index()
    print(f"  pivot 形状={pivot.shape}", flush=True)

    print("Step 5: 合并食物名称 ...", flush=True)
    food_min = food[["fdc_id", "description"]].rename(columns={"fdc_id":"food_id"})
    df = pivot.merge(food_min, on="food_id", how="left")
    print(f"  合并后行数={len(df)}", flush=True)

    print("Step 6: 写出 JSON ...", flush=True)
    items = []
    for _, row in df.iterrows():
        name = norm(row.get("description", ""))
        if not name or name == "nan":
            continue
        rec = {
            "id": f"usda-{int(row['food_id'])}",
            "name": name,
            "aliases": [],
            "category": None,
            "components": [],
            "portion_size": "per 100 g",
            "basis": "per_100g",
            "nutrients": {
                "energy_kcal": float(row.get("energy_kcal", 0) or 0),
                "protein_g":   float(row.get("protein_g",   0) or 0),
                "fat_g":       float(row.get("fat_g",       0) or 0),
                "sat_fat_g":   float(row.get("sat_fat_g",   0) or 0),
                "carb_g":      float(row.get("carb_g",      0) or 0),
                "sugar_g":     float(row.get("sugar_g",     0) or 0),
                "fiber_g":     float(row.get("fiber_g",     0) or 0),
                "sodium_mg":   float(row.get("sodium_mg",   0) or 0),
            },
            "source": "USDA",
            "version": 2025
        }
        items.append(rec)

    out_usda = BUILD / "foods.usda.json"
    with open(out_usda, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"✅ Wrote {len(items)} items -> {out_usda}", flush=True)

if __name__ == "__main__":
    main()
