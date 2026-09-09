import asyncio
from typing import Any

from app.providers.spring_gateway import SpringProviderGateway
from app.skills.base import Skill, SkillContext


class ResourceSkill(Skill):
    def __init__(self, kind: str):
        self.kind = kind
        self.code = f"resource.{kind}"

    async def execute(
        self,
        context: SkillContext,
        inputs: dict[str, Any],
        config: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "nodeId": context.node_id,
            "resource": config.get("assetUrl") or config.get("content") or config.get("prompt"),
            "assetUrl": config.get("assetUrl"),
        }


class ProviderSkill(Skill):
    def __init__(self, kind: str, gateway: SpringProviderGateway):
        self.kind = kind
        self.code = f"provider.{kind}"
        self.gateway = gateway

    async def execute(
        self,
        context: SkillContext,
        inputs: dict[str, Any],
        config: dict[str, Any],
    ) -> dict[str, Any]:
        output = await self.gateway.execute(context, self.kind, inputs, config)
        return {**output, "skillCode": self.code, "nodeId": context.node_id}


class BatchMaterialSkill(Skill):
    code = "provider.batch-material"

    def __init__(self, gateway: SpringProviderGateway, max_concurrency: int = 4):
        self.gateway = gateway
        self.max_concurrency = max(1, max_concurrency)

    async def execute(
        self,
        context: SkillContext,
        inputs: dict[str, Any],
        config: dict[str, Any],
    ) -> dict[str, Any]:
        batch_size = max(1, min(100, _int_value(config.get("batchSize"), 100)))
        media_kind = "image" if str(config.get("mediaType", "video")).lower() == "image" else "video"
        prompts = _material_prompts(config, inputs, batch_size)
        semaphore = asyncio.Semaphore(self.max_concurrency)

        async def generate(index: int, prompt: str) -> dict[str, Any]:
            async with semaphore:
                item_config = {**config, "prompt": prompt, "count": 1, "batchIndex": index}
                item_context = SkillContext(
                    run_id=context.run_id,
                    tenant_id=context.tenant_id,
                    project_id=context.project_id,
                    node_id=f"{context.node_id}#{index + 1}",
                )
                output = await self.gateway.execute(item_context, media_kind, inputs, item_config)
                return {"index": index + 1, "prompt": prompt, **output}

        assets = await asyncio.gather(*[
            generate(index, prompt) for index, prompt in enumerate(prompts)
        ])
        urls = [str(item["assetUrl"]) for item in assets if item.get("assetUrl")]
        return {
            "kind": "batchMaterial",
            "mediaType": media_kind,
            "count": len(assets),
            "assetUrl": urls[0] if urls else None,
            "assetUrls": urls,
            "assets": assets,
            "skillCode": self.code,
        }


def _material_prompts(
    config: dict[str, Any],
    inputs: dict[str, Any],
    count: int,
) -> list[str]:
    configured = config.get("prompts")
    if isinstance(configured, list):
        prompts = [str(value).strip() for value in configured if str(value).strip()]
    else:
        prompts = []
    base = str(config.get("prompt") or _first_upstream_text(inputs) or "产品卖点素材镜头").strip()
    while len(prompts) < count:
        prompts.append(f"{base}\n镜头编号：{len(prompts) + 1}，保持产品、人物和视觉风格一致。")
    return prompts[:count]


def _first_upstream_text(inputs: dict[str, Any]) -> str:
    upstream = inputs.get("upstream")
    if not isinstance(upstream, dict):
        return ""
    for output in upstream.values():
        if not isinstance(output, dict):
            continue
        for key in ("text", "resource", "prompt"):
            if output.get(key):
                return str(output[key])
    return ""


def _int_value(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback
