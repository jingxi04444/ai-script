from __future__ import annotations

from copy import deepcopy
from typing import Any


IMPORT_TEMPLATES: dict[str, dict[str, Any]] = {
    "selling-point-template": {
        "code": "selling-point-template",
        "name": "卖点导入模板",
        "description": "用于前台“导入卖点表格”，字段会映射到产品 Brief、卖点、人群和场景。",
        "fileName": "卖点导入模板.csv",
        "fileType": "csv",
        "columns": ["产品型号", "价格", "产品slogan", "特色卖点", "主卖点", "辅助卖点", "目标人群", "目标场景"],
        "sampleRows": [
            ["JRFH-2026", "299", "热饭自由", "低温慢热不破坏口感", "20 分钟快速加热", "分层防串味", "职场加班族", "办公室晚餐"],
            ["JRFH-2026", "299", "热饭自由", "三档温控", "加热均匀", "食品级内胆", "租房独居人群", "下班回家热饭"],
        ],
        "instructions": "请保留表头；产品型号为 Brief 唯一匹配字段；同型号会追加新版本，不存在则新建 Brief v1.0。",
        "status": "active",
        "updatedAt": "系统默认",
    }
}


def list_import_templates() -> list[dict[str, Any]]:
    return [deepcopy(item) for item in IMPORT_TEMPLATES.values()]


def get_import_template(code: str) -> dict[str, Any] | None:
    template = IMPORT_TEMPLATES.get(code)
    return deepcopy(template) if template else None


def update_import_template(code: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    template = IMPORT_TEMPLATES.get(code)
    if not template:
        return None
    for key in ["name", "description", "fileName", "fileType", "columns", "sampleRows", "instructions", "status"]:
        if key in payload:
            template[key] = payload[key]
    template["updatedAt"] = "刚刚"
    return deepcopy(template)
