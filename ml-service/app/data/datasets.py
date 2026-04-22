"""
Dataset loading utilities — thin wrappers used by training scripts.
Re-exports the main loaders from preprocessing.py for clean imports.
"""

from app.data.preprocessing import (
    load_liar,
    load_fakenewsnet,
    load_covid_fake,
    load_fever,
    build_combined_dataset,
    balance_classes,
    train_val_test_split,
    load_processed,
    save_processed,
    clean_text,
    combine_claim_parts,
    LABEL_FACT,
    LABEL_RUMOR,
    LABEL_UNCERTAIN,
    BINARY_LABEL_MAP,
)

__all__ = [
    "load_liar", "load_fakenewsnet", "load_covid_fake", "load_fever",
    "build_combined_dataset", "balance_classes", "train_val_test_split",
    "load_processed", "save_processed",
    "clean_text", "combine_claim_parts",
    "LABEL_FACT", "LABEL_RUMOR", "LABEL_UNCERTAIN", "BINARY_LABEL_MAP",
]
