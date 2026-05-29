"""Глобальные настройки приложения.

Все настройки читаются из .env через pydantic-settings.
Redis опционален: если REDIS_URL пустой — модули используют
PostgreSQL fallback (см. modules/rate_limit/service.py).
"""
from __future__ import annotations

from decimal import Decimal
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Дефолтные значения, которые НЕ должны попасть в production —
# проверка выполняется в Settings.validate_production_defaults().
_INSECURE_SECRET_KEY = "change-me-in-production-this-must-be-at-least-32-chars"
_INSECURE_ADMIN_PASSWORD = "change_in_production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # === Database ===
    database_url: str = Field(
        default="postgresql+asyncpg://opensaas:password@localhost:5432/opensaas_db"
    )

    # === Redis (опционально) ===
    redis_url: str = Field(default="")

    # === JWT ===
    secret_key: str = Field(default=_INSECURE_SECRET_KEY)
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)
    refresh_token_expire_days: int = Field(default=30)

    # === Admin ===
    admin_email: str = Field(default="admin@example.com")
    admin_password: str = Field(default=_INSECURE_ADMIN_PASSWORD)

    # === SMTP ===
    smtp_host: str = Field(default="smtp.gmail.com")
    smtp_port: int = Field(default=587)
    smtp_user: str = Field(default="")
    smtp_password: str = Field(default="")
    smtp_from_email: str = Field(default="noreply@example.com")
    smtp_from_name: str = Field(default="OpenSaaS")
    smtp_use_tls: bool = Field(default=True)

    # === Робокасса ===
    robokassa_merchant_login: str = Field(default="")
    robokassa_password1: str = Field(default="")
    robokassa_password2: str = Field(default="")
    robokassa_test_mode: bool = Field(default=True)

    # === Stripe ===
    stripe_secret_key: str = Field(default="")
    stripe_webhook_secret: str = Field(default="")
    stripe_enabled: bool = Field(default=False)

    # === App ===
    app_name: str = Field(default="OpenSaaS")
    app_url: str = Field(default="http://localhost:3000")
    api_url: str = Field(default="http://localhost:8000")
    environment: str = Field(default="development")
    cors_origins: str = Field(default="http://localhost:3000")

    # === Бизнес-логика ===
    trial_days: int = Field(default=3)
    referral_commission_percent: int = Field(default=20)

    # === GitHub App (CodeAI) ===
    github_app_id: str = Field(default="")
    github_app_private_key: str = Field(default="")
    github_app_webhook_secret: str = Field(default="")
    github_app_client_id: str = Field(default="")
    github_app_client_secret: str = Field(default="")
    github_app_installation_url: str = Field(default="")

    # === OpenRouter (CodeAI) ===
    openrouter_api_key: str = Field(default="")
    codeai_default_planning_model: str = Field(
        default="deepseek/deepseek-chat"
    )
    codeai_default_editing_model: str = Field(
        default="deepseek/deepseek-chat"
    )
    codeai_embeddings_model: str = Field(default="openai/text-embedding-3-small")

    # === CodeAI runtime ===
    codeai_workspace_dir: str = Field(default="./tmp/repos")
    codeai_max_file_size_kb: int = Field(default=500)
    codeai_chunk_size: int = Field(default=100)
    codeai_chunk_overlap: int = Field(default=20)

    # === Animations (text → mp4) ===
    # Использует тот же OPENROUTER_API_KEY. Модель — сильная для генерации
    # кода (можно переопределить через env без редеплоя).
    animations_model: str = Field(default="anthropic/claude-3.7-sonnet")
    animations_max_duration: int = Field(default=30)  # секунд
    animations_default_fps: int = Field(default=30)
    animations_output_dir: str = Field(default="./tmp/animations")
    # Сколько рендеров может идти одновременно (Chromium+ffmpeg прожорливы).
    animations_max_concurrency: int = Field(default=1)
    # Потоковый разбор ответа LLM (SSE). Устойчив к keep-alive комментариям
    # OpenRouter и обрывам. Можно отключить (False) → buffered JSON-путь.
    animations_stream: bool = Field(default=True)
    # read-timeout запроса к LLM в секундах (большой HTML генерится долго).
    animations_request_timeout: int = Field(default=300)

    # === Планы подписки ===
    plan_basic_name: str = Field(default="Basic")
    plan_basic_price: Decimal = Field(default=Decimal("990"))
    plan_basic_interval: str = Field(default="month")
    plan_basic_features: str = Field(
        default="До 100 запросов в день,Email поддержка,Базовая аналитика"
    )

    plan_pro_name: str = Field(default="Pro")
    plan_pro_price: Decimal = Field(default=Decimal("2990"))
    plan_pro_interval: str = Field(default="month")
    plan_pro_features: str = Field(
        default="Безлимит запросов,Приоритетная поддержка,API доступ,Расширенная аналитика"
    )

    @model_validator(mode="after")
    def validate_production_defaults(self) -> "Settings":
        """В production запрещаем небезопасные дефолты и короткий secret_key."""
        if self.environment.lower() != "production":
            return self

        errors: list[str] = []
        if self.secret_key == _INSECURE_SECRET_KEY:
            errors.append("SECRET_KEY must be overridden in production")
        if len(self.secret_key) < 32:
            errors.append("SECRET_KEY must be at least 32 characters")
        if self.admin_password == _INSECURE_ADMIN_PASSWORD:
            errors.append("ADMIN_PASSWORD must be overridden in production")
        if "*" in self.cors_origins:
            errors.append("CORS_ORIGINS must not contain '*' in production")

        if errors:
            raise ValueError("Insecure production configuration: " + "; ".join(errors))
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def redis_enabled(self) -> bool:
        return bool(self.redis_url)

    @property
    def plan_basic_features_list(self) -> list[str]:
        return [f.strip() for f in self.plan_basic_features.split(",") if f.strip()]

    @property
    def plan_pro_features_list(self) -> list[str]:
        return [f.strip() for f in self.plan_pro_features.split(",") if f.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
