import os
import logging
from typing import List, Optional
from pydantic import Field, AliasChoices
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
    secret_key: str = Field(default="dev-secret-change-me", validation_alias=AliasChoices("SECRET_KEY", "secret_key"))

    # CORS — comma-separated string in env, e.g.:
    #   ALLOWED_ORIGINS=https://vulnra.ai,https://daring-art.up.railway.app
    # Falls back to safe defaults + whatever FRONTEND_URL is set to.
    allowed_origins_env: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("ALLOWED_ORIGINS", "allowed_origins_env"),
    )

    @property
    def allowed_origins(self) -> List[str]:
        base = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "https://vulnra.ai",
            "https://www.vulnra.ai",
            "https://vulnra-production.up.railway.app",
        ]
        # Always include whatever FRONTEND_URL is set to
        if self.frontend_url and self.frontend_url not in base:
            base.append(self.frontend_url)
        # Append any extra origins from the ALLOWED_ORIGINS env var
        if self.allowed_origins_env:
            extras = [o.strip() for o in self.allowed_origins_env.split(",") if o.strip()]
            for origin in extras:
                if origin not in base:
                    base.append(origin)
        return base

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", validation_alias=AliasChoices("REDIS_URL", "redis_url"))

    # Supabase
    # Field names use validation_alias so pydantic-settings v2 maps them correctly.
    # supabase_url   → SUPABASE_URL         (field name already matches, alias for safety)
    # supabase_key   → SUPABASE_SERVICE_KEY  (field name ≠ env var — alias required)
    supabase_url: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_URL", "supabase_url"),
    )
    supabase_key: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_SERVICE_KEY", "supabase_key"),
    )

    # Rate Limiting
    rate_limit_free: str = Field(default="1/minute", validation_alias=AliasChoices("RATE_LIMIT_FREE", "rate_limit_free"))
    rate_limit_pro: str = Field(default="10/minute", validation_alias=AliasChoices("RATE_LIMIT_PRO", "rate_limit_pro"))
    rate_limit_enterprise: str = Field(default="100/minute", validation_alias=AliasChoices("RATE_LIMIT_ENTERPRISE", "rate_limit_enterprise"))

    # Lemon Squeezy Billing
    lemonsqueezy_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("LEMON_SQUEEZY_API_KEY", "lemonsqueezy_api_key"),
    )
    lemonsqueezy_store_id: str = Field(
        default="",
        validation_alias=AliasChoices("LEMON_SQUEEZY_STORE_ID", "lemonsqueezy_store_id"),
    )
    lemonsqueezy_webhook_secret: str = Field(
        default="",
        validation_alias=AliasChoices("LEMON_SQUEEZY_WEBHOOK_SECRET", "lemonsqueezy_webhook_secret"),
    )
    lemonsqueezy_pro_variant_id: int = Field(
        default=0,
        validation_alias=AliasChoices("LEMON_SQUEEZY_PRO_VARIANT_ID", "lemonsqueezy_pro_variant_id"),
    )
    lemonsqueezy_enterprise_variant_id: int = Field(
        default=0,
        validation_alias=AliasChoices("LEMON_SQUEEZY_ENTERPRISE_VARIANT_ID", "lemonsqueezy_enterprise_variant_id"),
    )
    
    # Frontend URL for redirects
    frontend_url: str = Field(default="http://localhost:3000", validation_alias=AliasChoices("FRONTEND_URL", "frontend_url"))

    # Port
    port: int = Field(default=8000, validation_alias=AliasChoices("PORT", "port"))

    # Resend — email alerts for Sentinel
    resend_api_key: str = Field(default="", validation_alias=AliasChoices("RESEND_API_KEY", "resend_api_key"))
    alert_from_email: str = Field(default="alerts@vulnra.ai", validation_alias=AliasChoices("ALERT_FROM_EMAIL", "alert_from_email"))

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,  # allow access via Python field name even when validation_alias is set
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
