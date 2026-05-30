from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from shutil import rmtree
import subprocess
import tempfile
from typing import Any
from urllib.parse import quote
from uuid import uuid4

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings


@dataclass(frozen=True)
class ParsedVideo:
    source_url: str
    platform: str
    title: str
    video_url: str
    cover_url: str
    music_url: str
    author: dict[str, Any]
    images: list[dict[str, Any]]
    raw: dict[str, Any]


@dataclass(frozen=True)
class ApiProvider:
    provider_name: str
    endpoint_url: str
    api_key: str
    model: str
    timeout_seconds: float


def platform_from_url(url: str) -> str:
    lower = url.lower()
    if "xiaohongshu" in lower or "xhslink" in lower or "xhs" in lower:
        return "小红书"
    if "kuaishou" in lower or "gifshow" in lower:
        return "快手"
    if "bilibili" in lower or "b23.tv" in lower:
        return "哔哩哔哩"
    if "douyin" in lower or "iesdouyin" in lower or "tiktok" in lower:
        return "抖音"
    return "未知平台"


def parse_video_share_url(share_url: str, db: Session | None = None, tenant_id: str | None = None) -> ParsedVideo:
    settings = get_settings()
    external_result = _parse_with_external_api(share_url, db, tenant_id) if (settings.video_parse_api_url or db is not None) else None
    data = _unwrap_parse_data(external_result) if external_result else {}
    video_url = str(data.get("video_url") or data.get("videoUrl") or data.get("url") or "")
    title = str(data.get("title") or data.get("desc") or data.get("description") or "参考视频文案")
    return ParsedVideo(
        source_url=share_url,
        platform=platform_from_url(share_url),
        title=title,
        video_url=video_url,
        cover_url=str(data.get("cover_url") or data.get("coverUrl") or data.get("cover") or ""),
        music_url=str(data.get("music_url") or data.get("musicUrl") or ""),
        author=data.get("author") if isinstance(data.get("author"), dict) else {},
        images=data.get("images") if isinstance(data.get("images"), list) else [],
        raw=external_result or {"code": 200, "msg": "fallback", "data": {"title": title, "video_url": video_url}},
    )


def extract_video_copy(share_url: str, db: Session | None = None, tenant_id: str | None = None) -> dict[str, Any]:
    parsed = parse_video_share_url(share_url, db, tenant_id)
    transcription = transcribe_video_url(parsed.video_url, db, tenant_id) if parsed.video_url else ""
    if not transcription:
        transcription = _fallback_transcript(parsed)
    return {
        "sourceTitle": parsed.title,
        "transcript": transcription,
        "platform": parsed.platform,
        "parseInfo": parsed_to_dict(parsed),
    }


def parsed_to_dict(parsed: ParsedVideo) -> dict[str, Any]:
    return {
        "sourceUrl": parsed.source_url,
        "platform": parsed.platform,
        "title": parsed.title,
        "videoUrl": parsed.video_url,
        "coverUrl": parsed.cover_url,
        "musicUrl": parsed.music_url,
        "author": parsed.author,
        "images": parsed.images,
        "raw": parsed.raw,
    }


def transcribe_video_url(video_url: str, db: Session | None = None, tenant_id: str | None = None) -> str:
    settings = get_settings()
    provider = _asr_provider(db, tenant_id)
    if not (provider and provider.api_key and video_url):
        return ""
    temp_dir = _make_temp_dir()
    video_path = temp_dir / f"video_{uuid4().hex}.mp4"
    audio_path = temp_dir / f"audio_{uuid4().hex}.mp3"
    try:
        _download_file(video_url, video_path)
        if not _extract_audio(video_path, audio_path):
            return ""
        return _transcribe_audio(audio_path, provider)
    finally:
        if settings.video_auto_cleanup_temp_files:
            rmtree(temp_dir, ignore_errors=True)


def _parse_with_external_api(share_url: str, db: Session | None, tenant_id: str | None) -> dict[str, Any] | None:
    settings = get_settings()
    parse_provider = _parse_provider(db, tenant_id)
    api_url = (parse_provider.endpoint_url if parse_provider else settings.video_parse_api_url).strip()
    if not api_url:
        return None
    url = api_url.replace("{url}", quote(share_url, safe="")) if "{url}" in api_url else f"{api_url}{quote(share_url, safe='')}"
    try:
        timeout = parse_provider.timeout_seconds if parse_provider else settings.video_parse_timeout_seconds
        headers = {"Authorization": f"Bearer {parse_provider.api_key}"} if parse_provider and parse_provider.api_key else None
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            if headers:
                response = client.get(url, headers=headers)
            else:
                response = client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception:
        return None


def _unwrap_parse_data(payload: dict[str, Any] | None) -> dict[str, Any]:
    if not payload:
        return {}
    data = payload.get("data") if isinstance(payload, dict) else None
    if isinstance(data, dict):
        return data.get("parse_info") if isinstance(data.get("parse_info"), dict) else data
    return payload


