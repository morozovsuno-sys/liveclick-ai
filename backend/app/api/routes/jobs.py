from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.core.database import get_supabase_admin

router = APIRouter()


@router.get("/{job_id}/status")
async def get_job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    """Poll job status - maps 'done' -> 'completed', 'error' -> 'failed'."""
    supabase = get_supabase_admin()
    response = (
        supabase.table("jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", current_user["id"])
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    job = response.data
    # Map internal status names to what the frontend expects
    raw_status = job.get("status", "processing")
    if raw_status == "done":
        mapped_status = "completed"
    elif raw_status == "error":
        mapped_status = "failed"
    else:
        mapped_status = raw_status
    return {
        "status": mapped_status,
        "stems": job.get("stems"),
        "click_track_url": job.get("click_track_url"),
        "bpm": job.get("bpm"),
        "error": job.get("error"),
    }


@router.get("/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Получить статус задачи обработки аудио."""
    supabase = get_supabase_admin()
    response = (
        supabase.table("jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", current_user["id"])
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    return response.data


@router.get("/")
async def list_jobs(current_user: dict = Depends(get_current_user)):
    """Список задач пользователя."""
    supabase = get_supabase_admin()
    response = (
        supabase.table("jobs")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []
