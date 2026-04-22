"""
Sprint 3.4 — FastAPI endpoints with rate limiting and full validation.

Endpoints:
  POST /predict      — classify a claim (auth required)
  GET  /health       — health check (public)
  GET  /model-info   — model metadata (public)
"""

import os
import time
import logging
from collections import defaultdict
from threading import Lock
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Depends, Request
from fastapi.responses import JSONResponse

from app.models.schemas import (
    PredictRequest, PredictResponse, HealthResponse,
    ModelInfoResponse, PredictionLabel,
)
from app.models.classifier import classifier

logger = logging.getLogger(__name__)
router = APIRouter()

INTERNAL_KEY = os.getenv("ML_INTERNAL_KEY", "")


# ── Rate limiter (in-memory, per IP) ─────────────────────────────────────────
# Sprint 3.4: 1000 requests / hour per client IP

class _RateLimiter:
    WINDOW   = 3600     # 1 hour in seconds
    MAX_REQS = 1000     # max requests per window

    def __init__(self):
        self._counts: dict[str, list[float]] = defaultdict(list)
        self._lock   = Lock()

    def is_allowed(self, key: str) -> tuple[bool, int]:
        """Returns (allowed, remaining)."""
        now = time.time()
        with self._lock:
            timestamps = [t for t in self._counts[key] if now - t < self.WINDOW]
            if len(timestamps) >= self.MAX_REQS:
                self._counts[key] = timestamps
                return False, 0
            timestamps.append(now)
            self._counts[key] = timestamps
            return True, self.MAX_REQS - len(timestamps)


_rate_limiter = _RateLimiter()


# ── Dependencies ──────────────────────────────────────────────────────────────

def verify_internal_key(x_internal_key: Optional[str] = Header(None)) -> None:
    """Verify the shared secret key sent by the Node.js backend."""
    if INTERNAL_KEY and x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Internal-Key")


def check_rate_limit(request: Request) -> None:
    """Rate limit by client IP."""
    client_ip = request.client.host if request.client else "unknown"
    allowed, remaining = _rate_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Max 1000 requests per hour.",
            headers={"Retry-After": "3600"},
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Classify a claim as FACT, RUMOR, or UNCERTAIN",
    description=(
        "Runs NLP inference on the provided claim text. "
        "Protected by X-Internal-Key header. "
        "Rate limited to 1000 req/hr per IP."
    ),
)
async def predict(
    request_body: PredictRequest,
    request: Request,
    _auth:  None = Depends(verify_internal_key),
    _rate:  None = Depends(check_rate_limit),
) -> PredictResponse:
    if not classifier.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="ML model not available. Service is starting up or model files are missing.",
        )

    # Input validation: UTF-8 only (Pydantic already validates length)
    text = request_body.text
    try:
        text.encode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Text must be valid UTF-8.")

    logger.info(
        f"Predicting | claim_id={request_body.claim_id} | "
        f"text_len={len(text)} | ip={request.client.host if request.client else 'unknown'}"
    )

    result = classifier.predict(text)

    return PredictResponse(
        claim_id=request_body.claim_id,
        label=PredictionLabel(result["label"]),
        confidence=result["confidence"],
        model_version=result["model_version"],
        processing_time_ms=result["processing_time_ms"],
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check — returns model load status",
)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok" if classifier.is_loaded else "degraded",
        model_loaded=classifier.is_loaded,
        model_version=classifier.current_version,
        device=classifier.device,
    )


@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    summary="Current model metadata",
)
async def model_info() -> ModelInfoResponse:
    return ModelInfoResponse(
        model_name="Verifact NLP Classifier",
        model_version=classifier.current_version,
        base_model="cardiffnlp/twitter-roberta-base",
        labels=["FACT", "RUMOR", "UNCERTAIN"],
        max_input_length=512,
        device=classifier.device,
    )
