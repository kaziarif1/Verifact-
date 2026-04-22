"""
Sprint 3.2 — Data Collection & Preparation Pipeline
─────────────────────────────────────────────────────────────────────
Handles loading, cleaning, balancing, and splitting all datasets
before training. Run standalone or imported by training scripts.

Supported datasets:
  - LIAR           (HuggingFace Hub)
  - FakeNewsNet    (CSV files in data/raw/)
  - FEVER          (HuggingFace Hub)
  - COVID-19 Fake  (HuggingFace Hub)

Usage:
    python -m app.data.preprocessing
"""

import re
import html
import logging
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Tuple, Optional
from collections import Counter

logger = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
DATA_DIR     = Path("./data")
RAW_DIR      = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

# ── Label mappings ─────────────────────────────────────────────────────────────
# Final labels used throughout the system
LABEL_FACT    = "FACT"
LABEL_RUMOR   = "RUMOR"
LABEL_UNCERTAIN = "UNCERTAIN"

LIAR_LABEL_MAP = {
    "true": LABEL_FACT,
    "mostly-true": LABEL_FACT,
    "half-true": LABEL_UNCERTAIN,   # genuinely ambiguous → UNCERTAIN
    "false": LABEL_RUMOR,
    "pants-fire": LABEL_RUMOR,
    "barely-true": LABEL_RUMOR,
}

# For binary training (UNCERTAIN excluded from main fine-tune)
BINARY_LABEL_MAP = {LABEL_FACT: 1, LABEL_RUMOR: 0}


# ── Text cleaning ──────────────────────────────────────────────────────────────

def clean_text(text: str, max_chars: int = 1000) -> str:
    """
    Normalize a claim string for model input.
    Steps: HTML decode → URL replace → mention replace →
           whitespace normalize → lowercase → truncate.
    """
    if not isinstance(text, str) or not text.strip():
        return ""

    # Decode HTML entities (e.g. &amp; → &)
    text = html.unescape(text)

    # Replace URLs with token
    text = re.sub(r"https?://\S+|www\.\S+", "[URL]", text)

    # Replace @mentions with generic token
    text = re.sub(r"@\w+", "@user", text)

    # Strip HTML tags
    text = re.sub(r"<[^>]+>", " ", text)

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # Truncate
    return text[:max_chars]


def combine_claim_parts(title: str, body: Optional[str] = None) -> str:
    """Combine title + body with [SEP] separator (as used during training)."""
    if body and body.strip():
        return f"{clean_text(title)} [SEP] {clean_text(body)}"
    return clean_text(title)


# ── Dataset loaders ────────────────────────────────────────────────────────────

def load_liar() -> pd.DataFrame:
    """
    Load LIAR dataset from HuggingFace Hub.
    Returns DataFrame with columns: text, label (FACT/RUMOR/UNCERTAIN).
    """
    from datasets import load_dataset

    logger.info("Loading LIAR dataset from HuggingFace...")
    ds = load_dataset("liar", trust_remote_code=True)

    rows = []
    for split in ["train", "validation", "test"]:
        for ex in ds[split]:
            mapped = LIAR_LABEL_MAP.get(ex["label"])
            if mapped is None:
                continue
            text = combine_claim_parts(
                ex.get("statement", ""),
                ex.get("subject", "")
            )
            if len(text) < 10:
                continue
            rows.append({"text": text, "label": mapped, "source": "liar"})

    df = pd.DataFrame(rows)
    logger.info(f"LIAR loaded: {len(df)} samples — {dict(Counter(df['label']))}")
    return df


def load_fakenewsnet(raw_dir: Path = RAW_DIR) -> pd.DataFrame:
    """
    Load FakeNewsNet CSV files from data/raw/.
    Expects: politifact_real.csv, politifact_fake.csv,
             gossipcop_real.csv, gossipcop_fake.csv
    Each file must have a 'title' column (and optionally 'news_url').
    Returns DataFrame with columns: text, label, source.
    """
    files = {
        "politifact_real.csv": LABEL_FACT,
        "politifact_fake.csv": LABEL_RUMOR,
        "gossipcop_real.csv": LABEL_FACT,
        "gossipcop_fake.csv": LABEL_RUMOR,
    }

    dfs = []
    for filename, label in files.items():
        path = raw_dir / filename
        if not path.exists():
            logger.warning(f"FakeNewsNet file not found: {path} — skipping")
            continue
        df = pd.read_csv(path)
        if "title" not in df.columns:
            logger.warning(f"{filename} missing 'title' column — skipping")
            continue
        subset = pd.DataFrame({
            "text": df["title"].apply(lambda t: clean_text(str(t))),
            "label": label,
            "source": "fakenewsnet",
        })
        subset = subset[subset["text"].str.len() >= 10]
        dfs.append(subset)
        logger.info(f"FakeNewsNet {filename}: {len(subset)} samples")

    if not dfs:
        logger.warning("No FakeNewsNet files found. Skipping this dataset.")
        return pd.DataFrame(columns=["text", "label", "source"])

    combined = pd.concat(dfs, ignore_index=True)
    logger.info(f"FakeNewsNet total: {len(combined)} — {dict(Counter(combined['label']))}")
    return combined


