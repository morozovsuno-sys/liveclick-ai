from fastapi import Depends, HTTPException, status, Header, Request
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
            detail="Ошибка автентификации",
        )


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Проверяет что пользователь является админом."""
    profile = current_user.get("profile", {})
    if not profile.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа",
        )
    return current_user


async def log_admin_action(action: str, user_id: str, details: dict = None):
    """Логирование административных действий."""
    try:
        supabase = get_supabase_admin()
        supabase.table("admin_logs").insert({
            "admin_id": user_id,
            "action": action,
            "details": details or {},
        }).execute()
    except Exception as e:
        logger.error(f"Admin log error: {e}")
