#!/usr/bin/env python3
import gzip
import json
import math
import re
import sys
from functools import lru_cache
from hashlib import md5
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw" / "openfoodfacts"
BUILD_DIR = ROOT / "data" / "build"
RAW_FILE = RAW_DIR / "openfoodfacts-products.jsonl.gz"
OUT_FILE = BUILD_DIR / "foods.openfoodfacts.json"

URL = "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"
SALT_TO_SODIUM = 393.66  # mg sodium per gram salt
ALLOWED_COUNTRY_SLUGS = {
    # East Asia
    "china",
    "hong kong",
    "macao",
    "macau",
    "taiwan",
    "japan",
    "south korea",
    "republic of korea",
    "korea republic of",
    "north korea",
    "democratic people s republic of korea",
    # Southeast Asia
    "brunei",
    "cambodia",
    "indonesia",
    "laos",
    "lao people s democratic republic",
    "malaysia",
    "myanmar",
    "burma",
    "philippines",
    "singapore",
    "thailand",
    "timor leste",
    "east timor",
    "vietnam",
    # South Asia
    "afghanistan",
    "bangladesh",
    "bhutan",
    "india",
    "maldives",
    "nepal",
    "pakistan",
    "sri lanka",
    # Asia Pacific / Oceania
    "australia",
    "new zealand",
    "papua new guinea",
    "fiji",
    "solomon islands",
    "vanuatu",
    "samoa",
    "tonga",
    "kiribati",
    "tuvalu",
    "palau",
    "nauru",
    "marshall islands",
    "micronesia",
    "federated states of micronesia",
    "cook islands",
    "niue",
    "tokelau",
    "american samoa",
    "guam",
    "northern mariana islands",
    "new caledonia",
    "french polynesia",
    "wallis and futuna",
    "pitcairn islands",
    # Special Administrative Regions / alternative names
    "hong kong sar china",
    "macau sar china",
    "hksar china",
    "xizang",
    "tibet",
}
ALLOWED_MISC = {"world", "international"}
CATEGORY_SEEDS = [
    "beverage",
    "snack",
    "sauce",
    "canned fish",
    "grocery",
    "noodle",
    "curry",
    "burger",
    "other",
]
CATEGORY_STOPWORDS = {
    "food",
    "foods",
    "product",
    "products",
    "other",
    "miscellaneous",
    "various",
    "and",
    "ready",
    "prepared",
}
PORTION_UNIT_STOPWORDS = {"per", "of", "the", "a", "an", "x"}
MEASURE_PATTERN = re.compile(
    r"(?P<value>\d+(?:[\.,]\d+)?)\s*(?P<unit>ml|milliliters?|millilitres?|l|liters?|litres?|cl|dl|g|grams?|kg|kilograms?)\b",
    flags=re.IGNORECASE,
)
NON_NUMERIC_RE = re.compile(r"[^\d.\-]+")
NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")
NON_ALNUM_SPACE_RE = re.compile(r"[^a-z0-9\s]+")
MULTISPACE_RE = re.compile(r"\s+")
PAREN_RE = re.compile(r"[()]")
WORD_RE = re.compile(r"[A-Za-z]+")


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
                print(f"  ... {total / 1024 / 1024:.1f} MB", flush=True)
            chunk = resp.read(1024 * 1024)
    tmp_path.rename(RAW_FILE)
    print(f"✓ Downloaded {RAW_FILE.stat().st_size / 1024 / 1024:.1f} MB -> {RAW_FILE}")
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
        return float(NON_NUMERIC_RE.sub("", s))
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
    name = product.get("product_name_en")
    if isinstance(name, str) and name.strip():
        return re.sub(r"\s+", " ", name.strip())
    return None


@lru_cache(maxsize=262144)
def norm_key(name: str) -> str:
    return NON_ALNUM_RE.sub(" ", name.lower()).strip()


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


def extract_brands(product: Dict[str, object]) -> list:
    brands = set()
    raw = product.get("brands")
    if isinstance(raw, str):
        for part in raw.split(","):
            b = part.strip()
            if b:
                brands.add(b)
    tags = product.get("brands_tags")
    if isinstance(tags, list):
        for tag in tags:
            if isinstance(tag, str) and ":" in tag:
                brands.add(tag.split(":", 1)[1].replace("-", " ").strip().title())
            elif isinstance(tag, str):
                brands.add(tag.strip())
    return sorted(brands)[:5]


