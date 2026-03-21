from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.core.database import get_supabase_admin
from app.api.deps import require_admin, log_admin_action
from app.models.payment import PlanType
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter()


class AdminUserUpdate(BaseModel):
    is_admin: Optional[bool] = None
    plan: Optional[PlanType] = None
    subscription_expires_at: Optional[datetime] = None


@router.get("/users")
async def list_users(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    admin: dict = Depends(require_admin),
):
    """
    Список всех пользователей для админки.
    """
    supabase = get_supabase_admin()
    query = supabase.table("profiles").select("*, payments(count)", count="exact")
    
    if search:
        query = query.ilike("email", f"%{search}%")
        
    response = (
        query.range(offset, offset + limit - 1)
        .order("created_at", desc=True)
        .execute()
    )
    
    return {
        "users": response.data,
        "total": response.count
    }


@router.post("/users/{user_id}/premium")
async def grant_premium(
    user_id: str,
    days: int = 30,
    request: Request = None,
    admin: dict = Depends(require_admin),
):
    """
    Ручная выдача премиум-статуса пользователю.
    """
    supabase = get_supabase_admin()
    expires_at = datetime.utcnow() + timedelta(days=days)
    
    try:
        # 1. Обновляем профиль
        supabase.table("profiles").update({
            "plan": PlanType.PRO.value,
            "subscription_expires_at": expires_at.isoformat()
        }).eq("id", user_id).execute()
        
        # 2. Логируем действие
        await log_admin_action(
            admin_id=admin["id"],
            action="grant_premium_manual",
            target_user_id=user_id,
            metadata={"days": days, "expires_at": expires_at.isoformat()},
            ip_address=request.client.host if request else None
        )
        
        return {"status": "success", "expires_at": expires_at}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при выдаче премиума: {e}"
        )


@router.get("/stats")
async def get_admin_stats(admin: dict = Depends(require_admin)):
    """
    Общая статистика сервиса для дашборда админа.
    """
    supabase = get_supabase_admin()
    
    # Считаем пользователей
    users_count = supabase.table("profiles").select("id", count="exact").execute().count
    
    # Считаем доход (успешные платежи)
    payments = supabase.table("payments").select("amount").eq("status", "succeeded").execute()
    total_revenue = sum(p["amount"] for p in payments.data) / 100
    
    # Активные задачи
    active_jobs = (
        supabase.table("jobs")
        .select("id", count="exact")
        .in_("status", ["queued", "processing"])
        .execute()
    ).count
    
    return {
        "total_users": users_count,
        "total_revenue_rub": total_revenue,
        "active_jobs": active_jobs,
        "server_status": "online"
    }


@router.get("/logs")
async def get_admin_logs(
    limit: int = 100,
    admin: dict = Depends(require_admin)
):
    """
    Логи действий администраторов.
    """
    supabase = get_supabase_admin()
    response = (
        supabase.table("admin_logs")
        .select("*, profiles!admin_id(email)")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data
