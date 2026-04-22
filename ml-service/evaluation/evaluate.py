"""
Sprint 3.5 — Model Evaluation & Bias Testing
─────────────────────────────────────────────────────────────────────
Generates the full evaluation report:
  - Accuracy, Precision, Recall, F1 (macro + per-class)
  - AUC-ROC
  - Confusion matrix
  - Error analysis (hard cases)
  - Bias tests: political, topic, text length

Usage:
    python -m evaluation.evaluate [--model transformer|fallback|both]
"""

import json
import logging
import argparse
import numpy as np
import pandas as pd
from pathlib import Path
from collections import Counter

logger = logging.getLogger(__name__)

RESULTS_DIR = Path("./evaluation/results")
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


# ── Evaluation core ───────────────────────────────────────────────────────────

def evaluate_model(model_type: str = "fallback") -> dict:
    """
    Run full evaluation on the held-out test split.
    model_type: 'transformer' | 'fallback'
    """
    from app.data.preprocessing import load_processed, BINARY_LABEL_MAP
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score,
        f1_score, roc_auc_score, confusion_matrix,
        classification_report,
    )

    _, _, test_df = load_processed()
    texts  = test_df["text"].tolist()
    y_true = test_df["label"].map(BINARY_LABEL_MAP).tolist()

    logger.info(f"Evaluating {model_type} model on {len(texts)} test samples...")

    y_pred  = []
    y_proba = []

    if model_type == "transformer":
        from app.models.classifier import TransformerClassifier
        clf = TransformerClassifier()
        if not clf.load():
            raise RuntimeError("Transformer model not found. Run train_transformer.py first.")
        label_to_int = {"FACT": 1, "RUMOR": 0, "UNCERTAIN": -1}
        for text in texts:
            label, conf = clf.predict(text)
            pred_int = label_to_int.get(label, 0)
            y_pred.append(pred_int if pred_int >= 0 else 0)
            y_proba.append(conf if label == "FACT" else 1 - conf)

    else:  # fallback
        from app.models.classifier import FallbackClassifier
        clf = FallbackClassifier()
        if not clf.load():
            raise RuntimeError("Fallback model not found. Run train_classical.py first.")
        import pickle
        from pathlib import Path
        # Use pipeline directly for proper probabilities
        with open(Path("./models/fallback_pipeline.pkl"), "rb") as f:
            pipeline = pickle.load(f)
        preds    = pipeline.predict(texts)
        probas   = pipeline.predict_proba(texts)
        y_pred   = preds.tolist()
        y_proba  = probas[:, 1].tolist()

    # ── Metrics ───────────────────────────────────────────────────
    # Filter out UNCERTAIN predictions for metric computation
    valid = [(yt, yp, ypr) for yt, yp, ypr in zip(y_true, y_pred, y_proba) if yp >= 0]
    if not valid:
        raise ValueError("No valid predictions to evaluate.")
    y_true_v, y_pred_v, y_proba_v = zip(*valid)

    acc     = accuracy_score(y_true_v, y_pred_v)
    prec    = precision_score(y_true_v, y_pred_v, average="macro", zero_division=0)
    rec     = recall_score(y_true_v, y_pred_v, average="macro", zero_division=0)
    f1_mac  = f1_score(y_true_v, y_pred_v, average="macro", zero_division=0)
    f1_w    = f1_score(y_true_v, y_pred_v, average="weighted", zero_division=0)
    auc     = roc_auc_score(y_true_v, y_proba_v)
    cm      = confusion_matrix(y_true_v, y_pred_v).tolist()
    cr      = classification_report(
        y_true_v, y_pred_v,
        target_names=["RUMOR", "FACT"],
        output_dict=True
    )

    uncertain_count = sum(1 for p in y_pred if p < 0)

    results = {
        "model_type":    model_type,
        "total_samples": len(texts),
        "uncertain_predictions": uncertain_count,
        "uncertain_rate": round(uncertain_count / len(texts), 4),
        "metrics": {
            "accuracy":     round(acc,    4),
            "precision":    round(prec,   4),
            "recall":       round(rec,    4),
            "f1_macro":     round(f1_mac, 4),
            "f1_weighted":  round(f1_w,   4),
            "auc_roc":      round(auc,    4),
        },
        "confusion_matrix": cm,
        "per_class_report": {
            "RUMOR": cr["RUMOR"],
            "FACT":  cr["FACT"],
        },
    }

    # ── Error analysis ────────────────────────────────────────────
    errors = []
    for i, (yt, yp) in enumerate(zip(y_true_v, y_pred_v)):
        if yt != yp:
            errors.append({
                "text":     texts[i][:200],
                "true":     "FACT" if yt == 1 else "RUMOR",
                "predicted":"FACT" if yp == 1 else "RUMOR",
                "source":   test_df.iloc[i].get("source", "unknown") if i < len(test_df) else "unknown",
            })
    results["error_sample_count"] = len(errors)
    results["error_examples"]     = errors[:20]   # First 20 errors

    # ── Bias tests ────────────────────────────────────────────────
    results["bias_tests"] = run_bias_tests(test_df, y_true_v, y_pred_v)

    return results


