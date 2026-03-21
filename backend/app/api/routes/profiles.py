from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.core.database import get_supabase_admin

router = APIRouter()


@router.get("/me")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Профиль текущего пользователя."""
    return current_user.get("profile", {})


@router.patch("/me")
async def update_profile(
    display_name: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Обновить профиль пользователя."""
    supabase = get_supabase_admin()
    updates = {}
    if display_name is not None:
        updates["display_name"] = display_name
    if not updates:
        return {"detail": "Нечего обновлять"}
    response = (
        supabase.table("profiles")
        .update(updates)
        .eq("id", current_user["id"])
        .execute()
    )
    return response.data
