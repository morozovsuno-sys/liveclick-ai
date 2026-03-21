from fastapi import Depends, HTTPException, status, Header
from app.core.database import get_supabase_admin
from typing import Optional
import logging

logger = logging.getLogger(__name__)


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Извлекает текущего пользователя из Bearer токена Supabase Auth.
    Используется в защищённых эндпоинтах.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Отсутствует токен авторизации",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.replace("Bearer ", "")
    supabase = get_supabase_admin()

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный токен",
            )

        user = user_response.user

        # Получаем профиль из profiles таблицы
        profile_response = (
            supabase.table("profiles")
            .select("*")
            .eq("id", str(user.id))
            .single()
            .execute()
        )

        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Профиль не найден",
            )

        return {
            "id": str(user.id),
            "email": user.email,
            "profile": profile_response.data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ошибка аутентификации",
        )


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Middleware: проверяет что юзер — админ.
    Использование:
        @router.get("/admin/stats", dependencies=[Depends(require_admin)])
    """
    profile = current_user.get("profile", {})
    
    if not profile.get("is_admin", False):
        logger.warning(
            f"Unauthorized admin access attempt by user {current_user['id']}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещён: требуются права администратора",
        )

    return current_user


async def log_admin_action(
    admin_id: str,
    action: str,
    target_user_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    """
    Записывает действие админа в admin_logs таблицу.
    """
    supabase = get_supabase_admin()
    
    try:
        supabase.table("admin_logs").insert({
            "admin_id": admin_id,
            "action": action,
            "target_user_id": target_user_id,
            "metadata": metadata or {},
            "ip_address": ip_address,
        }).execute()
        
        logger.info(
            f"Admin action logged: {action} by {admin_id} "
            f"(target: {target_user_id or 'N/A'})"
        )
    except Exception as e:
        logger.error(f"Failed to log admin action: {e}")