def load_covid_fake() -> pd.DataFrame:
    """
    Load COVID-19 Fake News dataset from HuggingFace.
    Returns DataFrame with columns: text, label, source.
    """
    try:
        from datasets import load_dataset
        logger.info("Loading COVID-19 Fake News dataset...")
        ds = load_dataset("nyu-mll/covid_fake_news", trust_remote_code=True)

        rows = []
        for split in ds.keys():
            for ex in ds[split]:
                label_raw = str(ex.get("label", "")).lower()
                if "fake" in label_raw or label_raw == "0":
                    label = LABEL_RUMOR
                elif "real" in label_raw or label_raw == "1":
                    label = LABEL_FACT
                else:
                    continue
                text = clean_text(str(ex.get("tweet", ex.get("text", ""))))
                if len(text) < 10:
                    continue
                rows.append({"text": text, "label": label, "source": "covid_fake"})

        df = pd.DataFrame(rows)
        logger.info(f"COVID Fake News loaded: {len(df)} — {dict(Counter(df['label']))}")
        return df
    except Exception as e:
        logger.warning(f"Could not load COVID Fake News dataset: {e} — skipping")
        return pd.DataFrame(columns=["text", "label", "source"])


def load_fever() -> pd.DataFrame:
    """
    Load FEVER (Fact Extraction and VERification) dataset.
    Maps SUPPORTS→FACT, REFUTES→RUMOR, NOT ENOUGH INFO→UNCERTAIN.
    Returns DataFrame with columns: text, label, source.
    """
    try:
        from datasets import load_dataset
        logger.info("Loading FEVER dataset...")
        ds = load_dataset("fever", "v1.0", trust_remote_code=True)

        fever_map = {
            "SUPPORTS": LABEL_FACT,
            "REFUTES": LABEL_RUMOR,
            "NOT ENOUGH INFO": LABEL_UNCERTAIN,
        }

        rows = []
        for split in ["train", "paper_dev"]:
            if split not in ds:
                continue
            for ex in ds[split]:
                label = fever_map.get(ex.get("label", ""))
                if label is None or label == LABEL_UNCERTAIN:
                    continue  # Skip uncertain for FEVER (too noisy)
                text = clean_text(str(ex.get("claim", "")))
                if len(text) < 10:
                    continue
                rows.append({"text": text, "label": label, "source": "fever"})

        df = pd.DataFrame(rows)
        logger.info(f"FEVER loaded: {len(df)} — {dict(Counter(df['label']))}")
        return df
    except Exception as e:
        logger.warning(f"Could not load FEVER dataset: {e} — skipping")
        return pd.DataFrame(columns=["text", "label", "source"])


# ── Dataset assembly ───────────────────────────────────────────────────────────

def build_combined_dataset(include_fever: bool = False) -> pd.DataFrame:
    """
    Load and merge all datasets into a single cleaned DataFrame.
    Removes duplicates, filters short texts.
    """
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    dfs = [load_liar(), load_fakenewsnet(), load_covid_fake()]
    if include_fever:
        dfs.append(load_fever())

    combined = pd.concat(dfs, ignore_index=True)

    # Remove rows with empty text
    combined = combined[combined["text"].str.strip().str.len() >= 10]

    # Remove exact duplicates (same text)
    before = len(combined)
    combined = combined.drop_duplicates(subset=["text"])
    logger.info(f"Removed {before - len(combined)} duplicate rows")

    # Filter to binary labels only (FACT / RUMOR) for fine-tuning
    # UNCERTAIN rows can be kept for display but not used in binary training
    binary = combined[combined["label"].isin([LABEL_FACT, LABEL_RUMOR])].copy()
    logger.info(f"Combined binary dataset: {len(binary)} — {dict(Counter(binary['label']))}")

    return binary


