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
# 1. Force CPU-only torch to save 2GB+
# 2. Use uv to install the rest
# 3. Manually remove any nvidia bloat that might have been pulled in
RUN /uv/bin/uv pip install --system --no-cache torch torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    /uv/bin/uv pip install --system --no-cache -r requirements.txt && \
    pip uninstall -y nvidia-cudnn-cu12 nvidia-cublas-cu12 nvidia-cuda-runtime-cu12 \
                   nvidia-cuda-nvrtc-cu12 nvidia-cuda-cupti-cu12 nvidia-nvjitlink-cu12 \
                   nvidia-curand-cu12 nvidia-cusolver-cu12 nvidia-cusparse-cu12 \
                   nvidia-nccl-cu12 nvidia-nvtx-cu12 || true && \
    rm -rf /root/.cache/uv /root/.cache/pip && \
    find /usr/local/lib/python3.11/site-packages -name "*.pyc" -delete && \
    find /usr/local/lib/python3.11/site-packages -name "__pycache__" -delete

# --- Final Stage ---
FROM python:3.11-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DISPLAY=:99 \
    PORT=7860

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

# Final aggressive cleanup
RUN rm -rf docs .git .github tests assets/*.mp4 2>/dev/null || true && \
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

EXPOSE 7860

# Use Xvfb for headless browser automation
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x1024x24 & python src/api.py"]
