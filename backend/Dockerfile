FROM python:3.10-slim

WORKDIR /app

# System deps: ffmpeg + libsndfile for spleeter
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install app dependencies first (without spleeter to avoid httpx conflict)
RUN pip install --no-cache-dir -r requirements.txt

# Install spleeter without its conflicting httpx dep, use existing httpx
RUN pip install --no-cache-dir --no-deps spleeter==2.4.2 && \
    pip install --no-cache-dir \
        tensorflow-cpu==2.12.0 \
        librosa==0.9.2 \
        norbert==0.2.1 \
        typer==0.4.2 \
        soundfile \
        llvmlite \
        numba

COPY . .

EXPOSE 8000

ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1
ENV TF_CPP_MIN_LOG_LEVEL=3

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --timeout-keep-alive 30