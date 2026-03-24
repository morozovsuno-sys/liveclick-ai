FROM python:3.11-slim

WORKDIR /app

# System deps: ffmpeg for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install torch CPU-only first (much smaller: ~200MB vs 2GB GPU)
RUN pip install --no-cache-dir \
    torch==2.1.2+cpu \
    torchaudio==2.1.2+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies
RUN pip install --no-cache-dir -r requirements.txt --no-deps --ignore-installed torch torchaudio || \
    pip install --no-cache-dir $(grep -v 'torch' requirements.txt | tr '\n' ' ')

COPY . .

# Create tmp dir for audio processing
RUN mkdir -p /tmp/audio

EXPOSE 8000

# Production: gunicorn with uvicorn workers
CMD ["sh", "-c", "gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --timeout 1800"]
