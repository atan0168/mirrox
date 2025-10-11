# ML Service Utilities

Lightweight scripts for assembling and querying a nutrition database that powers the digital twin project.

## Prerequisites

- Python 3.10 or newer
- [uv](https://docs.astral.sh/uv/) (fast Python package manager)

## Getting Started

```bash
# install project dependencies (creates .venv/)
uv sync

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

## InstaFoodRoBERTa-NER Quantization

Use the provided helper to download and quantize the InstaFoodRoBERTa-NER model for on-device testing:

```bash
uv run python -m scripts.quantize_instafood_roberta \
  --model-id your-org/InstaFoodRoBERTa-NER \
  --output-dir data/models/instafood_roberta_quantized \
  --verify-text "slice the tomato and add it to the bowl"
```

`--verify-text` can be supplied multiple times to confirm the quantized weights behave as expected. The resulting directory contains the tokenizer, a quantized weight snapshot (`instafood_roberta_quantized.pt`), and model metadata for deployment.

If you are on Apple Silicon and encounter `NoQEngine`, ensure your PyTorch build includes a quantized backend (e.g. `qnnpack` or `fbgemm`). The helper will automatically switch to a supported engine when one is available.

To inspect the saved model size:

```bash
ls -lh data/models/instafood_roberta_quantized/instafood_roberta_quantized.pt
```

To reload the quantized model later:

```bash
python - <<'PY'
from pathlib import Path
from ml_service.instafood_quantization import load_quantized_artifact, run_sample_inference

artifact = load_quantized_artifact(Path("data/models/instafood_roberta_quantized"))
print(run_sample_inference(artifact.tokenizer, artifact.model, text="slice the tomato and add it to the bowl"))
PY
```
