"""
Sprint 3.3 — Train TF-IDF + Logistic Regression fallback model.
Fast (~1 min on CPU), ~72% accuracy on LIAR benchmark.

Usage:
    python -m app.training.train_classical

Output:
    models/fallback_pipeline.pkl
"""

import json
import pickle
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
OUTPUT_PATH   = Path("./models/fallback_pipeline.pkl")
OUTPUT_DIR    = Path("./models")
MODEL_VERSION = "fallback-v1.0"


def train(use_processed_cache: bool = True):
    from sklearn.pipeline import Pipeline
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import (
        classification_report, accuracy_score, f1_score, roc_auc_score
    )

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

    X_train = train_df["text"].tolist()
    y_train = train_df["label"].map(BINARY_LABEL_MAP).tolist()
    X_test  = test_df["text"].tolist()
    y_test  = test_df["label"].map(BINARY_LABEL_MAP).tolist()

    logger.info(f"Train: {len(X_train)}  Test: {len(X_test)}")

    # ── 2. Build and train pipeline ───────────────────────────────
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=50_000,
            sublinear_tf=True,
            strip_accents="unicode",
            analyzer="word",
            token_pattern=r"\w{2,}",
            min_df=2,
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=1.0,
            class_weight="balanced",
            solver="lbfgs",
        )),
    ])

    logger.info("Training TF-IDF + LR pipeline...")
    pipeline.fit(X_train, y_train)

    # ── 3. Evaluate ───────────────────────────────────────────────
    y_pred  = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    acc     = accuracy_score(y_test, y_pred)
    f1_mac  = f1_score(y_test, y_pred, average="macro")
    f1_w    = f1_score(y_test, y_pred, average="weighted")
    auc     = roc_auc_score(y_test, y_proba)

    logger.info(f"Accuracy:   {acc:.4f}")
    logger.info(f"F1 Macro:   {f1_mac:.4f}")
    logger.info(f"F1 Weighted:{f1_w:.4f}")
    logger.info(f"AUC-ROC:    {auc:.4f}")
    print("\n" + classification_report(y_test, y_pred, target_names=["RUMOR", "FACT"]))

    # ── 4. Save model ─────────────────────────────────────────────
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "wb") as f:
        pickle.dump(pipeline, f, protocol=pickle.HIGHEST_PROTOCOL)
    logger.info(f"✅ Fallback model saved to {OUTPUT_PATH}")

    # Write version metadata
    version_info = {
        "version": MODEL_VERSION,
        "type": "tfidf_logistic_regression",
        "test_accuracy": round(acc, 4),
        "test_f1_macro": round(f1_mac, 4),
        "test_auc_roc":  round(auc, 4),
    }
    with open(OUTPUT_DIR / "fallback_version.json", "w") as f:
        json.dump(version_info, f, indent=2)

    return {"accuracy": acc, "f1_macro": f1_mac, "auc_roc": auc}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    results = train()
    print(f"\n{'='*50}")
    print("  FALLBACK MODEL TRAINING COMPLETE")
    print(f"  Accuracy : {results['accuracy']:.4f}")
    print(f"  F1 Macro : {results['f1_macro']:.4f}")
    print(f"  AUC-ROC  : {results['auc_roc']:.4f}")
    print(f"{'='*50}")
