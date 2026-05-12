from __future__ import annotations

import json
import re
from typing import Any
from sqlalchemy.orm import Session

from app.providers.llm.openai_compatible import get_llm_client


JSON_SYSTEM_PROMPT = """
你是 AI 爆款短视频脚本生成与复刻平台的后端业务智能体。
必须只返回合法 JSON，不要输出 Markdown，不要解释。
生成内容必须原创，不能照抄爆款原文；涉及广告表达时避免绝对化和不可验证承诺。
""".strip()


def optimize_product_brief(db: Session | None, tenant_id: str | None, payload: dict[str, Any]) -> dict[str, Any] | None:
    prompt = f"""
请将产品 Brief 整理为标准化营销输入，并返回 JSON 对象。
字段必须包含：productName, brief, sellingPoints, primarySellingPoint, auxiliarySellingPoints, targetGroups, otherRequirements, summary。
summary 用中文一句话说明目标人群、核心痛点、主卖点和脚本植入方向。

输入：
{json.dumps(payload, ensure_ascii=False)}
""".strip()
    data = _complete_json(db, tenant_id, prompt)
    if not isinstance(data, dict):
        return None
    return {
        "productName": str(data.get("productName") or payload.get("productName") or ""),
        "brief": str(data.get("brief") or payload.get("brief") or ""),
        "sellingPoints": _string_list(data.get("sellingPoints") or payload.get("sellingPoints")),
        "primarySellingPoint": str(data.get("primarySellingPoint") or payload.get("primarySellingPoint") or ""),
        "auxiliarySellingPoints": _string_list(data.get("auxiliarySellingPoints") or payload.get("auxiliarySellingPoints")),
        "targetGroups": _string_list(data.get("targetGroups") or payload.get("targetGroups")),
        "otherRequirements": str(data.get("otherRequirements") or payload.get("otherRequirements") or ""),
        "summary": str(data.get("summary") or ""),
    }


def analyze_source_link(db: Session | None, tenant_id: str | None, url: str, platform: str) -> dict[str, Any] | None:
    prompt = f"""
请基于短视频平台链接信息，生成一个可编辑的爆款结构分析占位结果。
返回 JSON 对象，字段必须包含：url, title, account, metrics, structure, report。
report 必须是 3-6 条中文字符串数组，描述拉片式分镜观察。
不要声称已经真实抓取视频，只能输出基于链接和平台的待确认分析草稿。

platform: {platform}
url: {url}
""".strip()
    data = _complete_json(db, tenant_id, prompt)
    if not isinstance(data, dict):
        return None
    return {
        "url": str(data.get("url") or url),
        "title": str(data.get("title") or "爆款结构分析草稿"),
        "account": str(data.get("account") or "待确认账号"),
        "metrics": str(data.get("metrics") or "播放/点赞/收藏数据待确认"),
        "structure": str(data.get("structure") or "痛点开场 + 场景放大 + 产品方案 + 轻 CTA"),
        "report": _string_list(data.get("report"))[:6] or ["开头建立场景和痛点", "中段展示产品方案", "结尾给出轻 CTA"],
    }


def generate_storyboard_rows(db: Session | None, tenant_id: str | None, project: dict[str, Any], step_states: list[dict[str, Any]]) -> list[dict[str, Any]] | None:
    prompt = f"""
请生成 3-6 个短视频分镜脚本行，返回 JSON 数组。
每个元素字段必须包含：id, shot, type, scene, line, duration, point, risk。
要求：
1. shot 使用“镜号 01”格式。
2. duration 使用“3s”格式。
3. risk 使用“低”或“中”。
4. 台词克制，避免“最、第一、全网第一”等绝对化表达。

项目：
{json.dumps(project, ensure_ascii=False, default=str)}

已保存步骤状态：
{json.dumps(step_states, ensure_ascii=False, default=str)}
""".strip()
    data = _complete_json(db, tenant_id, prompt, max_tokens=3000)
    if not isinstance(data, list):
        return None
    rows = [_normalize_storyboard_row(item, index) for index, item in enumerate(data[:6], start=1) if isinstance(item, dict)]
    return rows or None


def suggest_compliance(db: Session | None, tenant_id: str | None, rows: list[dict[str, Any]], matched_words: list[dict[str, Any]]) -> dict[str, Any] | None:
    prompt = f"""
请基于分镜脚本和命中的合规词，返回 JSON 对象。
字段必须包含：similarity, riskCount, suggestion。
similarity 是原创相似度百分比字符串，例如 "38%"。
suggestion 是一条中文修改建议；如果没有命中风险，说明仍需人工复核。

分镜：
{json.dumps(rows, ensure_ascii=False, default=str)}

命中词：
{json.dumps(matched_words, ensure_ascii=False, default=str)}
""".strip()
    data = _complete_json(db, tenant_id, prompt)
    if not isinstance(data, dict):
        return None
    return {
        "similarity": str(data.get("similarity") or "38%"),
        "riskCount": int(data.get("riskCount") or len(matched_words)),
        "suggestion": str(data.get("suggestion") or "当前脚本建议继续保留人工复核。"),
    }


def _complete_json(db: Session | None, tenant_id: str | None, user_prompt: str, *, max_tokens: int | None = None) -> Any | None:
    result = get_llm_client().complete(JSON_SYSTEM_PROMPT, user_prompt, db=db, tenant_id=tenant_id, max_tokens=max_tokens)
    if result is None:
        return None
    return _parse_json(result.content)


def _parse_json(content: str) -> Any | None:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"(\{.*\}|\[.*\])", text, re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None


def _string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in re.split(r"[,，、\n]", value) if item.strip()]
    return [str(value)]


def _normalize_storyboard_row(item: dict[str, Any], index: int) -> dict[str, Any]:
    duration = str(item.get("duration") or "3s")
    if duration.endswith("秒"):
        duration = duration.removesuffix("秒") + "s"
    if not duration.endswith("s"):
        duration = f"{duration}s"
    return {
        "id": int(item.get("id") or index),
        "shot": str(item.get("shot") or f"镜号 {index:02d}"),
        "type": str(item.get("type") or "中景"),
        "scene": str(item.get("scene") or "场景待补充"),
        "line": str(item.get("line") or "台词待补充"),
        "duration": duration,
        "point": str(item.get("point") or "卖点植入待补充"),
        "risk": str(item.get("risk") or "低"),
    }
