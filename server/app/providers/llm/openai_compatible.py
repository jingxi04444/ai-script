from dataclasses import dataclass
from functools import lru_cache
import os
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings


@dataclass(frozen=True)
class LLMResult:
    content: str
    model: str
    provider: str = "openai-compatible"


@dataclass(frozen=True)
class LLMProviderConfig:
    provider_name: str
    api_base_url: str
    api_key: str
    model: str
    temperature: float
    timeout_seconds: float
    max_tokens: int


class OpenAICompatibleLLM:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.llm_api_base_url and self.settings.llm_api_key and self.settings.llm_model)

    def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        db: Session | None = None,
        tenant_id: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResult | None:
        for provider in self._provider_candidates(db, tenant_id):
            result = self._complete_with_provider(
                provider,
                system_prompt,
                user_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            if result:
                return result
        return None

    def _complete_with_provider(
        self,
        provider: LLMProviderConfig,
        system_prompt: str,
        user_prompt: str,
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResult | None:
        base_url = provider.api_base_url.rstrip("/")
        url = base_url if base_url.endswith("/chat/completions") else f"{base_url}/chat/completions"
        payload: dict[str, Any] = {
            "model": provider.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": provider.temperature if temperature is None else temperature,
            "max_tokens": provider.max_tokens if max_tokens is None else max_tokens,
        }
        headers = {
            "Authorization": f"Bearer {provider.api_key}",
            "Content-Type": "application/json",
        }
        try:
            with httpx.Client(timeout=provider.timeout_seconds) as client:
                response = client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
        except Exception:
            return None

        choices = data.get("choices") or []
        if not choices:
            return None
        message = choices[0].get("message") or {}
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            return None
        return LLMResult(content=content.strip(), model=provider.model, provider=provider.provider_name)

    def _provider_candidates(self, db: Session | None, tenant_id: str | None) -> list[LLMProviderConfig]:
        candidates: list[LLMProviderConfig] = []
        if db is not None:
            rows = db.execute(
                text(
                    """
                    SELECT *
                    FROM api_provider_configs
                    WHERE provider_type = 'llm'
                      AND status = 'enabled'
                      AND (tenant_id IS NULL OR tenant_id = :tenant_id)
                    ORDER BY
                      CASE WHEN tenant_id = :tenant_id THEN 0 ELSE 1 END,
                      priority ASC,
                      updated_at DESC
                    """
                ),
                {"tenant_id": tenant_id},
            ).mappings().all()
            for row in rows:
                provider = self._provider_from_row(dict(row))
                if provider:
                    candidates.append(provider)

        env_provider = self._provider_from_env()
        if env_provider:
            candidates.append(env_provider)
        return candidates

    def _provider_from_row(self, row: dict[str, Any]) -> LLMProviderConfig | None:
        config = row.get("config") or {}
        api_base_url = str(row.get("endpoint_url") or config.get("api_base_url") or config.get("base_url") or "").strip()
        model = str(config.get("model") or config.get("model_name") or config.get("modelName") or "").strip()
        api_key = self._resolve_api_key(str(row.get("api_key_encrypted") or config.get("api_key") or config.get("apiKey") or "").strip())
        if not (api_base_url and api_key and model):
            return None
        timeout_ms = row.get("timeout_ms") or config.get("timeout_ms") or config.get("timeoutMs")
        timeout_seconds = (float(timeout_ms) / 1000) if timeout_ms else self.settings.llm_timeout_seconds
        return LLMProviderConfig(
            provider_name=str(row.get("provider_name") or config.get("name") or "database-provider"),
            api_base_url=api_base_url,
            api_key=api_key,
            model=model,
            temperature=float(config.get("temperature") or self.settings.llm_temperature),
            timeout_seconds=timeout_seconds,
            max_tokens=int(config.get("max_tokens") or config.get("maxTokens") or self.settings.llm_max_tokens),
        )

    def _provider_from_env(self) -> LLMProviderConfig | None:
        if not self.is_configured:
            return None
        return LLMProviderConfig(
            provider_name="env-provider",
            api_base_url=self.settings.llm_api_base_url,
            api_key=self.settings.llm_api_key,
            model=self.settings.llm_model,
            temperature=self.settings.llm_temperature,
            timeout_seconds=self.settings.llm_timeout_seconds,
            max_tokens=self.settings.llm_max_tokens,
        )

    def _resolve_api_key(self, value: str) -> str:
        if value.startswith("env:"):
            return os.getenv(value.removeprefix("env:"), "")
        return value


@lru_cache(maxsize=1)
def get_llm_client() -> OpenAICompatibleLLM:
    return OpenAICompatibleLLM()
