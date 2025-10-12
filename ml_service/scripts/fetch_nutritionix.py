#!/usr/bin/env python3
"""Fetch fruit nutrition data from Nutritionix and store it in the build folder."""

from __future__ import annotations

import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
BUILD_DIR = ROOT / "data" / "build"
FRUITS_CSV = RAW_DIR / "fruitsnutrition.csv"
MAPPING_CSV = RAW_DIR / "nutritionix-api-mapping.csv"
OUT_FILE = BUILD_DIR / "foods.nutritionix.json"

BASE_URL = "https://www.nutritionix.com/nixapi/search/en_US"
REQUEST_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "ml-service/0.1 (+https://github.com/)",
}

# Only keep fields we can reliably map into our nutrition DB.
FIELD_TRANSLATION = {
    "nf_calories": "energy_kcal",
    "nf_protein": "protein_g",
    "nf_total_fat": "fat_g",
    "nf_saturated_fat": "sat_fat_g",
    "nf_total_carbohydrate": "carb_g",
    "nf_sugars": "sugar_g",
    "nf_dietary_fiber": "fiber_g",
    "nf_sodium": "sodium_mg",
}


@dataclass(frozen=True)
class FruitRecord:
    query: str
    raw: Optional[dict]
    error: Optional[str] = None


def ensure_dirs() -> None:
    BUILD_DIR.mkdir(parents=True, exist_ok=True)


def load_fruit_queries() -> List[str]:
    if not FRUITS_CSV.exists():
        raise FileNotFoundError(f"Missing fruits CSV: {FRUITS_CSV}")
    queries: List[str] = []
    seen = set()
    with FRUITS_CSV.open("r", newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            fruit = (row.get("fruit") or "").strip()
            if not fruit:
                continue
            fruit = fruit.strip('"').rstrip(",").strip()
            if fruit and fruit.lower() not in seen:
                seen.add(fruit.lower())
                queries.append(fruit)
    return queries


def load_attr_mapping() -> Dict[int, str]:
    if not MAPPING_CSV.exists():
        raise FileNotFoundError(f"Missing Nutritionix mapping CSV: {MAPPING_CSV}")
    mapping: Dict[int, str] = {}
    with MAPPING_CSV.open("r", newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if not row or not row.get("attr_id"):
                continue
            try:
                attr_id = int(row["attr_id"])
            except ValueError:
                continue
            field = FIELD_TRANSLATION.get(row.get("bulk_csv_field", ""))
            if field:
                mapping[attr_id] = field
    return mapping


def http_get(url: str) -> dict:
    request = urllib.request.Request(url, headers=REQUEST_HEADERS)
    with urllib.request.urlopen(request, timeout=15) as response:
        if response.status != 200:
            raise RuntimeError(f"Unexpected status {response.status}")
        data = response.read()
    return json.loads(data.decode("utf-8"))


def fetch_fruit(term: str) -> FruitRecord:
    query = urllib.parse.urlencode({"q": term})
    url = f"{BASE_URL}?{query}"
    try:
        payload = http_get(url)
    except urllib.error.URLError as exc:
        return FruitRecord(term, None, error=f"network error: {exc}")
    except Exception as exc:  # pragma: no cover - defensive
        return FruitRecord(term, None, error=str(exc))

    foods = payload.get("foods")
    if not foods:
        return FruitRecord(term, None, error="no results")
    return FruitRecord(term, foods[0])


def to_float(value: object) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def extract_nutrients(food: dict, attr_map: Dict[int, str]) -> Dict[str, Optional[float]]:
    nutrients: Dict[str, Optional[float]] = {field: None for field in FIELD_TRANSLATION.values()}

    for nutrient in food.get("full_nutrients", []) or []:
        attr_id = nutrient.get("attr_id")
        if not isinstance(attr_id, int):
            continue
        field = attr_map.get(attr_id)
        if not field:
            continue
        value = to_float(nutrient.get("value"))
        if value is not None:
            nutrients[field] = value

    fallback_sources = {
        "energy_kcal": ("nf_calories",),
        "protein_g": ("nf_protein",),
        "fat_g": ("nf_total_fat",),
        "sat_fat_g": ("nf_saturated_fat",),
        "carb_g": ("nf_total_carbohydrate",),
        "sugar_g": ("nf_sugars",),
        "fiber_g": ("nf_dietary_fiber",),
        "sodium_mg": ("nf_sodium",),
    }
    for field, keys in fallback_sources.items():
        if nutrients[field] is not None:
            continue
        for key in keys:
            val = to_float(food.get(key))
            if val is not None:
                nutrients[field] = val
                break
    return nutrients


def build_record(food: dict, nutrients: Dict[str, Optional[float]]) -> dict:
    serving_qty = to_float(food.get("serving_qty")) or 1.0
    serving_unit = (food.get("serving_unit") or "").strip() or "serving"
    quantity = f"{serving_qty:g} {serving_unit}"

    aliases = []
    for key in ("tag_name", "food_name", "brand_name"):
        value = food.get(key)
        if isinstance(value, str):
            norm = value.strip()
            if norm and norm.lower() != (food.get("food_name") or "").strip().lower():
                aliases.append(norm)

    photo = food.get("photo") or {}
    return {
        "id": f"nutritionix-{food.get('tag_id') or food.get('nix_item_id') or food.get('food_name')}",
        "name": food.get("food_name") or food.get("tag_name") or "Unknown Food",
        "aliases": aliases,
        "category": None,
        "components": [],
        "portion_size": quantity,
        "basis": "per_serving",
        "quantity": quantity,
        "brands": [food["brand_name"]] if isinstance(food.get("brand_name"), str) else [],
        "food_groups": [],
        "nutrients": nutrients,
        "source": "Nutritionix",
        "serving_weight_grams": to_float(food.get("serving_weight_grams")),
        "photo_thumb": photo.get("thumb"),
    }


def collect_records(records: Iterable[FruitRecord], attr_map: Dict[int, str]) -> List[dict]:
    out: List[dict] = []
    for record in records:
        if record.error:
            print(f"⚠️  {record.query}: {record.error}", file=sys.stderr)
            continue
        nutrients = extract_nutrients(record.raw or {}, attr_map)
        out.append(build_record(record.raw or {}, nutrients))
    return out


def main() -> None:
    ensure_dirs()
    attr_map = load_attr_mapping()
    fruits = load_fruit_queries()
    results: List[FruitRecord] = []

    for idx, fruit in enumerate(fruits, start=1):
        print(f"[{idx}/{len(fruits)}] Fetching {fruit}...")
        record = fetch_fruit(fruit)
        results.append(record)
        if record.error:
            print(f"   -> skipped ({record.error})")
        else:
            print("   -> ok")
        time.sleep(0.2)  # gentle pacing

    nutritionix_data = collect_records(results, attr_map)
    with OUT_FILE.open("w", encoding="utf-8") as fh:
        json.dump(nutritionix_data, fh, ensure_ascii=True, indent=2)
    print(f"✓ Saved {len(nutritionix_data)} foods -> {OUT_FILE}")


if __name__ == "__main__":
    main()
