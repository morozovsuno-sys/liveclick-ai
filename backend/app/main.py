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

app.include_router(auth.router,      prefix="/api/auth",     tags=["auth"])
app.include_router(profiles.router,  prefix="/api/profiles", tags=["profiles"])
app.include_router(jobs.router,      prefix="/api/jobs",     tags=["jobs"])
app.include_router(payments.router,  prefix="/api/payments", tags=["payments"])
app.include_router(admin.router,     prefix="/api/admin",    tags=["admin"])


@app.post("/api/split")
async def split_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Загрузить аудиофайл и запустить обработку стемов."""
    if not file.content_type or not file.content_type.startswith("audio/"):
        # Также допускаем application/octet-stream для некоторых клиентов
        allowed_ext = [".mp3", ".wav", ".flac", ".m4a"]
        filename_lower = (file.filename or "").lower()
        if not any(filename_lower.endswith(ext) for ext in allowed_ext):
            raise HTTPException(status_code=400, detail="Неподдерживаемый формат файла. Используйте MP3, WAV, FLAC или M4A.")

    job_id = str(uuid.uuid4())
    supabase = get_supabase_admin()

    # Создаём задачу в БД
    supabase.table("jobs").insert({
        "id": job_id,
        "user_id": current_user["id"],
        "status": "queued",
        "filename": file.filename,
    }).execute()

    # TODO: отправить задачу в Celery worker
    return {"job_id": job_id, "status": "queued"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "LiveClick AI"}