def clean_tag(tag: str) -> str:
    tag = tag.strip()
    if ":" in tag:
        # Remove language prefix like "en:" or "fr:"
        tag = tag.split(":", 1)[1]
    return tag


def extract_food_groups(product: Dict[str, object]) -> list:
    groups = set()
    tags = product.get("food_groups_tags")
    if isinstance(tags, list):
        for tag in tags:
            if isinstance(tag, str):
                groups.add(clean_tag(tag))
    raw = product.get("food_groups")
    if isinstance(raw, str):
        for part in raw.split(","):
            p = clean_tag(part)
            if p:
                groups.add(p)
    return sorted(groups)[:5]


def extract_quantity(product: Dict[str, object]) -> Optional[str]:
    quantity = product.get("quantity")
    if isinstance(quantity, str) and quantity.strip():
        return re.sub(r"\s+", " ", quantity.strip())
    unit = product.get("product_quantity_unit")
    amount = to_float(product.get("product_quantity"))
    if amount is not None:
        if isinstance(unit, str) and unit.strip():
            return f"{amount:g}{unit.strip()}"
        return f"{amount:g}"
    return None


def singularize_token(token: str) -> str:
    if token.endswith("ies") and len(token) > 3:
        return token[:-3] + "y"
    if token.endswith("ses") and len(token) > 3:
        return token[:-2]
    if token.endswith("s") and len(token) > 3:
        return token[:-1]
    return token


@lru_cache(maxsize=65536)
def normalize_category_value(value: str) -> Optional[str]:
    raw = value.strip().lower()
    if not raw:
        return None
    if ":" in raw:
        raw = raw.split(":", 1)[1]
    raw = raw.replace("-", " ").replace("/", " ").replace("&", " ")
    raw = NON_ALNUM_SPACE_RE.sub(" ", raw)
    raw = MULTISPACE_RE.sub(" ", raw).strip()
    return raw or None


@lru_cache(maxsize=65536)
def tokenize_category(norm: str) -> Tuple[str, ...]:
    tokens: List[str] = []
    for part in norm.split():
        if part in CATEGORY_STOPWORDS:
            continue
        token = singularize_token(part)
        if token:
            tokens.append(token)
    return tuple(tokens)


def canonical_category_slug(norm: str, tokens: Sequence[str]) -> str:
    if tokens:
        return "_".join(tokens)
    return norm.replace(" ", "_")


