import uuid
import hashlib
import hmac
from yookassa import Configuration, Payment
from yookassa.domain.models import Receipt, ReceiptItem, ReceiptCustomer
from app.core.config import settings


def configure_yookassa():
    Configuration.configure(
        account_id=settings.YOOKASSA_SHOP_ID,
        secret_key=settings.YOOKASSA_SECRET_KEY,
    )


configure_yookassa()

PLAN_PRICES = {
    "pro":    {"amount": "149.00", "label": "LiveClick AI Pro — 1 месяц"},
    "studio": {"amount": "499.00", "label": "LiveClick AI Studio — 1 месяц"},
}


def create_payment(plan: str, user_email: str, user_id: str, return_url: str | None = None) -> dict:
    """Creates YooKassa payment with fiscal receipt (54-FZ compliance)"""
    plan_info = PLAN_PRICES[plan]
    idempotence_key = str(uuid.uuid4())

    receipt = Receipt()
    receipt.customer = ReceiptCustomer(email=user_email)
    receipt.items = [
        ReceiptItem(
            description=plan_info["label"],
            quantity="1.00",
            amount={"value": plan_info["amount"], "currency": "RUB"},
            vat_code=1,
            payment_mode="full_payment",
            payment_subject="service",
        )
    ]

    payment = Payment.create({
        "amount": {"value": plan_info["amount"], "currency": "RUB"},
        "confirmation": {
            "type": "redirect",
            "return_url": return_url or settings.YOOKASSA_RETURN_URL,
        },
        "capture": True,
        "receipt": receipt,
        "description": plan_info["label"],
        "metadata": {"user_id": user_id, "plan": plan},
    }, idempotence_key)

    return {
        "payment_id": payment.id,
        "confirmation_url": payment.confirmation.confirmation_url,
        "amount": int(float(plan_info["amount"]) * 100),
        "status": payment.status,
    }


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    expected = hmac.new(
        settings.YOOKASSA_SECRET_KEY.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
