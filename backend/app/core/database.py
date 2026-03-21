from supabase import create_client, Client
from app.core.config import settings


def get_supabase_admin() -> Client:
    """Возвращает клиент Supabase с service_role ключом (для серверных операций)."""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY,
    )


def get_supabase_anon() -> Client:
    """Возвращает клиент Supabase с anon ключом (для публичных операций)."""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
    )
