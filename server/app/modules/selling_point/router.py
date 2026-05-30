from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict

from app.api.deps import DbSession, get_current_front_user
from app.common.formatting import time_label
from app.common.import_parser import parse_import_file
from app.common.import_templates import get_import_template
from app.common.sql import all_rows, one
from app.providers.llm.prompts import compare_product_briefs, optimize_product_brief, score_product_brief


router = APIRouter(tags=["selling-point"])


@router.get("/import-templates/{template_code}")
def get_front_import_template(template_code: str, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    template = get_import_template(template_code)
    if not template or template.get("status") != "active":
        raise HTTPException(status_code=404, detail="Import template not found")
    return template


@router.post("/import-templates/{template_code}/parse")
async def parse_front_import_template(template_code: str, user: dict = Depends(get_current_front_user), file: UploadFile = File(...)) -> dict[str, Any]:
    template = get_import_template(template_code)
    if not template or template.get("status") != "active":
        raise HTTPException(status_code=404, detail="Import template not found")
    file_name = file.filename or "import.xlsx"
    if not file_name.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only csv/xlsx/xls files are supported")
    try:
        result = parse_import_file(file_name, await file.read())
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Failed to parse import file") from exc
    return {"templateCode": template_code, "fileName": file_name, **result}


class ProductBriefInput(BaseModel):
    model_config = ConfigDict(extra="allow")

    productName: str = ""
    brief: str = ""
    sellingPoints: list[str] = []
    primarySellingPoint: str = ""
    auxiliarySellingPoints: list[str] = []
    targetGroups: list[str] = []
    otherRequirements: str = ""


class CompareBriefPayload(BaseModel):
    current: dict[str, Any]
    baseline: dict[str, Any]
    context: dict[str, Any] | None = None


class ScoreBriefPayload(BaseModel):
    brief: dict[str, Any]
    context: dict[str, Any] | None = None


@router.get("/selling-point-assets")
def get_selling_assets(db: DbSession, user: dict = Depends(get_current_front_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT spa.id,
               spa.name,
               spa.tag,
               spa.main_point,
               COUNT(spai.id) AS item_count
        FROM selling_point_assets spa
        LEFT JOIN selling_point_asset_items spai ON spai.asset_id = spa.id
        WHERE spa.tenant_id = :tenant_id
          AND spa.status = 'enabled'
        GROUP BY spa.id
        ORDER BY spa.updated_at DESC
        """,
        {"tenant_id": user["tenant_id"]},
    )
    return [
        {
            "id": str(row["id"]),
            "name": row["name"],
            "tag": row.get("tag") or "已入库",
            "main": row.get("main_point") or "",
            "count": int(row.get("item_count") or 0),
        }
        for row in rows
    ]


@router.get("/selling-point-assets/{asset_id}")
def get_selling_asset_detail(asset_id: str, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    row = one(
        db,
        """
        SELECT id, name, tag, main_point, target_groups, usage_count, status, updated_at
        FROM selling_point_assets
        WHERE id = :asset_id
          AND tenant_id = :tenant_id
        LIMIT 1
        """,
        {"asset_id": asset_id, "tenant_id": user["tenant_id"]},
    )
    if not row:
        raise HTTPException(status_code=404, detail="Selling point asset not found")
    items = all_rows(
        db,
        """
        SELECT id, content, point_type, metadata
        FROM selling_point_asset_items
        WHERE asset_id = :asset_id
        ORDER BY created_at ASC
        """,
        {"asset_id": asset_id},
    )
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "tag": row.get("tag") or "已入库",
        "main": row.get("main_point") or "",
        "count": len(items),
        "targetGroups": row.get("target_groups") or [],
        "status": _selling_status(row.get("status")),
        "updatedAt": time_label(row.get("updated_at")),
        "items": [
            {
                "id": str(item["id"]),
                "content": item.get("content") or "",
                "pointType": _point_type_label(item.get("point_type")),
                "metadata": item.get("metadata") or {},
            }
            for item in items
        ],
    }


@router.post("/product-brief/optimize")
def optimize_brief(payload: ProductBriefInput, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    llm_result = optimize_product_brief(db, str(user["tenant_id"]), payload.model_dump())
    if llm_result:
        return llm_result

    product = payload.productName or "当前产品"
    primary = payload.primarySellingPoint or (payload.sellingPoints[0] if payload.sellingPoints else "核心卖点")
    groups = "、".join(payload.targetGroups) if payload.targetGroups else "目标用户"
    summary = f"AI 已提炼为：{groups}在具体使用场景中需要更高效的解决方案，{product}通过“{primary}”降低决策阻力，并可在脚本中结合辅助卖点自然植入。"
    return {**payload.model_dump(), "summary": summary}


@router.post("/product-brief/compare")
def compare_brief(payload: CompareBriefPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    current = payload.current or {}
    baseline = payload.baseline or {}
    llm_result = compare_product_briefs(db, str(user["tenant_id"]), current, baseline, payload.context)
    if llm_result:
        return llm_result
    fields = [
        ("specialSellingPoint", "特色卖点"),
        ("mainSellingPoint", "主卖点"),
        ("auxiliarySellingPoint", "辅助卖点"),
        ("suitableCrowd", "适合人群"),
        ("suitableScene", "适合场景"),
        ("productPrice", "产品价格"),
        ("productSlogan", "产品 Slogan"),
    ]
    changes = []
    for key, label in fields:
        before = str(baseline.get(key) or "")
        after = str(current.get(key) or "")
        if before != after:
            changes.append({"field": label, "before": before, "after": after})

    def calc_score(data: dict[str, Any]) -> int:
        return min(
            100,
            (20 if len(str(data.get("specialSellingPoint") or "")) > 10 else 0)
            + (30 if len(str(data.get("mainSellingPoint") or "")) > 5 else 0)
            + (15 if len(str(data.get("auxiliarySellingPoint") or "")) > 5 else 0)
            + (20 if len(str(data.get("suitableCrowd") or "")) > 3 else 0)
            + (15 if len(str(data.get("suitableScene") or "")) > 3 else 0),
        )

    summary = (
        "共检测到 " + str(len(changes)) + " 处变化：" + "；".join(
            f"【{item['field']}】由\"{item['before'] or '(空)'}\"变更为\"{item['after'] or '(空)'}\"" for item in changes
        ) + "。"
        if changes
        else "两版本内容一致，未检测到变化。"
    )
    return {**current, "summary": summary, "score": calc_score(current), "baselineScore": calc_score(baseline), "changes": changes}


@router.post("/product-brief/score")
def score_brief(payload: ScoreBriefPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    brief = payload.brief or {}
    llm_result = score_product_brief(db, str(user["tenant_id"]), brief, payload.context)
    if llm_result:
        return llm_result

    dimensions = [
        {"name": "特色卖点", "score": 80 if len(str(brief.get("specialSellingPoint") or "")) > 10 else 45, "comment": "评估差异化卖点是否明确。"},
        {"name": "主卖点", "score": 85 if len(str(brief.get("mainSellingPoint") or brief.get("primarySellingPoint") or "")) > 5 else 40, "comment": "评估核心记忆点是否清晰。"},
        {"name": "人群场景", "score": 80 if brief.get("suitableCrowd") and brief.get("suitableScene") else 45, "comment": "评估目标人群和场景完整度。"},
    ]
    score = round(sum(item["score"] for item in dimensions) / len(dimensions))
    return {
        "score": score,
        "summary": f"当前 Brief 规则评分为 {score}/100。未调用到可用大模型 Provider，已返回兜底评分。",
        "dimensions": dimensions,
        "suggestions": ["建议在后台大模型管理配置启用 LLM Provider，以获得模型检测结果。"],
        "risks": [] if score >= 70 else ["Brief 信息不完整，脚本生成质量可能不稳定。"],
        "modelProvider": "fallback-rule",
        "modelName": "none",
        "promptName": "Brief 评分检测",
        "promptVersion": "fallback",
        "rawPreview": "未调用到可用大模型 Provider，返回规则兜底结果。",
    }


def _selling_status(status: str | None) -> str:
    return {"enabled": "已入库", "disabled": "已停用", "pending": "待复核"}.get(status or "", status or "已入库")


def _point_type_label(point_type: str | None) -> str:
    return {"primary": "主卖点", "auxiliary": "辅助卖点", "candidate": "候选卖点"}.get(point_type or "", point_type or "卖点")
