from fastapi import APIRouter, HTTPException, status, Depends
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Информация о текущем пользователе."""
    return current_user
