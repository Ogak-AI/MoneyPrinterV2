# Use a modern python base image
FROM python:3.11-slim-bookworm

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DISPLAY=:99

# Combine all system and python installs into fewer layers to reduce image size
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

# Copy requirements and install in a single step with cache cleaning
COPY requirements.txt .
RUN /uv/bin/uv pip install --system --no-cache -r requirements.txt \
    && rm -rf /root/.cache/uv \
    && rm -rf /root/.cache/pip \
    && find /usr/local/lib/python3.11/site-packages -name "*.pyc" -delete \
    && find /usr/local/lib/python3.11/site-packages -name "__pycache__" -delete

# Copy the application code
COPY . .

# Final cleanup of any potential artifacts and docs to save space
RUN rm -rf docs .git .github tests \
    && find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# Expose API port
EXPOSE 7860

# Use Xvfb for headless browser automation
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x1024x24 & python src/api.py"]