class CategoryResolver:
    def __init__(self, seeds: Optional[Iterable[str]] = None) -> None:
        self.slug_to_category: Dict[str, str] = {}
        self.category_tokens: Dict[str, set[str]] = {}
        self._candidate_cache: Dict[str, Optional[Tuple[str, Tuple[str, ...]]]] = {}
        if seeds:
            self.seed(seeds)

    def seed(self, seeds: Iterable[str]) -> None:
        for name in seeds:
            self._register_seed(name)

    def _register_seed(self, name: str) -> None:
        norm = normalize_category_value(name)
        if not norm:
            return
        tokens = tokenize_category(norm)
        if not tokens:
            return
        slug = canonical_category_slug(norm, tokens)
        if slug in self.slug_to_category:
            category = self.slug_to_category[slug]
            self.category_tokens.setdefault(category, set()).update(tokens)
            return
        self._register_new(slug, tokens)

    def _register_new(self, slug: str, tokens: Sequence[str]) -> str:
        category = slug
        token_set = set(tokens)
        self.slug_to_category[slug] = category
        self.category_tokens.setdefault(category, set()).update(token_set)
        return category

    def _match_existing(self, slug: str, tokens: Sequence[str]) -> Optional[str]:
        if slug in self.slug_to_category:
            return self.slug_to_category[slug]
        token_set = set(tokens)
        core = tokens[-1] if tokens else None
        for existing_slug, category in self.slug_to_category.items():
            existing_tokens = self.category_tokens.get(category, set())
            if core and core in existing_tokens:
                self.slug_to_category[slug] = category
                self.category_tokens[category].update(token_set)
                return category
            overlap = len(token_set & existing_tokens)
            if not overlap:
                continue
            min_len = min(len(token_set), len(existing_tokens))
            max_len = max(len(token_set), len(existing_tokens))
            if overlap == min_len or (max_len and overlap / max_len >= 0.6):
                self.slug_to_category[slug] = category
                self.category_tokens[category].update(token_set)
                return category
        return None

    def resolve(self, raw_candidates: Iterable[object]) -> Optional[str]:
        processed: List[Tuple[str, Tuple[str, ...]]] = []
        seen = set()
        cache = self._candidate_cache
        for raw in raw_candidates:
            if not isinstance(raw, str):
                continue
            cached = cache.get(raw)
            if cached is None and raw not in cache:
                norm = normalize_category_value(raw)
                if not norm:
                    cache[raw] = None
                    continue
                tokens = tokenize_category(norm)
                if not tokens:
                    cache[raw] = None
                    continue
                slug = canonical_category_slug(norm, tokens)
                cache[raw] = (slug, tokens)
                cached = cache[raw]
            if cached is None:
                continue
            else:
                slug, tokens = cached
            if slug in seen:
                continue
            seen.add(slug)
            processed.append((slug, tokens))
        if not processed:
            return None
        processed.sort(key=lambda item: (len(item[1]), len(item[0])))
        for slug, tokens in processed:
            match = self._match_existing(slug, tokens)
            if match:
                return match
        best_slug, best_tokens = processed[0]
        return self._register_new(best_slug, best_tokens)


def extract_category_candidates(product: Dict[str, object]) -> List[str]:
    candidates: List[str] = []
    tags = product.get("categories_tags")
    if isinstance(tags, list):
        english = []
        others = []
        for tag in tags:
            if not isinstance(tag, str):
                continue
            if tag.startswith("en:"):
                english.append(tag)
            else:
                others.append(tag)
        candidates.extend(english)
        candidates.extend(others)
    for key in ("main_category_en", "main_category"):
        val = product.get(key)
        if isinstance(val, str) and val.strip():
            candidates.append(val)
    categories = product.get("categories")
    if isinstance(categories, str):
        for part in categories.split(","):
            part = part.strip()
            if part:
                candidates.append(part)
    seen = set()
    deduped: List[str] = []
    for cand in candidates:
        if cand in seen:
            continue
        seen.add(cand)
        deduped.append(cand)
    return deduped


def round_amount(value: float) -> float:
    rounded = round(value, 2)
    if abs(rounded - round(rounded)) < 1e-6:
        return int(round(rounded))
    return rounded


def convert_amount(
    value: Optional[float], unit: Optional[object], unit_name: str
) -> Optional[Dict[str, object]]:
    if value is None or not isinstance(unit, str):
        return None
    unit_norm = unit.strip().lower()
    if not unit_norm:
        return None
    amount: Optional[float] = None
    key: Optional[str] = None
    if unit_norm in {"ml", "milliliter", "milliliters", "millilitre", "millilitres"}:
        amount = value
        key = "ml"
    elif unit_norm in {"l", "liter", "liters", "litre", "litres"}:
        amount = value * 1000
        key = "ml"
    elif unit_norm == "cl":
        amount = value * 10
        key = "ml"
    elif unit_norm == "dl":
        amount = value * 100
        key = "ml"
    elif unit_norm in {"g", "gram", "grams"}:
        amount = value
        key = "grams"
    elif unit_norm in {"kg", "kilogram", "kilograms"}:
        amount = value * 1000
        key = "grams"
    else:
        return None
    if amount is None or amount <= 0:
        return None
    portion = {"unit": unit_name}
    portion[key] = round_amount(amount)
    return portion


