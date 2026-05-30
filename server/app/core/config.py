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
    video_parse_api_url: str
    video_parse_timeout_seconds: float
    siliconflow_api_key: str
    siliconflow_api_url: str
    siliconflow_asr_model: str
    video_temp_dir: str
    video_auto_cleanup_temp_files: bool
    # OSS settings
    oss_endpoint: str
    oss_access_key_id: str
    oss_access_key_secret: str
    oss_bucket_project: str
    oss_bucket_avatar: str
    oss_bucket_material: str
    oss_bucket_public: str


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
                "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175",
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
        video_parse_api_url=os.getenv("VIDEO_PARSE_API_URL", ""),
        video_parse_timeout_seconds=float(os.getenv("VIDEO_PARSE_TIMEOUT_SECONDS", "30")),
        siliconflow_api_key=os.getenv("SILICONFLOW_API_KEY", ""),
        siliconflow_api_url=os.getenv("SILICONFLOW_API_URL", "https://api.siliconflow.cn/v1/audio/transcriptions"),
        siliconflow_asr_model=os.getenv("SILICONFLOW_ASR_MODEL", "FunAudioLLM/SenseVoiceSmall"),
        video_temp_dir=os.getenv("VIDEO_TEMP_DIR", ""),
        video_auto_cleanup_temp_files=os.getenv("VIDEO_AUTO_CLEANUP_TEMP_FILES", "true").lower() == "true",
        oss_endpoint=os.getenv("OSS_ENDPOINT", ""),
        oss_access_key_id=os.getenv("OSS_ACCESS_KEY_ID", ""),
        oss_access_key_secret=os.getenv("OSS_ACCESS_KEY_SECRET", ""),
        oss_bucket_project=os.getenv("OSS_BUCKET_PROJECT", "ai-script-project"),
        oss_bucket_avatar=os.getenv("OSS_BUCKET_AVATAR", "ai-script-avatar"),
        oss_bucket_material=os.getenv("OSS_BUCKET_MATERIAL", "ai-script-material"),
        oss_bucket_public=os.getenv("OSS_BUCKET_PUBLIC", "ai-script-public"),
    )
