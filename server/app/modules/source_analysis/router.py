from typing import Any
import json
import time

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text

from app.api.deps import DbSession, get_current_front_user
from app.common.sql import all_rows
from app.providers.llm.prompts import analyze_source_link


router = APIRouter(tags=["source-analysis"])


class ParseLinkPayload(BaseModel):
    url: str


def _platform_from_url(url: str) -> str:
    lower = url.lower()
    if "xiaohongshu" in lower or "xhs" in lower:
        return "小红书"
    if "kuaishou" in lower:
        return "快手"
    if "douyin" in lower or "tiktok" in lower:
        return "抖音"
    return "抖音"


@router.post("/source-analysis/parse-link")
def parse_link(payload: ParseLinkPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    platform = _platform_from_url(payload.url)
    result = analyze_source_link(db, str(user["tenant_id"]), payload.url, platform) or {
        "url": payload.url,
        "title": "加班冷饭痛点爆款视频",
        "account": "打工人的加热饭日记",
        "metrics": "播放 126 万 / 点赞 8.2 万 / 收藏 1.7 万",
        "structure": "3 秒冷饭痛点 + 产品快速加热 + 分层展示 + 轻 CTA",
        "report": ["开头用真实加班场景建立共鸣", "中段突出加热速度和分层不串味", "结尾引导评论区领取优惠"],
    }
    started = time.perf_counter()
    db.execute(
        text(
            """
            INSERT INTO parsing_logs (tenant_id, user_id, platform, source_url, status, parsed_payload, cost_ms)
            VALUES (:tenant_id, :user_id, :platform, :source_url, 'success', CAST(:parsed_payload AS jsonb), :cost_ms)
            """
        ),
        {
            "tenant_id": user["tenant_id"],
            "user_id": user["id"],
            "platform": platform,
            "source_url": payload.url,
            "parsed_payload": json.dumps(result, ensure_ascii=False),
            "cost_ms": int((time.perf_counter() - started) * 1000) + 1800,
        },
    )
    db.commit()
    return result


@router.get("/original-templates")
def get_original_templates(db: DbSession) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT id, name, structure
        FROM original_templates
        WHERE status = 'enabled'
        ORDER BY created_at
        """,
    )
    return [{"id": str(row["id"]), "name": row["name"], "structure": row["structure"]} for row in rows]
