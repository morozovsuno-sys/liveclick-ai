from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.api.deps import get_current_user
from app.services.yookassa_service import create_payment
from app.core.config import settings
import hashlib
import hmac
import json

router = APIRouter()


@router.post("/create")
async def create_subscription(
    plan: str,
    current_user: dict = Depends(get_current_user)
):
    """Создать платёж YooKassa для подписки."""
    if plan not in ["pro", "studio"]:
        raise HTTPException(status_code=400, detail="Неверный тариф")
    payment_data = create_payment(
        plan=plan,
        user_email=current_user["email"],
        user_id=current_user["id"],
    )
    return payment_data


@router.post("/webhook")
async def payment_webhook(request: Request):
    """Вебхук от YooKassa."""
    body = await request.body()
    try:
        data = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Неверный JSON")
    # TODO: обработать событие payment.succeeded
    return {"status": "ok"}
