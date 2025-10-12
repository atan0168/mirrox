#!/usr/bin/env python
import argparse
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "usda"
DEFAULT_URL = "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_csv_2025-04-24.zip"
TARGET_NAMES = {
    "food.csv",
    "food_nutrient.csv",
    "nutrient.csv",
}


def download_zip(url: str, dst: Path) -> None:
    with urllib.request.urlopen(url) as response, dst.open("wb") as handle:
        shutil.copyfileobj(response, handle)


def select_member(zf: zipfile.ZipFile, target: str) -> zipfile.ZipInfo:
    matches = [
        info
        for info in zf.infolist()
        if not info.is_dir() and info.filename.lower().endswith(target)
    ]
    if not matches:
        raise FileNotFoundError(f"{target} not found in archive")
    if len(matches) > 1:
        raise FileExistsError(
            f"Multiple entries ending with {target}; please adjust the filter"
        )
    return matches[0]


def extract_targets(zip_path: Path, output_dir: Path) -> None:
    with zipfile.ZipFile(zip_path) as zf:
        for name in TARGET_NAMES:
            info = select_member(zf, name)
            target_path = output_dir / name
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as zhandle, tempfile.NamedTemporaryFile(
                delete=False, dir=output_dir, suffix=".tmp"
            ) as tmp:
                shutil.copyfileobj(zhandle, tmp)
                tmp_path = Path(tmp.name)
            tmp_path.replace(target_path)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download and extract the required USDA CSV files."
    )
    parser.add_argument(
        "--url",
        default=DEFAULT_URL,
        help="Zip archive URL from FoodData Central",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=RAW,
        help="Destination directory for the extracted CSV files",
    )
    parser.add_argument(
        "--keep-zip",
        action="store_true",
        help="Retain the downloaded zip alongside the CSV files",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or [])
    args.dest.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmpdir:
        zip_path = Path(tmpdir) / "usda.zip"
        print(f"Downloading {args.url} ...", flush=True)
        download_zip(args.url, zip_path)
        print(f"Extracting CSVs -> {args.dest}", flush=True)
        extract_targets(zip_path, args.dest)

        if args.keep_zip:
            keep_path = args.dest / zip_path.name
            shutil.copy2(zip_path, keep_path)
            print(f"Saved archive to {keep_path}", flush=True)

    print("Done.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
