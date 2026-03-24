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

# Create tmp dir for audio processing and set cache dir
RUN mkdir -p /tmp/audio /root/.cache/torch
# Pre-download htdemucs model at build time
RUN python -c "import os; os.environ['TORCH_HOME']='/root/.cache/torch'; os.environ['OMP_NUM_THREADS']='1'; from demucs.pretrained import get_model; get_model('htdemucs'); print('htdemucs model downloaded successfully')"

EXPOSE 8000

# Set env for minimal memory usage
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV TORCH_NUM_THREADS=1
ENV MALLOC_TRIM_THRESHOLD_=100000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --timeout-keep-alive 30