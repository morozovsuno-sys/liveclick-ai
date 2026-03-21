from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
import json


class Settings(BaseSettings):
    APP_NAME: str = "LiveClick AI"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    ALLOWED_ORIGINS: Union[List[str], str] = ["https://liveclick.ai", "http://localhost:3000"]

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # YooKassa
    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    YOOKASSA_RETURN_URL: str = "https://liveclick.ai/dashboard/billing"

    # Cloudflare R2
    R2_ENDPOINT: str = ""
    R2_KEY: str = ""
    R2_SECRET: str = ""
    R2_BUCKET: str = "liveclick-stems"
    R2_PUBLIC_URL: str = ""

    # Modal
    MODAL_TOKEN_ID: str = ""
    MODAL_TOKEN_SECRET: str = ""

    # Pricing (kopecks)
    PRICE_PRO_MONTHLY: int = 14900
    PRICE_STUDIO_MONTHLY: int = 49900

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",")]
        return v

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
