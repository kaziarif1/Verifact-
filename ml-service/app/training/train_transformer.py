"""
Sprint 3.3 — Fine-tune RoBERTa on LIAR + FakeNewsNet datasets.

Usage (from ml-service/ root):
    python -m app.training.train_transformer

Requirements:
    - GPU recommended (Google Colab T4 / Kaggle P100 / local CUDA)
    - pip install -r requirements.txt
    - Optionally download FakeNewsNet CSVs to data/raw/ first

Output:
    - Fine-tuned model saved to models/roberta-verifact/
    - Evaluation report printed to stdout
"""

import os
import json
import logging
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

OUTPUT_DIR   = Path("./models/roberta-verifact")
BASE_MODEL   = "cardiffnlp/twitter-roberta-base-sentiment-latest"
NUM_LABELS   = 2   # 0=RUMOR, 1=FACT
MODEL_VERSION = "v1.0"


def compute_metrics(eval_pred):
    from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    probs = _softmax(logits)[:, 1]  # prob of FACT class

    return {
        "accuracy":  round(accuracy_score(labels, preds), 4),
        "f1_macro":  round(f1_score(labels, preds, average="macro"), 4),
        "f1_weighted": round(f1_score(labels, preds, average="weighted"), 4),
        "auc_roc":   round(roc_auc_score(labels, probs), 4),
    }


def _softmax(logits: np.ndarray) -> np.ndarray:
    e = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)


def train(use_processed_cache: bool = True):
    import torch
    from transformers import (
        AutoTokenizer,
        AutoModelForSequenceClassification,
        TrainingArguments,
        Trainer,
        DataCollatorWithPadding,
        EarlyStoppingCallback,
    )
    from datasets import Dataset as HFDataset

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Training on: {device}")

    # ── 1. Load data ──────────────────────────────────────────────
    from app.data.preprocessing import (
        build_combined_dataset, balance_classes,
        train_val_test_split, load_processed, save_processed,
        BINARY_LABEL_MAP,
    )

    processed_path = Path("./data/processed/train.csv")
    if use_processed_cache and processed_path.exists():
        logger.info("Loading from processed cache...")
        train_df, val_df, test_df = load_processed()
    else:
        logger.info("Building dataset from scratch...")
        df = build_combined_dataset()
        df_balanced = balance_classes(df, strategy="oversample")
        train_df, val_df, test_df = train_val_test_split(df_balanced)
        save_processed(train_df, val_df, test_df)

    # ── 2. Tokenize ───────────────────────────────────────────────
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)

    def to_hf_dataset(df):
        return HFDataset.from_dict({
            "text":   df["text"].tolist(),
            "labels": df["label"].map(BINARY_LABEL_MAP).tolist(),
        })

    def tokenize_fn(batch):
        return tokenizer(
            batch["text"],
            truncation=True,
            max_length=512,
            padding=False,    # DataCollatorWithPadding handles this
        )

    train_ds = to_hf_dataset(train_df).map(tokenize_fn, batched=True, remove_columns=["text"])
    val_ds   = to_hf_dataset(val_df).map(tokenize_fn,   batched=True, remove_columns=["text"])
    test_ds  = to_hf_dataset(test_df).map(tokenize_fn,  batched=True, remove_columns=["text"])

    # ── 3. Load model ─────────────────────────────────────────────
    model = AutoModelForSequenceClassification.from_pretrained(
        BASE_MODEL,
        num_labels=NUM_LABELS,
        ignore_mismatched_sizes=True,
        id2label={0: "RUMOR", 1: "FACT"},
        label2id={"RUMOR": 0, "FACT": 1},
    )
    model.to(device)

    # ── 4. Training arguments ─────────────────────────────────────
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    args = TrainingArguments(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=3,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=32,
        learning_rate=2e-5,
        weight_decay=0.01,
        warmup_ratio=0.1,
        lr_scheduler_type="linear",
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        greater_is_better=True,
        logging_steps=50,
        fp16=(device == "cuda"),
        dataloader_num_workers=2,
        report_to="none",
        seed=42,
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        tokenizer=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
    )

    # ── 5. Train ──────────────────────────────────────────────────
    logger.info("Starting fine-tuning...")
    trainer.train()

    # ── 6. Evaluate on test set ───────────────────────────────────
    logger.info("Evaluating on held-out test set...")
    test_results = trainer.evaluate(test_ds)
    logger.info(f"Test results: {test_results}")

    # ── 7. Save model + version tag ───────────────────────────────
    trainer.save_model(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))

    # Write version file so classifier.py can read it
    version_info = {
        "version": MODEL_VERSION,
        "base_model": BASE_MODEL,
        "num_labels": NUM_LABELS,
        "label_map": {"0": "RUMOR", "1": "FACT"},
        "test_metrics": test_results,
    }
    with open(OUTPUT_DIR / "version.json", "w") as f:
        json.dump(version_info, f, indent=2)

    logger.info(f"✅ Model saved to {OUTPUT_DIR}")
    return test_results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    results = train()
    print(f"\n{'='*55}")
    print("  TRAINING COMPLETE — RoBERTa Fine-Tune")
    print(f"{'='*55}")
    for k, v in results.items():
        if k.startswith("eval_"):
            print(f"  {k[5:]:20s}: {v:.4f}" if isinstance(v, float) else f"  {k[5:]:20s}: {v}")
    print(f"{'='*55}")
