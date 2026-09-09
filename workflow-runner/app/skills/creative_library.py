"""Immutable canvas resource snapshots, not executable plugins or provider config."""

import json
from typing import Any
from urllib.parse import urlsplit

from app.skills.base import Skill, SkillContext
from app.skills.provider import ResourceSkill


_TEMPLATE_KEYS = (
    "identity", "wardrobe", "lighting", "palette", "cameraMotion",
    "durationSeconds", "strength", "preserveSubject",
)
_LABELS = {"character": "角色设定", "style": "视觉风格参考", "effect": "特效/运镜提示词模板"}


def _image_url(value: Any) -> str:
    url = str(value or "").strip()
    if not url:
        return ""
    parts = urlsplit(url)
    if len(url) > 2048 or any(c.isspace() or ord(c) < 32 for c in url) or "\\" in url:
        raise ValueError("创意资源图片地址无效，请重新上传并引用")
    if (url.startswith("/") and not url.startswith("//")) or (
        parts.scheme in {"https", "http"} and parts.hostname and not parts.username and not parts.password
    ):
        return url
    raise ValueError("创意资源图片必须使用 HTTP(S) 或站内上传地址，不能使用浏览器临时地址")


class CreativeResourceSkill(Skill):
    """Pass templates as text; never merge arbitrary catalog JSON into model parameters."""

    def __init__(self, kind: str):
        if kind not in _LABELS:
            raise ValueError("未知的创意资源类型")
        self.kind = kind
        self.code = f"resource.{kind}"

    async def execute(
        self, context: SkillContext, inputs: dict[str, Any], config: dict[str, Any],
    ) -> dict[str, Any]:
        # Old projects may contain uploaded character resources without catalog metadata.
        if self.kind == "character" and not config.get("creativeResourceId") and not config.get("resourcePrompt"):
            return await ResourceSkill(self.kind).execute(context, inputs, config)
        prompt = str(config.get("resourcePrompt") or "").strip()
        if not prompt:
            raise ValueError("创意资源缺少提示词模板，请在资源库中重新选择")
        if len(prompt) > 12000:
            raise ValueError("创意资源提示词过长")
        name = str(config.get("resourceName") or _LABELS[self.kind])[:120]
        parts = [f"【{_LABELS[self.kind]}：{name}】", prompt]
        negative = str(config.get("resourceNegativePrompt") or "").strip()
        if negative:
            if len(negative) > 6000:
                raise ValueError("创意资源负向提示词过长")
            parts.append(f"避免内容：{negative}")
        resource_config = config.get("resourceConfig")
        hints: dict[str, Any] = {}
        if isinstance(resource_config, dict):
            for key in _TEMPLATE_KEYS:
                value = resource_config.get(key)
                if isinstance(value, (str, int, float, bool)):
                    hints[key] = value[:500] if isinstance(value, str) else value
        if hints:
            parts.append("创作参考参数（不覆盖下游模型设置）：" + json.dumps(hints, ensure_ascii=False))
        # Effects have covers for browsing, not generation input frames or source footage.
        urls: list[str] = []
        if self.kind != "effect":
            cover = _image_url(config.get("assetUrl") or config.get("resourceCoverUrl"))
            if cover:
                urls.append(cover)
            if self.kind == "character":
                gallery = config.get("resourceGallery")
                for item in gallery[:12] if isinstance(gallery, list) else []:
                    if isinstance(item, dict):
                        url = _image_url(item.get("url"))
                        if url and url not in urls:
                            urls.append(url)
            if not urls:
                raise ValueError("角色或风格资源缺少参考图片，请重新选择")
        return {
            "kind": self.kind,
            "nodeId": context.node_id,
            "skillCode": self.code,
            "creativeResourceId": str(config.get("creativeResourceId") or ""),
            "resourceName": name,
            "resource": "\n".join(parts),
            "assetUrl": urls[0] if urls else None,
            "assetUrls": urls,
            "mediaType": "image" if urls else "template",
            "templateOnly": self.kind == "effect",
        }
