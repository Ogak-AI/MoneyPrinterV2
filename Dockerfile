# Use a modern python base image
FROM python:3.11-slim-bookworm

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies and GeckoDriver in a single layer to save space
RUN apt-get update && apt-get install -y --no-install-recommends \
    firefox-esr \
    wget \
    ffmpeg \
    imagemagick \
    xvfb \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    curl \
    ca-certificates \
    && GECKODRIVER_VERSION=v0.35.0 \
    && wget -q https://github.com/mozilla/geckodriver/releases/download/$GECKODRIVER_VERSION/geckodriver-$GECKODRIVER_VERSION-linux64.tar.gz \
    && tar -xvzf geckodriver-$GECKODRIVER_VERSION-linux64.tar.gz \
    && mv geckodriver /usr/local/bin/ \
    && rm geckodriver-$GECKODRIVER_VERSION-linux64.tar.gz \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv for extremely fast pip installs
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uv/bin/uv

# Set ImageMagick policy to allow reading/writing
RUN sed -i 's/domain="path" rights="none" pattern="@\*"/domain="path" rights="read|write" pattern="@\*"/g' /etc/ImageMagick-6/policy.xml

WORKDIR /app

# Use uv to install dependencies with cache mounts for speed
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/uv \
    /uv/bin/uv pip install --system -r requirements.txt

# Copy the application code (respects .dockerignore)
COPY . .

# Expose API port
EXPOSE 7860

# Use Xvfb for headless browser automation
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x1024x24 & export DISPLAY=:99 && python src/api.py"]
