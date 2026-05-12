from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from app.api.deps import DbSession, get_current_front_user
from app.common.formatting import time_label
from app.common.sql import all_rows, one
from app.providers.llm.prompts import optimize_product_brief


router = APIRouter(tags=["selling-point"])


class ProductBriefInput(BaseModel):
    model_config = ConfigDict(extra="allow")

    productName: str = ""
    brief: str = ""
    sellingPoints: list[str] = []
    primarySellingPoint: str = ""
    auxiliarySellingPoints: list[str] = []
    targetGroups: list[str] = []
    otherRequirements: str = ""


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


def _selling_status(status: str | None) -> str:
    return {"enabled": "已入库", "disabled": "已停用", "pending": "待复核"}.get(status or "", status or "已入库")


def _point_type_label(point_type: str | None) -> str:
    return {"primary": "主卖点", "auxiliary": "辅助卖点", "candidate": "候选卖点"}.get(point_type or "", point_type or "卖点")
