#!/usr/bin/env python3
# ml_service/scripts/openfoodfacts_to_json.py
import gzip
import json
import math
import re
import sys
from hashlib import md5
from pathlib import Path
from typing import Dict, Optional
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw" / "openfoodfacts"
BUILD_DIR = ROOT / "data" / "build"
RAW_FILE = RAW_DIR / "openfoodfacts-products.jsonl.gz"
OUT_FILE = BUILD_DIR / "foods.openfoodfacts.json"

URL = "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"
SALT_TO_SODIUM = 393.66  # mg sodium per gram salt


def ensure_dirs() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)


def download_if_needed() -> Path:
    if RAW_FILE.exists():
        print(f"✓ Using cached download: {RAW_FILE}")
        return RAW_FILE

    print(f"↓ Downloading OpenFoodFacts export...\n  {URL}")
    tmp_path = RAW_FILE.with_suffix(RAW_FILE.suffix + ".part")
    if tmp_path.exists():
        tmp_path.unlink()
    with urlopen(URL) as resp, tmp_path.open("wb") as fh:
        chunk = resp.read(1024 * 1024)
        total = 0
        while chunk:
            fh.write(chunk)
            total += len(chunk)
            if total % (50 * 1024 * 1024) < len(chunk):
                print(f"  ... {total/1024/1024:.1f} MB", flush=True)
            chunk = resp.read(1024 * 1024)
    tmp_path.rename(RAW_FILE)
    print(f"✓ Downloaded {RAW_FILE.stat().st_size/1024/1024:.1f} MB -> {RAW_FILE}")
    return RAW_FILE


def to_float(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if math.isnan(value):
            return None
        return float(value)
    s = str(value).strip()
    if not s:
        return None
    try:
        return float(re.sub(r"[^\d.\-]+", "", s))
    except ValueError:
        return None


def energy_from_nutriments(nutr: Dict[str, object]) -> Optional[float]:
    for key in ("energy-kcal_100g", "energy-kcal_value", "energy-kcal"):
        val = to_float(nutr.get(key))
        if val is not None:
            return val
    kj = None
    for key in ("energy-kj_100g", "energy_100g", "energy-kj_value", "energy"):
        val = to_float(nutr.get(key))
        if val is not None:
            kj = val
            break
    if kj is not None:
        return kj * 0.239005736
    return None


def sodium_from_nutriments(nutr: Dict[str, object]) -> Optional[float]:
    sodium_g = to_float(nutr.get("sodium_100g"))
    if sodium_g is not None:
        return sodium_g * 1000
    salt_g = to_float(nutr.get("salt_100g"))
    if salt_g is not None:
        return salt_g * SALT_TO_SODIUM
    return None


def pick_name(product: Dict[str, object]) -> Optional[str]:
    candidates = [
        product.get("product_name_en"),
        product.get("product_name"),
        product.get("generic_name_en"),
        product.get("generic_name"),
    ]
    for name in candidates:
        if isinstance(name, str) and name.strip():
            return re.sub(r"\s+", " ", name.strip())
    return None


def norm_key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def choose_id(product: Dict[str, object], name_key: str) -> str:
    code = product.get("code") or product.get("_id")
    if isinstance(code, str) and code.strip():
        return f"off-{code.strip()}"
    digest = md5(name_key.encode()).hexdigest()[:12]
    return f"off-{digest}"


def build_aliases(product: Dict[str, object], name: str) -> list:
    aliases = set()
    for key in (
        "generic_name_en",
        "generic_name",
        "product_name_fr",
        "product_name_de",
        "product_name_es",
    ):
        val = product.get(key)
        if isinstance(val, str):
            aliases.add(re.sub(r"\s+", " ", val.strip()))
    for brand in str(product.get("brands", "")).split(","):
        b = brand.strip()
        if b:
            aliases.add(b)
    aliases.discard(name)
    return sorted(a for a in aliases if len(a) >= 3)[:8]


def extract_record(product: Dict[str, object]) -> Optional[Dict[str, object]]:
    nutr = product.get("nutriments") or {}
    if not isinstance(nutr, dict):
        return None

    energy_kcal = energy_from_nutriments(nutr)
    protein_g = to_float(nutr.get("proteins_100g"))
    fat_g = to_float(nutr.get("fat_100g"))
    sat_fat_g = to_float(nutr.get("saturated-fat_100g"))
    carb_g = to_float(nutr.get("carbohydrates_100g"))
    sugar_g = to_float(nutr.get("sugars_100g"))
    fiber_g = to_float(nutr.get("fiber_100g"))
    sodium_mg = sodium_from_nutriments(nutr)

    nutrients = {
        "energy_kcal": energy_kcal,
        "protein_g": protein_g,
        "fat_g": fat_g,
        "sat_fat_g": sat_fat_g,
        "carb_g": carb_g,
        "sugar_g": sugar_g,
        "fiber_g": fiber_g,
        "sodium_mg": sodium_mg,
    }
    coverage = sum(v is not None for v in nutrients.values())
    if coverage < 2:
        return None

    name = pick_name(product)
    if not name:
        return None
    key = norm_key(name)
    if not key:
        return None

    nutrition_basis = str(product.get("nutrition_data_per") or "").strip().lower()
    portion = "per 100 ml" if nutrition_basis == "100ml" else "per 100 g"

    record = {
        "id": choose_id(product, key),
        "name": name,
        "aliases": build_aliases(product, name),
        "category": None,
        "components": [],
        "portion_size": portion,
        "basis": "per_100ml" if nutrition_basis == "100ml" else "per_100g",
        "nutrients": nutrients,
        "source": "OpenFoodFacts",
        "coverage": coverage,
    }
    return key, record


def process_export(path: Path) -> None:
    records: Dict[str, Dict[str, object]] = {}
    with gzip.open(path, "rt", encoding="utf-8", errors="ignore") as fh:
        for idx, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                product = json.loads(line)
            except json.JSONDecodeError:
                continue
            result = extract_record(product)
            if not result:
                continue
            key, record = result
            current = records.get(key)
            if not current or record["coverage"] > current["coverage"]:
                records[key] = record
            if idx % 250000 == 0:
                print(f"  processed {idx:,} lines | kept {len(records):,}", flush=True)

    items = []
    for rec in records.values():
        rec.pop("coverage", None)
        items.append(rec)
    items.sort(key=lambda r: r["name"].lower())

    with OUT_FILE.open("w", encoding="utf-8") as fh:
        json.dump(items, fh, ensure_ascii=False, indent=2)
    print(f"✓ Wrote {len(items)} records -> {OUT_FILE}")


def main() -> None:
    ensure_dirs()
    try:
        data_path = download_if_needed()
    except Exception as exc:
        print(f"Download failed: {exc}", file=sys.stderr)
        sys.exit(1)
    process_export(data_path)


if __name__ == "__main__":
    main()
