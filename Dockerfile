# --- Build Stage ---
FROM python:3.11-slim-bookworm AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uv/bin/uv

# Copy requirements
COPY requirements.txt .

# Install dependencies
# 1. Force CPU-only torch to save 2GB+ (Render typically uses CPUs for web services)
# 2. Use uv to install the rest
RUN /uv/bin/uv pip install --system --no-cache torch torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    /uv/bin/uv pip install --system --no-cache -r requirements.txt && \
    rm -rf /root/.cache/uv /root/.cache/pip

# --- Final Stage ---
FROM python:3.11-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DISPLAY=:99

WORKDIR /app

# Install only runtime essentials
# Added espeak-ng for KittenTTS
RUN apt-get update && apt-get install -y --no-install-recommends \
    firefox-esr \
    wget \
    ffmpeg \
    imagemagick \
    xvfb \
    espeak-ng \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    && GECKODRIVER_VERSION=v0.35.0 \
    && wget -q https://github.com/mozilla/geckodriver/releases/download/$GECKODRIVER_VERSION/geckodriver-$GECKODRIVER_VERSION-linux64.tar.gz \
    && tar -xvzf geckodriver-$GECKODRIVER_VERSION-linux64.tar.gz \
    && mv geckodriver /usr/local/bin/ \
    && rm geckodriver-$GECKODRIVER_VERSION-linux64.tar.gz \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set ImageMagick policy
RUN sed -i 's/domain="path" rights="none" pattern="@\*"/domain="path" rights="read|write" pattern="@\*"/g' /etc/ImageMagick-6/policy.xml

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Expose API port (Render will use its own, but we document 8000)
EXPOSE 8000

# Use Xvfb for headless browser automation
# Note: Render provides the PORT env var automatically
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x1024x24 & python src/api.py"]
