from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="WORKFLOW_", extra="ignore")

    database_url: str = "mysql+pymysql://javacui:123456@127.0.0.1:3306/ai_script?charset=utf8mb4"
    redis_url: str = "redis://127.0.0.1:6379/0"
    commands_stream: str = "aiscript:workflow:commands"
    events_stream: str = "aiscript:workflow:events"
    consumer_group: str = "python-workflow-runners"
    consumer_name: str = "python-local"
    max_concurrency: int = 4
    node_max_attempts: int = 3
    command_max_attempts: int = 3
    commands_dead_letter_stream: str = "aiscript:workflow:commands:dead-letter"
    provider_gateway_enabled: bool = False
    provider_gateway_url: str = "http://127.0.0.1:8080/api/internal/workflow/providers/execute"
    provider_gateway_token: str = ""
    provider_gateway_timeout_seconds: float = 320.0
    simulation_delay_ms: int = 180
    worker_enabled: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
