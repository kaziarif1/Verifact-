"""
Verifact ML Classifier (Sprint 3.3 / 3.4)
─────────────────────────────────────────────────────────────────────
Primary:  Fine-tuned RoBERTa (loaded from models/roberta-verifact/)
Fallback: TF-IDF + Logistic Regression (models/fallback_pipeline.pkl)

Loads once at startup, all inference is thread-pool safe.
"""

import os
import re
import html
import json
import time
import logging
import pickle
from typing import Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_DIR = Path(os.getenv("MODEL_PATH", "./models"))
TRANSFORMER_DIR  = MODEL_DIR / "roberta-verifact"
FALLBACK_PATH    = MODEL_DIR / "fallback_pipeline.pkl"
BASE_MODEL_NAME  = "cardiffnlp/twitter-roberta-base-sentiment-latest"

# Confidence threshold — below this we return UNCERTAIN
CONFIDENCE_THRESHOLD = 0.55


# ── Text preprocessing ────────────────────────────────────────────────────────

def preprocess_text(text: str, max_chars: int = 1000) -> str:
    """Clean and normalize claim text for model input."""
    if not isinstance(text, str):
        return ""
    text = html.unescape(text)
    text = re.sub(r"https?://\S+|www\.\S+", "[URL]", text)
    text = re.sub(r"@\w+", "@user", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


# ── Transformer classifier ────────────────────────────────────────────────────

class TransformerClassifier:
    """Fine-tuned RoBERTa for binary FACT/RUMOR classification."""

    def __init__(self):
        self.model     = None
        self.tokenizer = None
        self.device    = "cpu"
        self.loaded    = False
        self._version  = "v1.0"
        # id2label from the model config (0=RUMOR, 1=FACT for fine-tuned model;
        # sentiment model: 0=negative, 1=neutral, 2=positive)
        self._label_map: dict[int, str] = {}

    @property
    def version(self) -> str:
        return self._version

    def load(self) -> bool:
        try:
            import torch
            from transformers import AutoTokenizer, AutoModelForSequenceClassification

            self.device = "cuda" if torch.cuda.is_available() else "cpu"

            if TRANSFORMER_DIR.exists():
                logger.info(f"Loading fine-tuned model from {TRANSFORMER_DIR}")
                self.tokenizer = AutoTokenizer.from_pretrained(str(TRANSFORMER_DIR))
                self.model     = AutoModelForSequenceClassification.from_pretrained(
                    str(TRANSFORMER_DIR)
                )
                # Load version from version.json if present
                version_file = TRANSFORMER_DIR / "version.json"
                if version_file.exists():
                    with open(version_file) as f:
                        meta = json.load(f)
                    self._version = meta.get("version", "v1.0")
                    # Build label map: {"0": "RUMOR", "1": "FACT"} → {0: "RUMOR", 1: "FACT"}
                    label_map = meta.get("label_map", {})
                    self._label_map = {int(k): v for k, v in label_map.items()}
                else:
                    # Fine-tuned model defaults
                    self._label_map = {0: "RUMOR", 1: "FACT"}

            else:
                # No fine-tuned model — load base sentiment model as placeholder
                logger.warning(
                    "Fine-tuned model not found. Using base sentiment model (placeholder). "
                    "Run: python -m app.training.train_transformer"
                )
                self.tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)
                self.model     = AutoModelForSequenceClassification.from_pretrained(
                    BASE_MODEL_NAME
                )
                # Base sentiment model: 0=negative→RUMOR, 1=neutral→UNCERTAIN, 2=positive→FACT
                self._label_map = {0: "RUMOR", 1: "UNCERTAIN", 2: "FACT"}
                self._version = "base-sentiment-placeholder"

            self.model.to(self.device)
            self.model.eval()
            self.loaded = True
            logger.info(f"Transformer loaded ✅ (version={self._version}, device={self.device})")
            return True

        except Exception as e:
            logger.error(f"Failed to load transformer: {e}")
            self.loaded = False
            return False

    def predict(self, text: str) -> Tuple[str, float]:
        """Returns (label, confidence). Thread-safe (no_grad + eval mode)."""
        import torch

        processed = preprocess_text(text)
        inputs = self.tokenizer(
            processed,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True,
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            logits = self.model(**inputs).logits
            probs  = torch.softmax(logits, dim=-1).squeeze().tolist()

        # Handle single-class edge case
        if isinstance(probs, float):
            probs = [probs]

        max_prob = max(probs)
        max_idx  = probs.index(max_prob)

        # Below threshold → UNCERTAIN
        if max_prob < CONFIDENCE_THRESHOLD:
            return "UNCERTAIN", round(max_prob, 4)

        label = self._label_map.get(max_idx, "UNCERTAIN")
        return label, round(max_prob, 4)


# ── Fallback classifier ───────────────────────────────────────────────────────

class FallbackClassifier:
    """TF-IDF + Logistic Regression — loads in <1 s, ~72% accuracy."""

    def __init__(self):
        self.pipeline = None
        self.loaded   = False
        self._version = "fallback-v1.0"

    @property
    def version(self) -> str:
        return self._version

    def load(self) -> bool:
        if not FALLBACK_PATH.exists():
            logger.warning(
                f"Fallback model not found at {FALLBACK_PATH}. "
                "Run: python -m app.training.train_classical"
            )
            return False
        try:
            with open(FALLBACK_PATH, "rb") as f:
                self.pipeline = pickle.load(f)

            # Load version if present
            version_file = MODEL_DIR / "fallback_version.json"
            if version_file.exists():
                with open(version_file) as f:
                    meta = json.load(f)
                self._version = meta.get("version", "fallback-v1.0")

            self.loaded = True
            logger.info(f"Fallback classifier loaded ✅ (version={self._version})")
            return True
        except Exception as e:
            logger.error(f"Failed to load fallback model: {e}")
            return False

    def predict(self, text: str) -> Tuple[str, float]:
        if not self.loaded or self.pipeline is None:
            return self._heuristic_predict(text)

        processed = preprocess_text(text)
        try:
            proba     = self.pipeline.predict_proba([processed])[0]
            label_idx = int(proba.argmax())
            confidence = round(float(proba[label_idx]), 4)
            # Pipeline was trained: 0=RUMOR, 1=FACT
            label_map = {0: "RUMOR", 1: "FACT"}
            label = label_map.get(label_idx, "UNCERTAIN")
            if confidence < CONFIDENCE_THRESHOLD:
                return "UNCERTAIN", confidence
            return label, confidence
        except Exception as e:
            logger.error(f"Fallback predict error: {e}")
            return self._heuristic_predict(text)

    @staticmethod
    def _heuristic_predict(text: str) -> Tuple[str, float]:
        """Last-resort keyword heuristic when no model is available."""
        rumor_kw = ["allegedly", "unconfirmed", "rumor", "fake", "hoax", "debunked", "viral lie", "misleading"]
        fact_kw  = ["confirmed", "verified", "official", "study shows", "according to", "proven", "announced"]
        tl = text.lower()
        r_hits = sum(1 for kw in rumor_kw if kw in tl)
        f_hits = sum(1 for kw in fact_kw  if kw in tl)
        if r_hits > f_hits:
            return "RUMOR", 0.55
        if f_hits > r_hits:
            return "FACT", 0.55
        return "UNCERTAIN", 0.50


# ── Unified interface ─────────────────────────────────────────────────────────

class VerifactClassifier:
    """
    Top-level classifier:
      1. Try transformer
      2. Fall back to TF-IDF+LR on failure
      3. Fall back to keyword heuristic if nothing loaded
    """

    def __init__(self):
        self.transformer = TransformerClassifier()
        self.fallback    = FallbackClassifier()
        self._primary_ok = False

    def startup(self) -> None:
        logger.info("Initializing Verifact classifier...")
        self._primary_ok = self.transformer.load()
        self.fallback.load()   # Always try — used as safety net
        status = "transformer+fallback" if self._primary_ok else (
            "fallback only" if self.fallback.loaded else "heuristic only"
        )
        logger.info(f"Classifier ready — mode: {status}")

    @property
    def is_loaded(self) -> bool:
        return self._primary_ok or self.fallback.loaded

    @property
    def current_version(self) -> str:
        return self.transformer.version if self._primary_ok else self.fallback.version

    @property
    def device(self) -> str:
        return self.transformer.device if self._primary_ok else "cpu"

    def predict(self, text: str) -> dict:
        start = time.perf_counter()

        if self._primary_ok:
            try:
                label, confidence = self.transformer.predict(text)
                model_version = self.transformer.version
            except Exception as e:
                logger.error(f"Transformer failed, using fallback: {e}")
                label, confidence = self.fallback.predict(text)
                model_version = self.fallback.version
        else:
            label, confidence = self.fallback.predict(text)
            model_version = self.fallback.version

        processing_ms = round((time.perf_counter() - start) * 1000, 2)

        return {
            "label":             label,
            "confidence":        confidence,
            "model_version":     model_version,
            "processing_time_ms": processing_ms,
        }


# Singleton — loaded once at startup, shared across all requests
classifier = VerifactClassifier()
