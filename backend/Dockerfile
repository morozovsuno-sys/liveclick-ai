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
RUN pip install --no-cache-dir -r requirements.txt --ignore-installed torch torchaudio 2>/dev/null || \
    pip install --no-cache-dir $(grep -v 'torch' requirements.txt | tr '\n' ' ')

COPY . .

# Create tmp dir for audio processing
RUN mkdir -p /tmp/audio

# Pre-download Demucs htdemucs model weights at build time
# Use || true so build doesn't fail if network is unavailable (will download at runtime)
RUN python -c "
import os
os.environ['TORCH_HOME'] = '/root/.cache/torch'
try:
    from demucs.pretrained import get_model
    get_model('htdemucs')
    print('Model htdemucs pre-downloaded successfully')
except Exception as e:
    print(f'Pre-download failed (will download at runtime): {e}')
" || true

EXPOSE 8000

# Production: gunicorn with uvicorn workers
CMD ["gunicorn", "app.main:app", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "1800", "--graceful-timeout", "30"]