def parse_portion_string(
    text: Optional[object], default_unit: str
) -> Optional[Dict[str, object]]:
    if not isinstance(text, str):
        return None
    cleaned = text.strip()
    if not cleaned:
        return None
    matches = list(MEASURE_PATTERN.finditer(cleaned))
    if not matches:
        return None
    match = matches[0]
    value_str = match.group("value").replace(",", ".")
    value = to_float(value_str)
    unit_name = default_unit
    prefix = PAREN_RE.sub(" ", cleaned[: match.start()]).strip()
    if prefix:
        words = [
            w.lower()
            for w in WORD_RE.findall(prefix)
            if w and w.lower() not in PORTION_UNIT_STOPWORDS
        ]
        if words:
            unit_name = words[-1]
    portion = convert_amount(value, match.group("unit"), unit_name)
    if portion:
        return portion
    return None


def extract_default_portion(
    product: Dict[str, object], basis: str
) -> Dict[str, object]:
    portion = parse_portion_string(product.get("serving_size"), "serving")
    if not portion:
        portion = convert_amount(
            to_float(product.get("serving_quantity")),
            product.get("serving_quantity_unit"),
            "serving",
        )
    if not portion:
        portion = parse_portion_string(product.get("quantity"), "package")
    if not portion:
        portion = convert_amount(
            to_float(product.get("product_quantity")),
            product.get("product_quantity_unit"),
            "package",
        )
    if portion:
        return portion
    if basis == "per_100ml":
        return {"unit": "100ml", "ml": 100}
    return {"unit": "100g", "grams": 100}


def extract_record(
    product: Dict[str, object], resolver: CategoryResolver
) -> Optional[Tuple[str, Dict[str, object], int]]:
    if not product_in_allowed_region(product):
        return None

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
    basis = "per_100ml" if nutrition_basis == "100ml" else "per_100g"

    category = resolver.resolve(extract_category_candidates(product))
    if not category:
        return None

    default_portion = extract_default_portion(product, basis)

    record = {
        "id": choose_id(product, key),
        "name": name,
        "aliases": build_aliases(product, name),
        "category": category,
        "components": [],
        "portion_size": portion,
        "basis": basis,
        "quantity": extract_quantity(product),
        "brands": extract_brands(product),
        "food_groups": extract_food_groups(product),
        "nutrients": nutrients,
        "default_portion": default_portion,
        "source": "OpenFoodFacts",
    }
    return key, record, coverage


@lru_cache(maxsize=65536)
def _normalize_country_str(value: str) -> Optional[str]:
    slug = value.strip().lower()
    if not slug:
        return None
    if ":" in slug:
        slug = slug.split(":", 1)[1]
    slug = slug.replace("_", " ").replace("-", " ")
    slug = NON_ALNUM_SPACE_RE.sub(" ", slug)
    slug = MULTISPACE_RE.sub(" ", slug).strip()
    return slug or None


def normalize_country(value: object) -> Optional[str]:
    if not isinstance(value, str):
        return None
    return _normalize_country_str(value)


def product_in_allowed_region(product: Dict[str, object]) -> bool:
    countries = set()
    tags = product.get("countries_tags")
    if isinstance(tags, list):
        for tag in tags:
            norm = normalize_country(tag)
            if norm:
                countries.add(norm)

    raw = product.get("countries")
    if isinstance(raw, str):
        for part in raw.split(","):
            norm = normalize_country(part)
            if norm:
                countries.add(norm)

    if not countries:
        return False

    allowed_seen = any(c in ALLOWED_COUNTRY_SLUGS for c in countries)
    disallowed_present = any(
        c not in ALLOWED_COUNTRY_SLUGS and c not in ALLOWED_MISC for c in countries
    )
    return allowed_seen and not disallowed_present


def process_export(path: Path) -> None:
    records: Dict[str, Tuple[int, Dict[str, object]]] = {}
    resolver = CategoryResolver(CATEGORY_SEEDS)
    loads = json.loads
    extract = extract_record
    with gzip.open(path, "rt", encoding="utf-8", errors="ignore") as fh:
        for idx, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                product = loads(line)
            except json.JSONDecodeError:
                continue
            result = extract(product, resolver)
            if not result:
                continue
            key, record, coverage = result
            current = records.get(key)
            if not current or coverage > current[0]:
                records[key] = (coverage, record)
            if idx % 250000 == 0:
                print(f"  processed {idx:,} lines | kept {len(records):,}", flush=True)

    items = [rec for _, rec in records.values()]
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