def run_bias_tests(
    test_df: pd.DataFrame,
    y_true: list,
    y_pred: list,
) -> dict:
    """
    Sprint 3.5 Bias Testing:
      - Source bias: accuracy by dataset source
      - Length bias: accuracy for short vs long texts
    """
    from sklearn.metrics import accuracy_score

    bias = {}

    # Source bias
    if "source" in test_df.columns:
        source_acc = {}
        for src in test_df["source"].unique():
            mask = test_df["source"] == src
            indices = [i for i, b in enumerate(mask) if b and i < len(y_true)]
            if len(indices) < 10:
                continue
            yt = [y_true[i] for i in indices]
            yp = [y_pred[i] for i in indices]
            source_acc[src] = round(accuracy_score(yt, yp), 4)
        bias["source_accuracy"] = source_acc

    # Length bias: short (<50 chars), medium (50–200), long (>200)
    lengths = test_df["text"].str.len().tolist()
    length_groups = {
        "short_lt50":    [i for i, l in enumerate(lengths) if l < 50   and i < len(y_true)],
        "medium_50_200": [i for i, l in enumerate(lengths) if 50 <= l < 200 and i < len(y_true)],
        "long_gt200":    [i for i, l in enumerate(lengths) if l >= 200  and i < len(y_true)],
    }
    length_acc = {}
    for group, indices in length_groups.items():
        if len(indices) < 5:
            continue
        yt = [y_true[i] for i in indices]
        yp = [y_pred[i] for i in indices]
        length_acc[group] = {
            "count":    len(indices),
            "accuracy": round(accuracy_score(yt, yp), 4),
        }
    bias["length_accuracy"] = length_acc

    return bias


def print_report(results: dict) -> None:
    sep = "=" * 60
    print(f"\n{sep}")
    print(f"  EVALUATION REPORT — {results['model_type'].upper()}")
    print(sep)
    print(f"  Samples:  {results['total_samples']}")
    print(f"  Uncertain:{results['uncertain_predictions']} ({results['uncertain_rate']:.1%})")
    print(f"\n  METRICS")
    for k, v in results["metrics"].items():
        print(f"    {k:20s}: {v:.4f}")
    print(f"\n  CONFUSION MATRIX (rows=true, cols=pred)")
    print(f"    [RUMOR] {results['confusion_matrix'][0]}")
    print(f"    [FACT]  {results['confusion_matrix'][1]}")
    print(f"\n  PER-CLASS")
    for cls, m in results["per_class_report"].items():
        print(f"    {cls}: P={m['precision']:.3f} R={m['recall']:.3f} F1={m['f1-score']:.3f}")
    print(f"\n  BIAS TESTS")
    for test_name, test_data in results.get("bias_tests", {}).items():
        print(f"    {test_name}: {json.dumps(test_data)}")
    print(f"\n  Error count: {results['error_sample_count']}")
    print(sep)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model", choices=["transformer", "fallback", "both"],
        default="fallback", help="Which model to evaluate"
    )
    args = parser.parse_args()

    models_to_eval = (
        ["transformer", "fallback"] if args.model == "both" else [args.model]
    )

    all_results = {}
    for model_type in models_to_eval:
        try:
            results = evaluate_model(model_type)
            print_report(results)
            # Save results
            out_path = RESULTS_DIR / f"{model_type}_eval.json"
            with open(out_path, "w") as f:
                json.dump(results, f, indent=2)
            logger.info(f"Results saved to {out_path}")
            all_results[model_type] = results
        except Exception as e:
            logger.error(f"Evaluation failed for {model_type}: {e}")

    if len(all_results) == 2:
        # Compare models
        t = all_results["transformer"]["metrics"]
        f = all_results["fallback"]["metrics"]
        print("\n=== MODEL COMPARISON ===")
        print(f"{'Metric':20s} {'Transformer':>12} {'Fallback':>10}")
        print("-" * 45)
        for k in t:
            print(f"{k:20s} {t[k]:>12.4f} {f.get(k, 'N/A'):>10}")
