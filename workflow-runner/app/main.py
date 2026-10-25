import asyncio
import hmac
import time
from contextlib import asynccontextmanager
from typing import Literal

import uvicorn
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.config import get_settings
from app.skills.market_viral import (
    MarketCategoryViralSkill,
    MarketCredentialError,
    MarketViralSkillError,
)
from app.workers.command_consumer import WorkflowCommandConsumer


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    consumer = WorkflowCommandConsumer(settings) if settings.worker_enabled else None
    task = asyncio.create_task(consumer.start()) if consumer else None
    try:
        yield
    finally:
        if consumer:
            await consumer.stop()
        if task:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)


app = FastAPI(title="AI Script Workflow Runner", version="0.1.0", lifespan=lifespan)


class MarketViralSearchRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tenant_id: int = Field(alias="tenantId")
    category: str = Field(min_length=1, max_length=40)
    platforms: list[Literal["douyin", "xiaohongshu"]] = Field(
        default_factory=lambda: ["douyin", "xiaohongshu"]
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "workflow-runner"}


@app.post("/api/internal/skills/market-category-viral-search/execute")
async def execute_market_viral_skill(
    request: MarketViralSearchRequest,
    token: str | None = Header(default=None, alias="X-Workflow-Token"),
) -> dict:
    expected = get_settings().provider_gateway_token
    if not expected:
        raise HTTPException(status_code=503, detail="市场 Skill 尚未配置内部调用令牌")
    if not token or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="市场 Skill 调用令牌无效")
    skill = MarketCategoryViralSkill()
    try:
        output = await skill.search(
            tenant_id=request.tenant_id,
            category=request.category,
            platforms=list(request.platforms),
        )
    except ValueError as exception:
        raise HTTPException(status_code=422, detail=str(exception)) from exception
    except MarketCredentialError as exception:
        raise HTTPException(status_code=502, detail=str(exception)) from exception
    except MarketViralSkillError as exception:
        raise HTTPException(status_code=502, detail=str(exception)) from exception
    return {
        "code": 0,
        "message": "success",
        "data": output,
        "timestamp": int(time.time() * 1000),
    }


class MarketCookieValidationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tenant_id: int = Field(alias="tenantId")
    platform: Literal["douyin", "xiaohongshu"]


@app.post("/api/internal/skills/market-category-viral-search/validate-cookie")
async def validate_market_source_cookie(
    request: MarketCookieValidationRequest,
    token: str | None = Header(default=None, alias="X-Workflow-Token"),
) -> dict:
    expected = get_settings().provider_gateway_token
    if not expected:
        raise HTTPException(status_code=503, detail="市场 Skill 尚未配置内部调用令牌")
    if not token or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="市场 Skill 调用令牌无效")
    skill = MarketCategoryViralSkill()
    try:
        output = await skill.validate_from_backend(request.tenant_id, request.platform)
    except MarketCredentialError as exception:
        raise HTTPException(status_code=502, detail=str(exception)) from exception
    except MarketViralSkillError as exception:
        return {
            "code": 0,
            "message": "cookie validation failed",
            "data": {
                "platform": request.platform,
                "valid": False,
                "error": str(exception)[:500],
            },
        }
    return {"code": 0, "message": "success", "data": output}


def run() -> None:
    uvicorn.run("app.main:app", host="0.0.0.0", port=8091)
