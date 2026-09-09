import asyncio
from typing import Any

from app.skills.base import Skill, SkillContext


class SimulatedSkill(Skill):
    def __init__(self, kind: str, delay_ms: int):
        self.kind = kind
        self.code = f"builtin.{kind}"
        self.delay_ms = delay_ms

    async def execute(
        self,
        context: SkillContext,
        inputs: dict[str, Any],
        config: dict[str, Any],
    ) -> dict[str, Any]:
        await asyncio.sleep(self.delay_ms / 1000)
        base = {
            "kind": self.kind,
            "nodeId": context.node_id,
            "skillCode": self.code,
            "upstreamNodeIds": list(inputs.get("upstream", {}).keys()),
        }
        if self.kind in {"product", "scene", "character", "storyboard", "result"}:
            return {**base, "resource": config.get("assetUrl") or config.get("prompt")}
        if self.kind in {"text", "scriptGenerator", "prompt", "categorySkill"}:
            return {**base, "text": config.get("prompt") or "模拟生成的工作流文本结果"}
        if self.kind == "image":
            return {**base, "assetUrl": "/demo-media/skincare-lifestyle.jpg", "count": config.get("batchSize", 1)}
        if self.kind in {"video", "batchMaterial"}:
            return {**base, "assetUrl": "/demo-media/skincare-demo.mp4", "count": config.get("batchSize", 1)}
        if self.kind == "voice":
            return {**base, "voice": config.get("voice", "年轻女声·清透"), "durationSeconds": 6.2}
        if self.kind in {"editor", "export"}:
            return {**base, "outputCount": config.get("outputCount", 1), "status": "assembled"}
        return base