def balance_classes(df: pd.DataFrame, strategy: str = "oversample") -> pd.DataFrame:
    """
    Balance FACT / RUMOR classes.
    strategy: 'oversample' (default) | 'undersample' | 'weights'
    """
    counts = Counter(df["label"])
    logger.info(f"Before balancing: {dict(counts)}")

    if strategy == "oversample":
        max_count = max(counts.values())
        parts = []
        for label in [LABEL_FACT, LABEL_RUMOR]:
            subset = df[df["label"] == label]
            if len(subset) < max_count:
                oversampled = subset.sample(max_count - len(subset), replace=True, random_state=42)
                subset = pd.concat([subset, oversampled], ignore_index=True)
            parts.append(subset)
        balanced = pd.concat(parts, ignore_index=True).sample(frac=1, random_state=42)

    elif strategy == "undersample":
        min_count = min(counts.values())
        parts = [df[df["label"] == label].sample(min_count, random_state=42)
                 for label in [LABEL_FACT, LABEL_RUMOR]]
        balanced = pd.concat(parts, ignore_index=True).sample(frac=1, random_state=42)

    else:
        return df  # No balancing; caller uses class_weight

    logger.info(f"After balancing: {dict(Counter(balanced['label']))}")
    return balanced


def train_val_test_split(
    df: pd.DataFrame, train_ratio=0.8, val_ratio=0.1
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Stratified 80/10/10 split.
    Returns (train, val, test) DataFrames.
    """
    from sklearn.model_selection import train_test_split

    # Add numeric label for stratification
    df = df.copy()
    df["label_id"] = df["label"].map(BINARY_LABEL_MAP)

    test_ratio = 1 - train_ratio - val_ratio

    X_train, X_temp, y_train, y_temp = train_test_split(
        df, df["label_id"], test_size=(1 - train_ratio), random_state=42, stratify=df["label_id"]
    )
    relative_val = val_ratio / (val_ratio + test_ratio)
    X_val, X_test, _, _ = train_test_split(
        X_temp, y_temp, test_size=(1 - relative_val), random_state=42, stratify=y_temp
    )

    logger.info(f"Split → train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")
    return X_train.reset_index(drop=True), X_val.reset_index(drop=True), X_test.reset_index(drop=True)


def eda_report(df: pd.DataFrame) -> dict:
    """
    Sprint 3.2 EDA — Exploratory Data Analysis.
    Returns dict of statistics for logging / reporting.
    """
    text_lengths = df["text"].str.len()
    word_counts = df["text"].str.split().str.len()

    label_dist = dict(Counter(df["label"]))
    source_dist = dict(Counter(df.get("source", pd.Series(["unknown"] * len(df)))))

    report = {
        "total_samples": len(df),
        "label_distribution": label_dist,
        "source_distribution": source_dist,
        "text_length": {
            "mean": round(float(text_lengths.mean()), 1),
            "median": round(float(text_lengths.median()), 1),
            "min": int(text_lengths.min()),
            "max": int(text_lengths.max()),
            "p95": round(float(np.percentile(text_lengths, 95)), 1),
        },
        "word_count": {
            "mean": round(float(word_counts.mean()), 1),
            "median": round(float(word_counts.median()), 1),
            "max": int(word_counts.max()),
        },
    }

    logger.info("=== EDA Report ===")
    for k, v in report.items():
        logger.info(f"  {k}: {v}")

    return report


def save_processed(
    train: pd.DataFrame, val: pd.DataFrame, test: pd.DataFrame
) -> None:
    """Save processed splits to CSV for reproducibility."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    train.to_csv(PROCESSED_DIR / "train.csv", index=False)
    val.to_csv(PROCESSED_DIR / "val.csv", index=False)
    test.to_csv(PROCESSED_DIR / "test.csv", index=False)
    logger.info(f"Saved processed splits to {PROCESSED_DIR}")


def load_processed() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load already-processed CSV splits (fast path if preprocessing was done)."""
    train = pd.read_csv(PROCESSED_DIR / "train.csv")
    val   = pd.read_csv(PROCESSED_DIR / "val.csv")
    test  = pd.read_csv(PROCESSED_DIR / "test.csv")
    logger.info(f"Loaded processed splits → train={len(train)}, val={len(val)}, test={len(test)}")
    return train, val, test


# ── CLI entrypoint ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    logger.info("=== Verifact Data Pipeline (Sprint 3.2) ===")

    df = build_combined_dataset(include_fever=False)
    report = eda_report(df)

    print("\n=== EDA SUMMARY ===")
    print(json.dumps(report, indent=2))

    df_balanced = balance_classes(df, strategy="oversample")
    train, val, test = train_val_test_split(df_balanced)
    save_processed(train, val, test)

    print("\n=== DATA PIPELINE COMPLETE ===")
    print(f"Train: {len(train)} | Val: {len(val)} | Test: {len(test)}")
