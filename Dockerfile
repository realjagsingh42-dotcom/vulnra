# ─────────────────────────────────────────────────────────────
# VULNRA — Production Dockerfile
# Strategy: heavy ML deps in a separate cached layer so Docker
# only reinstalls them when requirements-ml.txt changes.
# ─────────────────────────────────────────────────────────────

FROM python:3.11.7-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# ── System dependencies ───────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user ─────────────────────────────────────────────
RUN groupadd -r vulnra && useradd -r -g vulnra vulnra \
    && mkdir -p /app/reports \
    && chown vulnra:vulnra /app/reports

# ── LAYER 1: Heavy ML dependencies (cached separately) ────────
# Copy only the ML requirements file first.
# This layer is only rebuilt when requirements-ml.txt changes.
# torch CPU-only is ~800MB vs ~4GB for full torch — use it.
COPY requirements-ml.txt .
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && curl https://sh.rustup.rs -sSf | sh -s -- -y \
    && export PATH="$HOME/.cargo/bin:$PATH" \
    && pip install --upgrade pip \
    && pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements-ml.txt \
    && pip install --no-deps deepteam==0.1.0 \
    && apt-get purge -y curl \
    && rm -rf /var/lib/apt/lists/*

# ── LAYER 2: App dependencies (fast, changes often) ──────────
COPY requirements.txt .
RUN pip install -r requirements.txt

# ── LAYER 3: App code (fastest, changes every deploy) ─────────
COPY --chown=vulnra:vulnra . .

USER vulnra

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl --fail http://localhost:${PORT}/health || exit 1

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2 --proxy-headers --forwarded-allow-ips '*'