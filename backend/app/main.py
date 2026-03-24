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
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("LiveClick AI backend started (spleeter mode)")
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


def _run_spleeter_sync(audio_bytes: bytes, job_id: str) -> dict:
    """Run Spleeter 2stems locally and upload stems to Supabase Storage."""
    from spleeter.separator import Separator
    from supabase import create_client
    import numpy as np
    import soundfile as sf

    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_KEY"]
    supabase = create_client(supabase_url, supabase_key)

    tmp_dir = Path(tempfile.mkdtemp()) / job_id
    tmp_dir.mkdir(parents=True, exist_ok=True)
    input_path = tmp_dir / "input.mp3"
    input_path.write_bytes(audio_bytes)

    out_dir = tmp_dir / "spleeter_out"
    out_dir.mkdir(exist_ok=True)

    separator = Separator("spleeter:2stems")
    separator.separate_to_file(
        str(input_path),
        str(out_dir),
        filename_format="{instrument}.wav",
        synchronous=True,
    )

    stem_map = {
        "vocals": out_dir / "vocals.wav",
        "no_vocals": out_dir / "accompaniment.wav",
    }
    stems = {}
    for stem_name, stem_path in stem_map.items():
        if not stem_path.exists():
            continue
        with open(stem_path, "rb") as f:
            stem_bytes = f.read()
        storage_path = f"{job_id}/{stem_name}.wav"
        supabase.storage.from_("stems").upload(
            storage_path,
            stem_bytes,
            {"content-type": "audio/wav"},
        )
        public_url = supabase.storage.from_("stems").get_public_url(storage_path)
        stems[stem_name] = public_url

    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)
    return stems


async def run_spleeter(audio_bytes: bytes, job_id: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_spleeter_sync, audio_bytes, job_id)


@app.post("/api/split")
async def split_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload audio and split into stems using Spleeter."""
    audio_bytes = await file.read()
    if len(audio_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 50MB.")

    job_id = str(uuid.uuid4())
    supabase_admin = get_supabase_admin()
    supabase_admin.table("jobs").insert({
        "id": job_id,
        "user_id": current_user["id"],
        "status": "processing",
        "filename": file.filename or "audio.mp3",
    }).execute()

    async def process():
        try:
            stems = await run_spleeter(audio_bytes, job_id)
            supabase_admin.table("jobs").update({
                "status": "done",
                "stems": stems,
            }).eq("id", job_id).execute()
        except Exception as e:
            supabase_admin.table("jobs").update({
                "status": "error",
                "error": str(e)[:500],
            }).eq("id", job_id).execute()

    asyncio.create_task(process())
    return {"job_id": job_id, "status": "processing"}


@app.get("/health")
async def health():
    return {"status": "ok", "mode": "spleeter"}