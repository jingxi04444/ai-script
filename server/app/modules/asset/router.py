from typing import Any
import json

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import DbSession, get_current_front_user
from app.common.formatting import time_label
from app.common.sql import all_rows, one


router = APIRouter(tags=["asset"])


@router.get("/assets")
def get_assets(db: DbSession, user: dict = Depends(get_current_front_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT id, name, asset_type, category, status, metadata
        FROM assets
        WHERE tenant_id = :tenant_id
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 100
        """,
        {"tenant_id": user["tenant_id"]},
    )
    return [
        {
            "id": str(row["id"]),
            "name": row["name"],
            "type": row.get("category") or row.get("asset_type") or "素材",
            "status": _front_status(row.get("status")),
            "tag": (row.get("metadata") or {}).get("tag") or "项目素材",
        }
        for row in rows
    ]


@router.get("/asset-library")
def get_asset_library(db: DbSession, user: dict = Depends(get_current_front_user)) -> list[dict[str, Any]]:
    selling_assets = all_rows(
        db,
        """
        SELECT spa.id,
               spa.name,
               spa.tag,
               spa.status,
               spa.updated_at,
               COUNT(spai.id) AS item_count
        FROM selling_point_assets spa
        LEFT JOIN selling_point_asset_items spai ON spai.asset_id = spa.id
        WHERE spa.tenant_id = :tenant_id
        GROUP BY spa.id
        ORDER BY spa.updated_at DESC
        """,
        {"tenant_id": user["tenant_id"]},
    )
    viral_assets = all_rows(
        db,
        """
        SELECT id, name, asset_kind, platform, status, updated_at, usage_count
        FROM viral_script_assets
        WHERE tenant_id = :tenant_id
        ORDER BY updated_at DESC
        """,
        {"tenant_id": user["tenant_id"]},
    )
    return [
        {
            "id": str(row["id"]),
            "library": "selling-point",
            "name": row["name"],
            "tag": row.get("tag") or "产品卖点脚本",
            "status": _library_status(row.get("status")),
            "updatedAt": time_label(row.get("updated_at")),
            "count": int(row.get("item_count") or 0),
        }
        for row in selling_assets
    ] + [
        {
            "id": str(row["id"]),
            "library": "viral-script",
            "name": row["name"],
            "tag": _viral_kind_label(row.get("asset_kind"), row.get("platform")),
            "status": _library_status(row.get("status")),
            "updatedAt": time_label(row.get("updated_at")),
            "count": int(row.get("usage_count") or 0),
        }
        for row in viral_assets
    ]


@router.get("/asset-library/{library}/{asset_id}")
def get_asset_library_detail(library: str, asset_id: str, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    if library == "selling-point":
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
            raise HTTPException(status_code=404, detail="Asset not found")
        items = all_rows(
            db,
            """
            SELECT content, point_type
            FROM selling_point_asset_items
            WHERE asset_id = :asset_id
            ORDER BY created_at ASC
            """,
            {"asset_id": asset_id},
        )
        return {
            "id": str(row["id"]),
            "library": "selling-point",
            "name": row["name"],
            "tag": row.get("tag") or "产品卖点脚本",
            "status": _library_status(row.get("status")),
            "updatedAt": time_label(row.get("updated_at")),
            "count": len(items),
            "summary": row.get("main_point") or "",
            "sections": [
                {"title": "主卖点", "content": row.get("main_point") or ""},
                {"title": "目标人群", "content": "、".join(row.get("target_groups") or []) or "暂无"},
                {"title": "卖点明细", "content": "\n".join([f"{_point_type_label(item.get('point_type'))}：{item.get('content') or ''}" for item in items]) or "暂无明细"},
            ],
        }
    if library == "viral-script":
        row = one(
            db,
            """
            SELECT id, name, asset_kind, platform, source_url, script_text, structure_formula, shot_report, tags, usage_count, status, updated_at
            FROM viral_script_assets
            WHERE id = :asset_id
              AND tenant_id = :tenant_id
            LIMIT 1
            """,
            {"asset_id": asset_id, "tenant_id": user["tenant_id"]},
        )
        if not row:
            raise HTTPException(status_code=404, detail="Asset not found")
        return {
            "id": str(row["id"]),
            "library": "viral-script",
            "name": row["name"],
            "tag": _viral_kind_label(row.get("asset_kind"), row.get("platform")),
            "status": _library_status(row.get("status")),
            "updatedAt": time_label(row.get("updated_at")),
            "count": int(row.get("usage_count") or 0),
            "summary": row.get("structure_formula") or row.get("script_text") or "",
            "sections": [
                {"title": "平台 / 类型", "content": _viral_kind_label(row.get("asset_kind"), row.get("platform"))},
                {"title": "来源链接", "content": row.get("source_url") or "暂无"},
                {"title": "脚本文案", "content": row.get("script_text") or "暂无"},
                {"title": "结构公式", "content": row.get("structure_formula") or "暂无"},
                {"title": "拉片报告", "content": _stringify(row.get("shot_report"))},
                {"title": "标签", "content": "、".join(row.get("tags") or []) or "暂无"},
            ],
        }
    raise HTTPException(status_code=404, detail="Unknown asset library")


def _front_status(status: str | None) -> str:
    return {
        "available": "待确认",
        "bound": "已绑定",
        "generated": "已生成",
        "deleted": "已删除",
    }.get(status or "", status or "待确认")


def _library_status(status: str | None) -> str:
    return {
        "enabled": "已入库",
        "disabled": "已停用",
        "pending": "待复核",
    }.get(status or "", status or "已入库")


def _viral_kind_label(asset_kind: str | None, platform: str | None) -> str:
    kind = {
        "script": "爆款脚本",
        "structure_formula": "结构公式",
        "shot_report": "拉片报告",
        "link_analysis": "链接分析",
    }.get(asset_kind or "", "爆款链接脚本")
    return f"{platform} / {kind}" if platform else kind


def _point_type_label(point_type: str | None) -> str:
    return {"primary": "主卖点", "auxiliary": "辅助卖点", "candidate": "候选卖点"}.get(point_type or "", point_type or "卖点")


def _stringify(value: Any) -> str:
    if value is None:
        return "暂无"
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, indent=2)
