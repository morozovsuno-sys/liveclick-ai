from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.routes import auth, jobs, payments, profiles


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

app.include_router(auth.router,     prefix="/api/auth",     tags=["auth"])
app.include_router(profiles.router, prefix="/api/profiles", tags=["profiles"])
app.include_router(jobs.router,     prefix="/api/jobs",     tags=["jobs"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "LiveClick AI"}
