# ─── Builder stage ────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install CPU-only torch to keep image size manageable
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch==2.2.2+cpu \
      --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy source code
COPY . .

# Create models directory (mount or COPY trained weights here)
RUN mkdir -p models data/raw data/processed evaluation/results

# Non-root user for security
RUN useradd -m -u 1001 mluser && chown -R mluser:mluser /app
USER mluser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
