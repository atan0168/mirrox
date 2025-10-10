# ML Service Utilities

Lightweight scripts for assembling and querying a nutrition database that powers the digital twin project.

## Prerequisites

- Python 3.10 or newer
- [uv](https://docs.astral.sh/uv/) (fast Python package manager)

## Getting Started

```bash
# install project dependencies (creates .venv/)
uv sync

# build the USDA dataset into JSON
uv run python scripts/usda_to_json.py

# rebuild the SQLite nutrition database (after creating build JSON)
uv run python scripts/build_nutrition_db.py

# search demo (requires the SQLite database)
uv run python scripts/search_food.py
```

All commands run inside an isolated virtual environment managed by uv. To open an interactive shell with the environment activated, run:

```bash
uv shell
```

The development group defined in `pyproject.toml` can be installed with:

```bash
uv sync --group dev
```