def _make_temp_dir() -> Path:
    settings = get_settings()
    parent = Path(settings.video_temp_dir) if settings.video_temp_dir else Path(tempfile.gettempdir()) / "ai-script-video-parser"
    parent.mkdir(parents=True, exist_ok=True)
    path = parent / uuid4().hex
    path.mkdir(parents=True, exist_ok=True)
    return path


def _download_file(url: str, output_path: Path) -> None:
    settings = get_settings()
    with httpx.Client(timeout=settings.video_parse_timeout_seconds, follow_redirects=True) as client:
        with client.stream("GET", url, headers={"User-Agent": "Mozilla/5.0"}) as response:
            response.raise_for_status()
            with output_path.open("wb") as file:
                for chunk in response.iter_bytes():
                    if chunk:
                        file.write(chunk)


def _extract_audio(video_path: Path, audio_path: Path) -> bool:
    command = [
        "ffmpeg",
        "-i",
        str(video_path),
        "-vn",
        "-acodec",
        "libmp3lame",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-y",
        str(audio_path),
    ]
    try:
        result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=600)
    except Exception:
        return False
    return result.returncode == 0 and audio_path.exists() and audio_path.stat().st_size > 0


def _transcribe_audio(audio_path: Path, provider: ApiProvider) -> str:
    headers = {"Authorization": f"Bearer {provider.api_key}"}
    data = {"model": provider.model}
    try:
        with audio_path.open("rb") as file:
            files = {"file": (os.path.basename(audio_path), file, "audio/mpeg")}
            with httpx.Client(timeout=provider.timeout_seconds) as client:
                response = client.post(provider.endpoint_url, headers=headers, data=data, files=files)
                response.raise_for_status()
                result = response.json()
    except Exception:
        return ""
    text = result.get("text")
    return text.strip() if isinstance(text, str) else ""


def _fallback_transcript(parsed: ParsedVideo) -> str:
    return (
        f"暂未完成语音转写。已解析到{parsed.platform}分享链接《{parsed.title}》。"
        "请配置 VIDEO_PARSE_API_URL、SILICONFLOW_API_KEY，并确保服务器已安装 ffmpeg 后重试。"
    )


def _parse_provider(db: Session | None, tenant_id: str | None) -> ApiProvider | None:
    return _provider_from_db(db, tenant_id, ["parsing", "parser"])


def _asr_provider(db: Session | None, tenant_id: str | None) -> ApiProvider | None:
    return _provider_from_db(db, tenant_id, ["asr"]) or _asr_provider_from_env()


def _provider_from_db(db: Session | None, tenant_id: str | None, provider_types: list[str]) -> ApiProvider | None:
    if db is None:
        return None
    rows = db.execute(
        text(
            """
            SELECT *
            FROM api_provider_configs
            WHERE provider_type = ANY(:provider_types)
              AND status = 'enabled'
              AND (tenant_id IS NULL OR tenant_id = :tenant_id)
            ORDER BY
              CASE WHEN tenant_id = :tenant_id THEN 0 ELSE 1 END,
              priority ASC,
              updated_at DESC
            """
        ),
        {"provider_types": provider_types, "tenant_id": tenant_id},
    ).mappings().all()
    for row in rows:
        provider = _provider_from_row(dict(row))
        if provider:
            return provider
    return None


def _provider_from_row(row: dict[str, Any]) -> ApiProvider | None:
    config = row.get("config") or {}
    endpoint_url = str(row.get("endpoint_url") or config.get("endpoint_url") or config.get("api_url") or config.get("apiUrl") or "").strip()
    api_key = _resolve_api_key(str(row.get("api_key_encrypted") or config.get("api_key") or config.get("apiKey") or "").strip())
    model = str(config.get("model") or config.get("model_name") or config.get("modelName") or "").strip()
    timeout_ms = row.get("timeout_ms") or config.get("timeout_ms") or config.get("timeoutMs") or 600000
    if not endpoint_url:
        return None
    return ApiProvider(
        provider_name=str(row.get("provider_name") or "API Provider"),
        endpoint_url=endpoint_url,
        api_key=api_key,
        model=model,
        timeout_seconds=float(timeout_ms) / 1000,
    )


def _asr_provider_from_env() -> ApiProvider | None:
    settings = get_settings()
    if not (settings.siliconflow_api_key and settings.siliconflow_api_url and settings.siliconflow_asr_model):
        return None
    return ApiProvider(
        provider_name="env-siliconflow-asr",
        endpoint_url=settings.siliconflow_api_url,
        api_key=settings.siliconflow_api_key,
        model=settings.siliconflow_asr_model,
        timeout_seconds=600,
    )


def _resolve_api_key(value: str) -> str:
    if value.startswith("env:"):
        return os.getenv(value.removeprefix("env:"), "")
    return value
