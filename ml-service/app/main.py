"""
Verifact ML Microservice — FastAPI entry point (Sprint 3.4)
"""

import logging
from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.models.classifier import classifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, log shutdown."""
    logger.info("=== Verifact ML Service starting ===")
    classifier.startup()
    logger.info("=== ML Service ready ===")
    yield
    logger.info("=== ML Service shutting down ===")


app = FastAPI(
    title="Verifact ML Service",
    description=(
        "NLP microservice for claim classification.\n\n"
        "Labels: **FACT** | **RUMOR** | **UNCERTAIN**\n\n"
        "Protected endpoints require `X-Internal-Key` header."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

backend_origins = [
    origin.strip()
    for origin in os.getenv("BACKEND_URL", "http://localhost:5000,http://backend:5000").split(",")
    if origin.strip()
]

# Only allow requests from the Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=backend_origins,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_ERROR", "message": "An unexpected error occurred."},
    )


app.include_router(router, tags=["ML"])
