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
import modal


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"LiveClick AI backend started")
    yield
    print("Shutdown")

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


def _get_modal_func():
    """Lazily load Modal function using API token from env vars."""
    token_id = os.environ.get("MODAL_TOKEN_ID")
    token_secret = os.environ.get("MODAL_TOKEN_SECRET")
    if not token_id or not token_secret:
        raise HTTPException(status_code=503, detail="Modal credentials not configured")
    os.environ["MODAL_TOKEN_ID"] = token_id
    os.environ["MODAL_TOKEN_SECRET"] = token_secret
    process_track = modal.Function.lookup("liveclick-ai", "process_track")
    return process_track


@app.post("/api/split")
async def split_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload audio file and trigger Modal GPU stem separation."""
    if not file.content_type or not file.content_type.startswith("audio/"):
        allowed_ext = [".mp3", ".wav", ".flac", ".m4a"]
        filename_lower = (file.filename or "").lower()
        if not any(filename_lower.endswith(ext) for ext in allowed_ext):
            raise HTTPException(status_code=400, detail="Unsupported format. Use MP3, WAV, FLAC or M4A.")

    job_id = str(uuid.uuid4())
    supabase = get_supabase_admin()

    # Create job record with correct column names
    supabase.table("jobs").insert({
        "id": job_id,
        "user_id": current_user["id"],
        "status": "pending",
        "original_filename": file.filename,
    }).execute()

    # Read audio bytes
    audio_bytes = await file.read()

    # Trigger Modal GPU worker asynchronously
    try:
        process_track = _get_modal_func()
        # Spawn async job - non-blocking
        call = process_track.spawn(audio_bytes, job_id, "premium")
        # Update job with Modal call_id for polling
        supabase.table("jobs").update({
            "status": "processing",
            "modal_job_id": call.object_id,
        }).eq("id", job_id).execute()
    except Exception as e:
        supabase.table("jobs").update({
            "status": "failed",
            "error": str(e),
        }).eq("id", job_id).execute()
        raise HTTPException(status_code=500, detail=f"Failed to start processing: {e}")

    return {"job_id": job_id, "status": "processing"}


@app.get("/api/jobs/{job_id}/status")
async def get_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Poll job status - returns stems URLs when complete."""
    supabase = get_supabase_admin()
    result = supabase.table("jobs").select("*").eq("id", job_id).eq("user_id", current_user["id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job = result.data

    # If processing, check Modal for completion
    if job["status"] == "processing" and job.get("modal_job_id"):
        try:
            process_track = _get_modal_func()
            call = modal.functions.FunctionCall.from_id(job["modal_job_id"])
            modal_result = call.get(timeout=0)  # non-blocking
            # Job completed - store stems and click_track_url
            supabase.table("jobs").update({
                "status": "completed",
                "stems": modal_result.get("stems"),
                "click_track_url": modal_result.get("click_track_url"),
                "bpm": modal_result.get("bpm"),
            }).eq("id", job_id).execute()
            return {
                "job_id": job_id,
                "status": "completed",
                "stems": modal_result.get("stems"),
                "click_track_url": modal_result.get("click_track_url"),
                "bpm": modal_result.get("bpm"),
            }
        except TimeoutError:
            pass  # Still processing
        except Exception as e:
            supabase.table("jobs").update({"status": "failed", "error": str(e)}).eq("id", job_id).execute()

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
