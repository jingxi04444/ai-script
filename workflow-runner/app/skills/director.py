"""Pass an explicitly exported director frame to downstream generation skills."""

from typing import Any
from urllib.parse import urlsplit

from app.skills.base import Skill, SkillContext


class DirectorResourceSkill(Skill):
    code = "resource.director"

    async def execute(
        self,
        context: SkillContext,
        inputs: dict[str, Any],
        config: dict[str, Any],
    ) -> dict[str, Any]:
        asset_url = config.get("outputUrl") or config.get("assetUrl")
        if not isinstance(asset_url, str) or not asset_url.strip():
            raise ValueError("导演台尚未导出机位截图，请打开导演台并将机位截图发送到画布后再执行")
        asset_url = asset_url.strip()
        parsed = urlsplit(asset_url)
        if parsed.scheme in ("data", "blob"):
            raise ValueError("导演台截图仅保存在浏览器中，请登录并上传截图后再执行真实工作流")
        is_http = parsed.scheme in ("http", "https") and bool(parsed.netloc)
        is_asset_path = asset_url.startswith("/") and not asset_url.startswith("//")
        if not is_http and not is_asset_path:
            raise ValueError("导演台截图地址无效，请重新导出并上传机位截图")
        return {
            "kind": "director",
            "mediaType": "image",
            "nodeId": context.node_id,
            "skillCode": self.code,
            "resource": asset_url,
            "assetUrl": asset_url,
            "aspectRatio": config.get("aspectRatio") or "16:9",
        }
