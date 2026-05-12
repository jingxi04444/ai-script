from dataclasses import dataclass
from functools import lru_cache
import os


@dataclass(frozen=True)
class Settings:
    database_url: str
    cors_origins: list[str]
    dev_password: str
    default_front_account: str
    default_admin_account: str
    llm_api_base_url: str
    llm_api_key: str
    llm_model: str
    llm_temperature: float
    llm_timeout_seconds: float
    llm_max_tokens: int


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://jingxi:123456@localhost:5432/ai_script_dev",
        ),
        cors_origins=_split_csv(
            os.getenv(
                "APP_CORS_ORIGINS",
                "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
            )
        ),
        dev_password=os.getenv("APP_DEV_PASSWORD", "123456"),
        default_front_account=os.getenv("APP_DEFAULT_FRONT_ACCOUNT", "linnan@ai-script.local"),
        default_admin_account=os.getenv("APP_DEFAULT_ADMIN_ACCOUNT", "admin@ai-script.local"),
        llm_api_base_url=os.getenv("LLM_API_BASE_URL", ""),
        llm_api_key=os.getenv("LLM_API_KEY", ""),
        llm_model=os.getenv("LLM_MODEL", ""),
        llm_temperature=float(os.getenv("LLM_TEMPERATURE", "0.3")),
        llm_timeout_seconds=float(os.getenv("LLM_TIMEOUT_SECONDS", "60")),
        llm_max_tokens=int(os.getenv("LLM_MAX_TOKENS", "2000")),
    )
