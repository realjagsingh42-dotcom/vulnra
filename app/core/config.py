import os
import logging
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# ── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("vulnra")

class Settings(BaseSettings):
    app_name: str = "VULNRA API"
    version: str = "0.2.0"
    debug: bool = False

    # Security
    secret_key: str = Field(default="dev-secret-change-me", env="SECRET_KEY")
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://vulnra.ai",
        "https://vulnra-production.up.railway.app",
    ]

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")

    # Supabase
    supabase_url: str = Field(default="", env="SUPABASE_URL")
    supabase_key: str = Field(default="", env="SUPABASE_SERVICE_KEY")

    # Rate Limiting
    rate_limit_free: str = Field(default="1/minute", env="RATE_LIMIT_FREE")
    rate_limit_pro: str = Field(default="10/minute", env="RATE_LIMIT_PRO")
    rate_limit_enterprise: str = Field(default="100/minute", env="RATE_LIMIT_ENTERPRISE")

    # Lemon Squeezy Billing
    lemonsqueezy_api_key: str = Field(default="", env="LEMON_SQUEEZY_API_KEY")
    lemonsqueezy_store_id: str = Field(default="", env="LEMON_SQUEEZY_STORE_ID")
    lemonsqueezy_webhook_secret: str = Field(default="", env="LEMON_SQUEEZY_WEBHOOK_SECRET")
    lemonsqueezy_pro_variant_id: int = Field(default=0, env="LEMON_SQUEEZY_PRO_VARIANT_ID")
    lemonsqueezy_enterprise_variant_id: int = Field(default=0, env="LEMON_SQUEEZY_ENTERPRISE_VARIANT_ID")
    
    # Frontend URL for redirects
    frontend_url: str = Field(default="http://localhost:3000", env="FRONTEND_URL")

    # Port
    port: int = Field(default=8000, env="PORT")

    # Resend — email alerts for Sentinel
    resend_api_key: str = Field(default="", env="RESEND_API_KEY")
    alert_from_email: str = Field(default="alerts@vulnra.ai", env="ALERT_FROM_EMAIL")

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

settings = Settings()

def validate_config():
    missing = []
    if not settings.redis_url:
        missing.append("REDIS_URL")
    
    # Supabase credentials are optional for basic operation (health check, etc.)
    # but required for authenticated endpoints
    if not settings.supabase_url:
        logger.warning("SUPABASE_URL not set - authenticated endpoints will not work")
    if not settings.supabase_key:
        logger.warning("SUPABASE_SERVICE_KEY not set - authenticated endpoints will not work")
    
    if missing:
        logger.error(f"Missing required environment variables: {missing}")
        raise RuntimeError(f"Missing required environment variables: {missing}")
