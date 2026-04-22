"""Pydantic request/response schemas for the ML service."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from enum import Enum


class PredictionLabel(str, Enum):
    FACT      = "FACT"
    RUMOR     = "RUMOR"
    UNCERTAIN = "UNCERTAIN"


class PredictRequest(BaseModel):
    claim_id: str = Field(..., min_length=1, description="MongoDB ObjectId of the claim")
    text:     str = Field(
        ...,
        min_length=5,
        max_length=5000,
        description="Claim text to classify (5–5000 chars, UTF-8)"
    )

    @field_validator("text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 5:
            raise ValueError("Text must be at least 5 non-whitespace characters.")
        return stripped


class PredictResponse(BaseModel):
    claim_id:          str
    label:             PredictionLabel
    confidence:        float = Field(..., ge=0.0, le=1.0)
    model_version:     str
    processing_time_ms: float


class HealthResponse(BaseModel):
    status:        str   # "ok" | "degraded"
    model_loaded:  bool
    model_version: str
    device:        str   # "cpu" | "cuda"


class ModelInfoResponse(BaseModel):
    model_name:       str
    model_version:    str
    base_model:       str
    labels:           list[str]
    max_input_length: int
    device:           str
