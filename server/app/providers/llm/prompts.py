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


def score_product_brief(db: Session | None, tenant_id: str | None, brief: dict[str, Any], context: dict[str, Any] | None = None) -> dict[str, Any] | None:
    template = _prompt_template("prompt_brief_score")
    prompt = f"""
{template['userPromptTemplate']}

上下文：
{json.dumps(context or {}, ensure_ascii=False)}

Brief：
{json.dumps(brief, ensure_ascii=False)}

只返回 JSON，字段必须包含：score, summary, dimensions, suggestions, risks。
dimensions 每项包含 name, score, comment。
""".strip()
    result = get_llm_client().complete(template["systemPrompt"], prompt, db=db, tenant_id=tenant_id, max_tokens=1800)
    if result is None:
        return None
    data = _parse_json(result.content)
    if not isinstance(data, dict):
        return None
    return {
        "score": int(data.get("score") or 0),
        "summary": str(data.get("summary") or ""),
        "dimensions": _dimensions(data.get("dimensions")),
        "suggestions": _string_list(data.get("suggestions")),
        "risks": _string_list(data.get("risks")),
        "modelProvider": result.provider,
        "modelName": result.model,
        "promptName": template["name"],
        "promptVersion": template["version"],
        "rawPreview": result.content[:2000],
    }


def compare_product_briefs(db: Session | None, tenant_id: str | None, current: dict[str, Any], baseline: dict[str, Any], context: dict[str, Any] | None = None) -> dict[str, Any] | None:
    template = _prompt_template("prompt_brief_compare")
    prompt = f"""
{template['userPromptTemplate']}

上下文：
{json.dumps(context or {}, ensure_ascii=False)}

基线版本：
{json.dumps(baseline, ensure_ascii=False)}

对比版本：
{json.dumps(current, ensure_ascii=False)}

只返回 JSON，字段必须包含：score, baselineScore, summary, changes, suggestions, risks, conclusion。
changes 每项包含 field, before, after, impact。
""".strip()
    result = get_llm_client().complete(template["systemPrompt"], prompt, db=db, tenant_id=tenant_id, max_tokens=2200)
    if result is None:
        return None
    data = _parse_json(result.content)
    if not isinstance(data, dict):
        return None
    return {
        **current,
        "score": int(data.get("score") or 0),
        "baselineScore": int(data.get("baselineScore") or data.get("baseline_score") or 0),
        "summary": str(data.get("summary") or ""),
        "changes": _changes(data.get("changes")),
        "suggestions": _string_list(data.get("suggestions")),
        "risks": _string_list(data.get("risks")),
        "conclusion": str(data.get("conclusion") or ""),
        "modelProvider": result.provider,
        "modelName": result.model,
        "promptName": template["name"],
        "promptVersion": template["version"],
        "rawPreview": result.content[:2000],
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


def _prompt_template(template_id: str) -> dict[str, str]:
    templates = {
        "prompt_brief_score": {
            "name": "Brief 评分检测",
            "version": "v1.0",
            "systemPrompt": "你是资深短视频增长策略师，请对单个产品 Brief 做质量评分，重点评估信息完整度、主卖点清晰度、差异化竞争力、人群与场景匹配度，并给出可执行优化建议。必须只返回合法 JSON。",
            "userPromptTemplate": "请评估产品 Brief 的质量。",
        },
        "prompt_brief_compare": {
            "name": "Brief 版本对比检测",
            "version": "v1.2",
            "systemPrompt": "你是资深短视频增长策略师，请对两个产品 Brief 版本做结构化差异检测，重点判断卖点清晰度、目标人群匹配度、脚本生成风险和优化建议。必须只返回合法 JSON。",
            "userPromptTemplate": "请对比两个产品 Brief 版本。",
        },
    }
    return templates[template_id]


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


def _dimensions(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [
        {"name": str(item.get("name") or "维度"), "score": int(item.get("score") or 0), "comment": str(item.get("comment") or "")}
        for item in value
        if isinstance(item, dict)
    ]


def _changes(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    return [
        {"field": str(item.get("field") or "字段"), "before": str(item.get("before") or ""), "after": str(item.get("after") or ""), "impact": str(item.get("impact") or "")}
        for item in value
        if isinstance(item, dict)
    ]


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
