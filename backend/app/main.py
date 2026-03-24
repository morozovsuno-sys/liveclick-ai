from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.routes import auth, jobs, payments, profiles
from app.api.routes import admin
from app.api.deps import get_current_user
from app.core.database import get_supabase_admin
import uuid
import os
import asyncio
import tempfile
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# Thread pool for CPU-bound Demucs tasks
_executor = ThreadPoolExecutor(max_workers=2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"LiveClick AI backend started (free mode: local Demucs + Supabase Storage)")
    yield
    print("Shutdown")
    _executor.shutdown(wait=False)


app = FastAPI(
    title="LiveClick AI",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if True else None,
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(profiles.router, prefix="/api/profiles", tags=["profiles"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


def _run_demucs_sync(audio_bytes: bytes, job_id: str) -> dict:
    """Run Demucs locally (CPU) and upload stems to Supabase Storage."""
    import soundfile as sf
    import librosa
    import numpy as np
    from supabase import create_client
    from pydub import AudioSegment
    from pydub.generators import Sine

    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_KEY"]
    supabase = create_client(supabase_url, supabase_key)

    tmp_dir = Path(tempfile.mkdtemp()) / job_id
    tmp_dir.mkdir(parents=True, exist_ok=True)
    input_path = tmp_dir / "input.wav"
    input_path.write_bytes(audio_bytes)

    # --- Demucs separation (htdemucs, 4-stem, CPU) ---
    out_dir = tmp_dir / "demucs_out"
    out_dir.mkdir(exist_ok=True)
    cmd = [
        "python", "-m", "demucs",
        "-n", "htdemucs",
        "--two-stems", "vocals",
        "-o", str(out_dir),
        "--mp3",
        str(input_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
    if result.returncode != 0:
        raise RuntimeError(f"Demucs failed: {result.stderr}")

    # Collect stems
    stem_names = ["vocals", "no_vocals"]
    stems = {}
    for name in stem_names:
        found = list(out_dir.rglob(f"{name}.mp3")) + list(out_dir.rglob(f"{name}.wav"))
        if found:
            stems[name] = str(found[0])

    # Also try htdemucs full 4-stem output
    for name in ["drums", "bass", "other"]:
        found = list(out_dir.rglob(f"{name}.mp3")) + list(out_dir.rglob(f"{name}.wav"))
        if found:
            stems[name] = str(found[0])

    # --- BPM detection ---
    ref_audio = stems.get("vocals", str(input_path))
    try:
        y, sr = librosa.load(ref_audio, mono=True, duration=60)
        bpms = []
        for hop in [256, 512, 1024]:
            bpm, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop, trim=False)
            bpms.append(float(bpm))
        bpm = float(np.median(bpms))
    except Exception:
        bpm = 120.0

    # --- Generate click track ---
    click_path = str(tmp_dir / "click.wav")
    try:
        beat_ms = int(60000 / bpm)
        total_ms = int(len(y) / sr * 1000)
        hi = Sine(880).to_audio_segment(duration=50).apply_gain(-10)
        lo = Sine(660).to_audio_segment(duration=50).apply_gain(-12)
        click_track = AudioSegment.silent(duration=total_ms + 4 * beat_ms)
        t, beat_num = 0, 0
        while t < len(click_track):
            click = hi if beat_num % 4 == 0 else lo
            click_track = click_track.overlay(click, position=t)
            t += beat_ms
            beat_num += 1
        click_track.export(click_path, format="wav")
        stems["click"] = click_path
    except Exception as e:
        print(f"Click generation failed: {e}")

    # --- Upload to Supabase Storage ---
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "stems")
    stem_urls = {}
    for stem_name, file_path in stems.items():
        if not Path(file_path).exists():
            continue
        ext = Path(file_path).suffix
        storage_key = f"{job_id}/{stem_name}{ext}"
        with open(file_path, "rb") as f:
            file_data = f.read()
        content_type = "audio/mpeg" if ext == ".mp3" else "audio/wav"
        supabase.storage.from_(bucket).upload(
            storage_key,
            file_data,
            {"content-type": content_type, "upsert": "true"},
        )
        public_url = supabase.storage.from_(bucket).get_public_url(storage_key)
        stem_urls[stem_name] = public_url

    return {
        "stems": {k: v for k, v in stem_urls.items() if k != "click"},
        "click_track_url": stem_urls.get("click"),
        "bpm": round(bpm, 1),
    }


async def _process_job_background(audio_bytes: bytes, job_id: str):
    """Run in thread pool, update Supabase job record on completion."""
    supabase = get_supabase_admin()
    loop = asyncio.get_event_loop()
    try:
        result = await loop.run_in_executor(_executor, _run_demucs_sync, audio_bytes, job_id)
        supabase.table("jobs").update({
            "status": "completed",
            "stems": result.get("stems"),
            "click_track_url": result.get("click_track_url"),
            "bpm": result.get("bpm"),
        }).eq("id", job_id).execute()
    except Exception as e:
        supabase.table("jobs").update({
            "status": "failed",
            "error": str(e),
        }).eq("id", job_id).execute()


@app.post("/api/split")
async def split_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload audio file and run local Demucs stem separation (free, no GPU)."""
    if not file.content_type or not file.content_type.startswith("audio/"):
        allowed_ext = [".mp3", ".wav", ".flac", ".m4a"]
        filename_lower = (file.filename or "").lower()
        if not any(filename_lower.endswith(ext) for ext in allowed_ext):
            raise HTTPException(status_code=400, detail="Unsupported format. Use MP3, WAV, FLAC or M4A.")

    job_id = str(uuid.uuid4())
    supabase = get_supabase_admin()

    supabase.table("jobs").insert({
        "id": job_id,
        "user_id": current_user["id"],
        "status": "processing",
        "original_filename": file.filename,
    }).execute()

    audio_bytes = await file.read()

    # Start background processing (non-blocking)
    asyncio.create_task(_process_job_background(audio_bytes, job_id))

    return {"job_id": job_id, "status": "processing"}


@app.get("/api/jobs/{job_id}/status")
async def get_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Poll job status — returns stem URLs when complete."""
    supabase = get_supabase_admin()
    result = supabase.table("jobs").select("*").eq("id", job_id).eq("user_id", current_user["id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job = result.data
    return {
        "job_id": job_id,
        "status": job["status"],
        "stems": job.get("stems"),
        "click_track_url": job.get("click_track_url"),
        "bpm": job.get("bpm"),
        "original_filename": job.get("original_filename"),
        "error": job.get("error"),
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "LiveClick AI"}
