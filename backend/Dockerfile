FROM python:3.11-slim

WORKDIR /app

# System deps: ffmpeg + libsndfile for spleeter
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install all dependencies
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download spleeter 2stems model at build time
RUN python -c "from spleeter.separator import Separator; s = Separator('spleeter:2stems'); print('spleeter 2stems model ready')"

EXPOSE 8000

ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --timeout-keep-alive 30
