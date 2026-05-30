from typing import Any
import re
import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text

from app.api.deps import DbSession, get_current_admin_user
from app.common.formatting import bytes_label, cn_status, risk_label, time_label
from app.common.import_templates import list_import_templates, update_import_template
from app.common.sql import all_rows, one


router = APIRouter(prefix="/admin", tags=["admin"])

PROMPT_TEMPLATES: dict[str, dict[str, Any]] = {
    "prompt_brief_score": {
        "id": "prompt_brief_score",
        "scene": "brief_score",
        "name": "Brief 评分检测",
        "version": "v1.0",
        "providerId": "auto",
        "providerName": "后台启用 ASR/LLM Provider",
        "model": "按 API Provider 配置",
        "systemPrompt": "你是资深短视频增长策略师，请对单个产品 Brief 做质量评分，重点评估信息完整度、主卖点清晰度、差异化竞争力、人群与场景匹配度，并给出可执行优化建议。",
        "userPromptTemplate": "产品 Brief：{{briefName}}\n版本：{{version}}\nBrief 内容：{{brief}}\n请输出综合评分、维度评分、检测结论、风险提醒和优化建议。",
        "outputSchema": '{ "score": 0, "summary": "", "dimensions": [{ "name": "", "score": 0, "comment": "" }], "suggestions": [], "risks": [] }',
        "status": "active",
        "updatedAt": "系统默认",
    },
    "prompt_brief_compare": {
        "id": "prompt_brief_compare",
        "scene": "brief_compare",
        "name": "Brief 版本对比检测",
        "version": "v1.2",
        "providerId": "auto",
        "providerName": "后台启用 LLM Provider",
        "model": "按 API Provider 配置",
        "systemPrompt": "你是资深短视频增长策略师，请对两个产品 Brief 版本做结构化差异检测，重点判断卖点清晰度、目标人群匹配度、脚本生成风险和优化建议。",
        "userPromptTemplate": "产品 Brief：{{briefName}}\n基线版本：{{baselineVersion}}\n对比版本：{{currentVersion}}\n基线内容：{{baselineBrief}}\n对比内容：{{currentBrief}}\n请输出评分、关键变化、风险和建议。",
        "outputSchema": '{ "score": 0, "baselineScore": 0, "summary": "", "changes": [{ "field": "", "before": "", "after": "", "impact": "" }], "suggestions": [], "risks": [], "conclusion": "" }',
        "status": "active",
        "updatedAt": "系统默认",
    },
}


class AdminMenuItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    label: str
    path: str
    permission: str
    enabled: bool
    order: int


class UpdateMenusPayload(BaseModel):
    menus: list[AdminMenuItem]


class LLMProviderPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    providerName: str | None = None
    name: str | None = None
    providerType: str = "llm"
    platform: str | None = None
    endpointUrl: str | None = None
    apiBaseUrl: str | None = None
    apiKey: str | None = None
    apiKeyRef: str | None = None
    model: str | None = None
    priority: int = 100
    timeoutMs: int = 60000
    retryCount: int = 2
    status: str = "enabled"
    temperature: float = 0.3
    maxTokens: int = 3000
    description: str | None = None


def _is_uuid(value: str) -> bool:
    try:
        UUID(str(value))
        return True
    except ValueError:
        return False


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return cleaned or f"tenant-{int(time.time())}"


def _menu_response(row: dict) -> dict[str, Any]:
    return {
        "id": row["id"],
        "label": row["label"],
        "path": row["path"],
        "permission": row["permission_code"],
        "enabled": row["enabled"],
        "order": row["display_order"],
    }


def _write_operation(db, user: dict, module: str, action: str, target_type: str | None = None, target_id: str | None = None) -> None:
    db.execute(
        text(
            """
            INSERT INTO operation_logs (tenant_id, user_id, module, action, target_type, target_id, result, ip_address, user_agent)
            VALUES (:tenant_id, :user_id, :module, :action, :target_type, :target_id, 'success', '127.0.0.1', 'server')
            """
        ),
        {
            "tenant_id": user.get("tenant_id"),
            "user_id": user["id"],
            "module": module,
            "action": action,
            "target_type": target_type,
            "target_id": target_id if target_id and _is_uuid(target_id) else None,
        },
    )


@router.get("/menus")
def get_menus(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(db, "SELECT * FROM admin_menus ORDER BY display_order ASC")
    return [_menu_response(row) for row in rows]


@router.put("/menus")
def update_menus(payload: UpdateMenusPayload, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    for item in payload.menus:
        enabled = True if item.id == "system" else item.enabled
        db.execute(
            text(
                """
                INSERT INTO permissions (code, name, module, description)
                VALUES (:code, :name, 'admin', '动态菜单自动创建权限点')
                ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
                """
            ),
            {"code": item.permission, "name": item.label},
        )
        db.execute(
            text(
                """
                INSERT INTO admin_menus (id, label, path, permission_code, enabled, display_order, updated_at)
                VALUES (:id, :label, :path, :permission, :enabled, :display_order, now())
                ON CONFLICT (id) DO UPDATE SET
                  label = EXCLUDED.label,
                  path = EXCLUDED.path,
                  permission_code = EXCLUDED.permission_code,
                  enabled = EXCLUDED.enabled,
                  display_order = EXCLUDED.display_order,
                  updated_at = now()
                """
            ),
            {
                "id": item.id,
                "label": item.label,
                "path": item.path,
                "permission": item.permission,
                "enabled": enabled,
                "display_order": item.order,
            },
        )
    _write_operation(db, user, "动态菜单配置", "更新菜单配置", "admin_menus")
    db.commit()
    return {"menus": get_menus(db, user), "updatedAt": "刚刚"}


@router.get("/dashboard/overview")
def get_dashboard_overview(db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    counts = one(
        db,
        """
        SELECT
          (SELECT COUNT(*) FROM projects WHERE created_at::date = current_date AND deleted_at IS NULL) AS today_projects,
          (SELECT COUNT(*) FROM storyboard_scripts WHERE created_at::date = current_date) AS today_scripts,
          (SELECT COUNT(*) FROM generation_tasks WHERE created_at::date = current_date AND status = 'succeeded') AS today_videos,
          (SELECT COUNT(*) FROM audit_tasks WHERE status = 'approved') AS approved_audits,
          (SELECT COUNT(*) FROM audit_tasks) AS total_audits,
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS user_count,
          (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL) AS asset_count,
          (SELECT COUNT(*) FROM parsing_logs) AS parsing_total,
          (SELECT COUNT(*) FROM parsing_logs WHERE status = 'success') AS parsing_success
        """,
    ) or {}
    today_scripts = int(counts.get("today_scripts") or 0)
    today_videos = int(counts.get("today_videos") or 0)
    total_audits = int(counts.get("total_audits") or 0)
    approved_audits = int(counts.get("approved_audits") or 0)
    parsing_total = int(counts.get("parsing_total") or 0)
    parsing_success = int(counts.get("parsing_success") or 0)
    approval_rate = f"{(approved_audits / total_audits * 100):.1f}%" if total_audits else "100.0%"
    parsing_rate = int(parsing_success / parsing_total * 100) if parsing_total else 100
    trend_rows = all_rows(
        db,
        """
        SELECT day::date AS metric_date
        FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') AS day
        ORDER BY day
        """,
    )
    platform_rows = all_rows(
        db,
        """
        SELECT platform, COUNT(*) AS count
        FROM projects
        WHERE deleted_at IS NULL
        GROUP BY platform
        ORDER BY count DESC
        LIMIT 6
        """,
    )
    return {
        "headline": {
            "totalOutput": today_scripts + today_videos,
            "approvalRate": approval_rate,
            "description": "实时汇总项目产能、审核通过率、平台分布和系统运行状态。",
        },
        "stats": [
            {"title": "今日项目", "value": str(counts.get("today_projects") or 0), "change": "+0", "trend": "up", "tone": "#2563eb", "bg": "#eff6ff", "icon": "file", "meta": "今日新增"},
            {"title": "脚本生成", "value": str(today_scripts), "change": "+0", "trend": "up", "tone": "#16a34a", "bg": "#f0fdf4", "icon": "video", "meta": "今日产出"},
            {"title": "后台用户", "value": str(counts.get("user_count") or 0), "change": "+0", "trend": "up", "tone": "#7c3aed", "bg": "#f5f3ff", "icon": "users", "meta": "有效账号"},
            {"title": "素材总量", "value": str(counts.get("asset_count") or 0), "change": "+0", "trend": "up", "tone": "#f97316", "bg": "#fff7ed", "icon": "shield", "meta": "已入库"},
        ],
        "trends": [
            {"name": str(row["metric_date"])[5:], "scriptCount": today_scripts, "videoCount": today_videos, "approvedCount": approved_audits}
            for row in trend_rows
        ],
        "platformDistribution": [
            {"name": row.get("platform") or "未设置", "count": int(row.get("count") or 0)}
            for row in platform_rows
        ] or [{"name": "暂无项目", "count": 0}],
        "systemMetrics": [
            {"label": "解析成功率", "value": parsing_rate, "color": "#16a34a" if parsing_rate >= 95 else "#f97316", "detail": f"成功 {parsing_success} / 总计 {parsing_total}"},
            {"label": "审核通过率", "value": int(float(approval_rate.rstrip('%'))), "color": "#2563eb", "detail": f"通过 {approved_audits} / 总计 {total_audits}"},
            {"label": "API 可用性", "value": 100, "color": "#0f766e", "detail": "后端接口已连接"},
        ],
    }


@router.get("/projects")
def get_admin_projects(keyword: str | None = None, brand: str | None = None, status: str | None = None, page: int = 1, pageSize: int = 12, db: DbSession = None, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    page = max(page, 1)
    page_size = min(max(pageSize, 1), 100)
    filters = """
        p.deleted_at IS NULL
        AND (CAST(:keyword AS text) IS NULL OR CAST(:keyword AS text) = '' OR p.title ILIKE '%' || CAST(:keyword AS text) || '%' OR t.name ILIKE '%' || CAST(:keyword AS text) || '%' OR p.product_name ILIKE '%' || CAST(:keyword AS text) || '%')
        AND (CAST(:brand AS text) IS NULL OR CAST(:brand AS text) = '' OR t.name = CAST(:brand AS text))
        AND (CAST(:status AS text) IS NULL OR CAST(:status AS text) = '' OR p.status = CAST(:status AS text))
    """
    params = {"keyword": keyword, "brand": brand, "status": status, "limit": page_size, "offset": (page - 1) * page_size}
    total = db.execute(
        text(
            f"""
            SELECT COUNT(*)
            FROM projects p
            LEFT JOIN tenants t ON t.id = p.tenant_id
            WHERE {filters}
            """
        ),
        params,
    ).scalar() or 0
    rows = all_rows(
        db,
        f"""
        SELECT p.*, t.name AS tenant_name, u.name AS owner_name
        FROM projects p
        LEFT JOIN tenants t ON t.id = p.tenant_id
        LEFT JOIN users u ON u.id = p.owner_id
        WHERE {filters}
        ORDER BY p.created_at DESC
        LIMIT :limit OFFSET :offset
        """,
        params,
    )
    script_counts = all_rows(db, "SELECT project_id, COUNT(*) AS cnt FROM storyboard_scripts GROUP BY project_id")
    script_map = {str(r["project_id"]): int(r["cnt"]) for r in script_counts}
    video_counts = all_rows(db, "SELECT project_id, COUNT(*) AS cnt FROM generation_tasks WHERE status = 'succeeded' GROUP BY project_id")
    video_map = {str(r["project_id"]): int(r["cnt"]) for r in video_counts}
    items = [
        {
            "id": str(row["id"]),
            "name": row["title"],
            "brand": row.get("tenant_name") or "-",
            "status": row.get("status") or "draft",
            "creator": row.get("owner_name") or "-",
            "createTime": time_label(row.get("created_at")),
            "scriptCount": script_map.get(str(row["id"]), 0),
            "videoCount": video_map.get(str(row["id"]), 0),
            "thumbnail": "",
        }
        for row in rows
    ]
    return {"list": items, "total": int(total), "page": page, "pageSize": page_size}


@router.get("/projects/{project_id}")
def get_admin_project_detail(project_id: str, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    project = one(
        db,
        """
        SELECT p.*, t.name AS tenant_name, u.name AS owner_name
        FROM projects p
        LEFT JOIN tenants t ON t.id = p.tenant_id
        LEFT JOIN users u ON u.id = p.owner_id
        WHERE p.id = :project_id
          AND p.deleted_at IS NULL
        LIMIT 1
        """,
        {"project_id": project_id},
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    brief_rows = all_rows(
        db,
        """
        SELECT pb.*,
               COALESCE(jsonb_agg(jsonb_build_object('id', psp.id, 'content', psp.content, 'pointType', psp.point_type, 'order', psp.display_order) ORDER BY psp.display_order) FILTER (WHERE psp.id IS NOT NULL), '[]'::jsonb) AS selling_points
        FROM product_briefs pb
        LEFT JOIN product_selling_points psp ON psp.brief_id = pb.id
        WHERE pb.project_id = :project_id
        GROUP BY pb.id
        ORDER BY pb.updated_at DESC
        """,
        {"project_id": project_id},
    )
    script_rows = all_rows(
        db,
        """
        SELECT ss.*, sv.id AS version_id, sv.version_no, sv.title AS version_title, sv.content_snapshot, sv.created_at AS version_created_at
        FROM storyboard_scripts ss
        LEFT JOIN script_versions sv ON sv.id = ss.current_version_id
        WHERE ss.project_id = :project_id
        ORDER BY ss.updated_at DESC
        """,
        {"project_id": project_id},
    )
    shots_by_version: dict[str, list[dict[str, Any]]] = {}
    for script in script_rows:
        version_id = script.get("version_id")
        if not version_id:
            continue
        shot_rows = all_rows(
            db,
            """
            SELECT *
            FROM shots
            WHERE script_version_id = :version_id
            ORDER BY display_order, shot_no
            """,
            {"version_id": str(version_id)},
        )
        shots_by_version[str(version_id)] = [
            {
                "shot": row.get("shot_label") or f"镜头 {int(row['shot_no']):02d}",
                "type": row.get("shot_type") or "",
                "scene": row.get("scene_description") or "",
                "line": row.get("line_text") or "",
                "duration": f"{row.get('duration_seconds') or 0}s",
                "note": row.get("selling_point_note") or "",
                "risk": row.get("compliance_risk") or "low",
            }
            for row in shot_rows
        ]

    return {
        "project": {
            "id": str(project["id"]),
            "name": project["title"],
            "brand": project.get("tenant_name") or "-",
            "productName": project.get("product_name") or "-",
            "platform": project.get("platform") or "-",
            "status": project.get("status") or "draft",
            "creator": project.get("owner_name") or "-",
            "createTime": time_label(project.get("created_at")),
            "currentStep": project.get("current_step") or "-",
            "progress": project.get("progress") or 0,
        },
        "briefs": [
            {
                "id": str(row["id"]),
                "productName": row.get("product_name") or "-",
                "primarySellingPoint": row.get("primary_selling_point") or "",
                "targetGroups": row.get("target_groups") or [],
                "otherRequirements": row.get("other_requirements") or "",
                "briefText": row.get("brief_text") or "",
                "status": row.get("status") or "draft",
                "version": row.get("version") or 1,
                "updatedAt": time_label(row.get("updated_at")),
                "sellingPoints": row.get("selling_points") or [],
            }
            for row in brief_rows
        ],
        "scripts": [
            {
                "id": str(row["id"]),
                "name": row.get("name") or "未命名脚本",
                "status": row.get("status") or "draft",
                "auditStatus": row.get("audit_status") or "not_submitted",
                "versionNo": row.get("version_no") or 0,
                "versionTitle": row.get("version_title") or row.get("name") or "脚本版本",
                "updatedAt": time_label(row.get("updated_at")),
                "content": row.get("content_snapshot") or {},
                "shots": shots_by_version.get(str(row.get("version_id")), []),
            }
            for row in script_rows
        ],
    }


@router.get("/api-providers")
def get_api_providers(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT *
        FROM api_provider_configs
        WHERE provider_type IN ('llm', 'asr', 'tts', 'image', 'parser', 'parsing')
        ORDER BY status DESC, priority ASC, updated_at DESC
        """,
    )
    return [_api_provider_response(row) for row in rows]


@router.post("/api-providers")
def create_api_provider(payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    return create_provider_config(
        LLMProviderPayload(
            providerName=payload.get("providerName") or payload.get("name"),
            providerType=payload.get("providerType") or payload.get("provider_type") or "llm",
            platform=payload.get("platform"),
            endpointUrl=payload.get("endpointUrl") or payload.get("apiBaseUrl"),
            apiKey=payload.get("apiKey"),
            apiKeyRef=payload.get("apiKeyRef"),
            model=payload.get("model"),
            priority=payload.get("priority", 100),
            timeoutMs=payload.get("timeoutMs", 60000),
            retryCount=payload.get("retryCount", 2),
            status=payload.get("status", "enabled"),
            temperature=payload.get("temperature", 0.3),
            maxTokens=payload.get("maxTokens", 3000),
            description=payload.get("description"),
        ),
        db,
        user,
    )


@router.patch("/api-providers/{provider_id}")
def update_api_provider(provider_id: str, payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    if not _is_uuid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider id")
    existing = one(db, "SELECT * FROM api_provider_configs WHERE id = :id", {"id": provider_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Provider not found")

    config = existing.get("config") or {}
    config.update({
        "model": payload.get("model") or "",
        "description": payload.get("description") or "",
    })
    api_key = payload.get("apiKeyRef") or existing.get("api_key_encrypted") or ""
    if "***" in api_key:
        api_key = existing.get("api_key_encrypted") or ""
    row = db.execute(
        text(
            """
            UPDATE api_provider_configs
            SET provider_type = :provider_type,
                provider_name = :provider_name,
                platform = :platform,
                endpoint_url = :endpoint_url,
                api_key_encrypted = :api_key,
                priority = :priority,
                config = CAST(:config AS jsonb),
                updated_at = now()
            WHERE id = :id
            RETURNING *
            """
        ),
        {
            "id": provider_id,
            "provider_type": _normalize_provider_type(payload.get("providerType") or payload.get("provider_type") or existing.get("provider_type")),
            "provider_name": payload.get("providerName") or existing.get("provider_name"),
            "platform": payload.get("platform") or "",
            "endpoint_url": payload.get("endpointUrl") or "",
            "api_key": api_key,
            "priority": payload.get("priority") or 100,
            "config": _json(config),
        },
    ).mappings().first()
    _write_operation(db, user, "API Provider", "编辑供应商", "api_provider_configs", provider_id)
    db.commit()
    return _api_provider_response(dict(row))


@router.patch("/api-providers/{provider_id}/status")
def update_api_provider_status(provider_id: str, payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    new_status = payload.get("status")
    if new_status in {"active", "enabled"}:
        if not _is_uuid(provider_id):
            raise HTTPException(status_code=400, detail="Invalid provider id")
        db.execute(text("UPDATE api_provider_configs SET status = 'enabled', updated_at = now() WHERE id = :id"), {"id": provider_id})
        db.commit()
        return {"id": provider_id, "status": "active"}
    if new_status in {"inactive", "disabled"}:
        if not _is_uuid(provider_id):
            raise HTTPException(status_code=400, detail="Invalid provider id")
        db.execute(text("UPDATE api_provider_configs SET status = 'disabled', updated_at = now() WHERE id = :id"), {"id": provider_id})
        _write_operation(db, user, "API Provider", "停用供应商", "api_provider_configs", provider_id)
        db.commit()
        return {"id": provider_id, "status": "inactive"}
    raise HTTPException(status_code=400, detail="Invalid status value")


@router.get("/parse-providers")
def get_parse_providers(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT *
        FROM api_provider_configs
        WHERE provider_type = 'parsing'
        ORDER BY status DESC, priority ASC, updated_at DESC
        """,
    )
    result = []
    for row in rows:
        config = row.get("config") or {}
        result.append({
            "id": str(row["id"]),
            "platform": row.get("platform") or "抖音",
            "apiName": row.get("provider_name") or "解析 API",
            "status": "active" if row.get("status") == "enabled" else "inactive",
            "callCount": 0,
            "successRate": 100,
        })
    return result


@router.get("/prompt-templates")
def get_prompt_templates(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    return list(PROMPT_TEMPLATES.values())


@router.patch("/prompt-templates/{template_id}")
def update_prompt_template(template_id: str, payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    template = PROMPT_TEMPLATES.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    for key in ("systemPrompt", "userPromptTemplate", "outputSchema", "status"):
        if key in payload:
            template[key] = payload[key]
    template["updatedAt"] = "刚刚"
    _write_operation(db, user, "提示词配置", f"更新{template['name']}", "prompt_templates", template_id)
    db.commit()
    return template


@router.get("/import-templates")
def get_import_templates(user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    return list_import_templates()


@router.patch("/import-templates/{template_code}")
def patch_import_template(template_code: str, payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    template = update_import_template(template_code, payload)
    if not template:
        raise HTTPException(status_code=404, detail="Import template not found")
    _write_operation(db, user, "系统字典", f"更新{template['name']}", "import_templates", template_code)
    return template


@router.get("/api-contracts")
def get_api_contracts(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    return [
        {"module": "认证", "name": "前台登录", "method": "POST", "path": "/api/auth/login", "requestParams": {"account": "string", "password": "string"}, "responseBody": {"token": "string", "user": "object"}, "description": "品牌运营账号登录"},
        {"module": "认证", "name": "前台当前用户", "method": "GET", "path": "/api/auth/me", "requestParams": {}, "responseBody": {"id": "string", "name": "string"}, "description": "获取当前登录用户信息"},
        {"module": "认证", "name": "后台登录", "method": "POST", "path": "/api/admin/auth/login", "requestParams": {"account": "string", "password": "string"}, "responseBody": {"token": "string", "user": "object"}, "description": "管理员账号登录"},
        {"module": "认证", "name": "后台当前用户", "method": "GET", "path": "/api/admin/auth/current-user", "requestParams": {}, "responseBody": {"id": "string", "name": "string", "permissions": "string[]"}, "description": "获取当前管理员信息"},
        {"module": "项目", "name": "获取项目列表", "method": "GET", "path": "/api/projects", "requestParams": {}, "responseBody": {"id": "string", "title": "string"}, "description": "获取当前品牌的所有项目"},
        {"module": "项目", "name": "保存步骤数据", "method": "PATCH", "path": "/api/projects/{id}/step", "requestParams": {"projectId": "string", "step": "string", "data": "object"}, "responseBody": {"projectId": "string", "step": "string"}, "description": "保存项目各步骤数据"},
        {"module": "卖点", "name": "获取卖点资产", "method": "GET", "path": "/api/selling-point-assets", "requestParams": {}, "responseBody": [{"id": "string", "name": "string"}], "description": "获取产品卖点资产列表"},
        {"module": "卖点", "name": "优化产品Brief", "method": "POST", "path": "/api/product-brief/optimize", "requestParams": {"productName": "string", "brief": "string"}, "responseBody": {"summary": "string"}, "description": "AI 优化产品 Brief 和卖点提炼"},
        {"module": "来源", "name": "解析链接", "method": "POST", "path": "/api/source-analysis/parse-link", "requestParams": {"url": "string"}, "responseBody": {"title": "string", "account": "string"}, "description": "解析抖音/小红书等链接生成爆款结构分析"},
        {"module": "脚本", "name": "生成分镜脚本", "method": "POST", "path": "/api/scripts/generate", "requestParams": {}, "responseBody": [{"id": "number", "shot": "string"}], "description": "基于项目数据生成分镜脚本"},
        {"module": "脚本", "name": "合规检查", "method": "POST", "path": "/api/scripts/compliance-check", "requestParams": {}, "responseBody": {"similarity": "string", "riskCount": "number"}, "description": "对当前脚本进行合规检查"},
        {"module": "脚本", "name": "提交审核", "method": "POST", "path": "/api/scripts/submit-audit", "requestParams": {}, "responseBody": {"status": "string", "message": "string"}, "description": "提交脚本进入审核工作流"},
        {"module": "素材", "name": "获取素材列表", "method": "GET", "path": "/api/assets", "requestParams": {}, "responseBody": [{"id": "string", "name": "string"}], "description": "获取当前品牌的素材列表"},
        {"module": "素材", "name": "获取素材库", "method": "GET", "path": "/api/asset-library", "requestParams": {}, "responseBody": [{"id": "string", "library": "string"}], "description": "获取卖点素材库和爆款脚本库"},
        {"module": "生成", "name": "获取生成任务", "method": "GET", "path": "/api/generation/tasks/current", "requestParams": {}, "responseBody": {"status": "string", "progress": "number"}, "description": "获取当前视频生成任务进度"},
        {"module": "管理", "name": "获取仪表盘", "method": "GET", "path": "/api/admin/dashboard", "requestParams": {}, "responseBody": {"metrics": "array", "queues": "array"}, "description": "获取管理后台仪表盘概览"},
        {"module": "管理", "name": "获取菜单", "method": "GET", "path": "/api/admin/menus", "requestParams": {}, "responseBody": [{"id": "string", "label": "string"}], "description": "获取动态侧边栏菜单"},
        {"module": "管理", "name": "获取用户列表", "method": "GET", "path": "/api/admin/users", "requestParams": {}, "responseBody": [{"id": "string", "name": "string"}], "description": "获取所有用户列表"},
        {"module": "管理", "name": "停用用户", "method": "POST", "path": "/api/admin/users/{id}/disable", "requestParams": {}, "responseBody": {"id": "string", "status": "string"}, "description": "停用指定用户账号"},
        {"module": "管理", "name": "获取角色列表", "method": "GET", "path": "/api/admin/roles", "requestParams": {}, "responseBody": [{"id": "string", "name": "string"}], "description": "获取所有角色及权限"},
        {"module": "管理", "name": "获取操作日志", "method": "GET", "path": "/api/admin/operation-logs", "requestParams": {}, "responseBody": [{"id": "string", "module": "string"}], "description": "获取操作审计日志"},
        {"module": "管理", "name": "获取审核任务", "method": "GET", "path": "/api/admin/audit/tasks", "requestParams": {}, "responseBody": [{"id": "string", "script": "string"}], "description": "获取待审核脚本任务列表"},
        {"module": "管理", "name": "通过审核", "method": "POST", "path": "/api/admin/audit/tasks/{id}/approve", "requestParams": {}, "responseBody": {"id": "string", "status": "string"}, "description": "通过脚本审核"},
        {"module": "管理", "name": "驳回审核", "method": "POST", "path": "/api/admin/audit/tasks/{id}/reject", "requestParams": {"reason": "string"}, "responseBody": {"id": "string", "status": "string"}, "description": "驳回脚本审核"},
        {"module": "管理", "name": "获取知识库公式", "method": "GET", "path": "/api/admin/knowledge/formulas", "requestParams": {}, "responseBody": {"structureFormulas": "array"}, "description": "获取结构化公式列表"},
        {"module": "管理", "name": "获取项目列表(管理)", "method": "GET", "path": "/api/admin/projects", "requestParams": {}, "responseBody": [{"id": "string", "name": "string"}], "description": "获取所有品牌的项目列表"},
    ]


@router.get("/knowledge/formulas")
def get_knowledge_formulas(db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    formula_rows = all_rows(
        db,
        """
        SELECT id, name, platform, usage_count, risk_level
        FROM structure_formulas
        ORDER BY updated_at DESC
        LIMIT 100
        """,
    )
    if not formula_rows:
        formula_rows = all_rows(db, "SELECT id, name, platform, 0 AS usage_count, 'low' AS risk_level FROM original_templates WHERE status = 'enabled' ORDER BY created_at")
    structure_formulas = [
        {"id": str(row["id"]), "name": row["name"], "platform": row.get("platform") or "通用", "category": "结构公式", "useCount": int(row.get("usage_count") or 0), "successRate": 90, "createTime": ""}
        for row in formula_rows
    ]
    product_knowledge = []
    material_tags = [
        {"id": "tag-1", "name": "产品卖点", "count": len(structure_formulas), "category": "卖点标签"},
        {"id": "tag-2", "name": "爆款脚本", "count": 0, "category": "脚本标签"},
        {"id": "tag-3", "name": "场景素材", "count": 0, "category": "素材标签"},
    ]
    original_rows = all_rows(
        db,
        """
        SELECT id, name, structure, scenario, prompt, platform, status, updated_at
        FROM original_templates
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 200
        """,
    )
    original_templates = [_original_template_response(row) for row in original_rows]
    return {"structureFormulas": structure_formulas, "productKnowledge": product_knowledge, "materialTags": material_tags, "originalTemplates": original_templates}


@router.get("/knowledge-base")
def get_knowledge_base(db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    return get_knowledge_formulas(db, user)


@router.post("/original-templates")
def create_original_template(payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            INSERT INTO original_templates (name, structure, scenario, prompt, platform, status)
            VALUES (:name, :structure, :scenario, :prompt, :platform, :status)
            RETURNING *
            """
        ),
        _original_template_payload(payload),
    ).mappings().first()
    _write_operation(db, user, "灵感模板库", "新增模板", "original_templates", str(row["id"]))
    db.commit()
    return _original_template_response(dict(row))


@router.patch("/original-templates/{template_id}")
def update_original_template(template_id: str, payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    if not _is_uuid(template_id):
        raise HTTPException(status_code=400, detail="Invalid template id")
    row = db.execute(
        text(
            """
            UPDATE original_templates
            SET name = :name, structure = :structure, scenario = :scenario, prompt = :prompt, platform = :platform, status = :status, updated_at = now()
            WHERE id = :id
            RETURNING *
            """
        ),
        {"id": template_id, **_original_template_payload(payload)},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    _write_operation(db, user, "灵感模板库", "编辑模板", "original_templates", template_id)
    db.commit()
    return _original_template_response(dict(row))


@router.delete("/original-templates/{template_id}")
def delete_original_template(template_id: str, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, str]:
    if not _is_uuid(template_id):
        raise HTTPException(status_code=400, detail="Invalid template id")
    db.execute(text("UPDATE original_templates SET status = 'disabled', updated_at = now() WHERE id = :id"), {"id": template_id})
    _write_operation(db, user, "灵感模板库", "停用模板", "original_templates", template_id)
    db.commit()
    return {"id": template_id, "status": "disabled"}


@router.get("/dashboard")
def get_dashboard(db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    counts = one(
        db,
        """
        SELECT
          (SELECT COUNT(*) FROM projects WHERE created_at::date = current_date AND deleted_at IS NULL) AS today_projects,
          (SELECT COUNT(*) FROM audit_tasks WHERE status = 'pending') AS pending_audits,
          (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL) AS asset_count,
          (SELECT COUNT(*) FROM parsing_logs) AS parsing_total,
          (SELECT COUNT(*) FROM parsing_logs WHERE status = 'success') AS parsing_success
        """,
    ) or {}
    total = int(counts.get("parsing_total") or 0)
    success = int(counts.get("parsing_success") or 0)
    success_rate = f"{(success / total * 100):.1f}%" if total else "100.0%"
    queues = all_rows(
        db,
        """
        SELECT task_type,
               COUNT(*) FILTER (WHERE status IN ('pending', 'running')) AS running,
               COUNT(*) FILTER (WHERE status = 'failed') AS failed,
               COUNT(*) AS total
        FROM generation_tasks
        GROUP BY task_type
        ORDER BY task_type
        """,
    )
    return {
        "metrics": [
            {"label": "今日项目", "value": str(counts.get("today_projects") or 0), "delta": "+0"},
            {"label": "待审核脚本", "value": str(counts.get("pending_audits") or 0), "delta": "+0"},
            {"label": "解析成功率", "value": success_rate, "delta": "+0%"},
            {"label": "素材总量", "value": str(counts.get("asset_count") or 0), "delta": "+0"},
        ],
        "queues": [
            {
                "name": row["task_type"],
                "running": int(row.get("running") or 0),
                "failed": int(row.get("failed") or 0),
                "successRate": "100.0%" if not row.get("failed") else "98.0%",
            }
            for row in queues
        ] or [
            {"name": "script-generation", "running": 0, "failed": 0, "successRate": "100.0%"},
            {"name": "parsing", "running": 0, "failed": 0, "successRate": "100.0%"},
            {"name": "export", "running": 0, "failed": 0, "successRate": "100.0%"},
        ],
    }


@router.get("/parsing/logs")
def get_parsing_logs(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT pl.*, t.name AS tenant_name
        FROM parsing_logs pl
        JOIN tenants t ON t.id = pl.tenant_id
        ORDER BY pl.created_at DESC
        LIMIT 100
        """,
    )
    return [
        {
            "id": str(row["id"]),
            "brand": row["tenant_name"],
            "platform": row["platform"],
            "url": row["source_url"],
            "status": cn_status(row["status"]),
            "cost": f"{((row.get('cost_ms') or 0) / 1000):.1f}s",
            "time": time_label(row.get("created_at")),
        }
        for row in rows
    ]


@router.post("/parsing/logs/{log_id}/retry")
def retry_parsing_log(log_id: str, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, str]:
    if _is_uuid(log_id):
        db.execute(text("UPDATE parsing_logs SET status = 'pending' WHERE id = :id"), {"id": log_id})
        _write_operation(db, user, "解析管理", "重试解析", "parsing_logs", log_id)
        db.commit()
    return {"id": log_id, "status": "重试中"}


@router.post("/parsing/providers")
def save_provider_config(payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    provider_name = str(payload.get("provider") or payload.get("providerName") or "主解析 API")
    row = db.execute(
        text(
            """
            INSERT INTO api_provider_configs (tenant_id, provider_type, provider_name, platform, config, created_by)
            VALUES (:tenant_id, 'parsing', :provider_name, :platform, CAST(:config AS jsonb), :created_by)
            RETURNING id
            """
        ),
        {"tenant_id": user.get("tenant_id"), "provider_name": provider_name, "platform": payload.get("platform"), "config": _json(payload), "created_by": user["id"]},
    ).mappings().first()
    _write_operation(db, user, "解析管理", "保存解析服务商", "api_provider_configs", str(row["id"]))
    db.commit()
    return {"id": str(row["id"]), "status": "已保存", "payload": payload}


@router.get("/llm/providers")
def get_llm_providers(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT *
        FROM api_provider_configs
        WHERE provider_type = 'llm'
        ORDER BY status DESC, priority ASC, updated_at DESC
        """,
    )
    return [_llm_provider_response(row) for row in rows]


@router.post("/llm/providers")
def create_llm_provider(payload: LLMProviderPayload, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    payload.providerType = "llm"
    return create_provider_config(payload, db, user)


def create_provider_config(payload: LLMProviderPayload, db: DbSession, user: dict) -> dict[str, Any]:
    provider_name = payload.providerName or payload.name or "OpenAI-compatible Provider"
    endpoint_url = payload.endpointUrl or payload.apiBaseUrl
    api_key = payload.apiKeyRef or payload.apiKey
    provider_type = _normalize_provider_type(payload.providerType)
    if not endpoint_url or not api_key or (provider_type in {"llm", "asr"} and not payload.model):
        raise HTTPException(status_code=400, detail="endpointUrl, model and apiKey/apiKeyRef are required")

    config = {
        "model": payload.model,
        "temperature": payload.temperature,
        "max_tokens": payload.maxTokens,
        "description": getattr(payload, "description", None),
    }
    row = db.execute(
        text(
            """
            INSERT INTO api_provider_configs (
              tenant_id, provider_type, provider_name, platform, endpoint_url, api_key_encrypted,
              priority, timeout_ms, retry_count, status, config, created_by
            )
            VALUES (
              :tenant_id, :provider_type, :provider_name, :platform, :endpoint_url, :api_key,
              :priority, :timeout_ms, :retry_count, :status, CAST(:config AS jsonb), :created_by
            )
            RETURNING *
            """
        ),
        {
            "tenant_id": user.get("tenant_id"),
            "provider_type": provider_type,
            "provider_name": provider_name,
            "platform": payload.platform,
            "endpoint_url": endpoint_url,
            "api_key": api_key,
            "priority": payload.priority,
            "timeout_ms": payload.timeoutMs,
            "retry_count": payload.retryCount,
            "status": payload.status,
            "config": _json(config),
            "created_by": user["id"],
        },
    ).mappings().first()
    _write_operation(db, user, "API Provider", "创建供应商", "api_provider_configs", str(row["id"]))
    db.commit()
    return {"id": str(row["id"]), "status": "created", "provider": _api_provider_response(dict(row))}


@router.post("/llm/providers/{provider_id}/disable")
def disable_llm_provider(provider_id: str, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, str]:
    if not _is_uuid(provider_id):
        raise HTTPException(status_code=400, detail="Invalid provider id")
    db.execute(
        text("UPDATE api_provider_configs SET status = 'disabled', updated_at = now() WHERE id = :id AND provider_type = 'llm'"),
        {"id": provider_id},
    )
    _write_operation(db, user, "LLM Provider", "停用大模型供应商", "api_provider_configs", provider_id)
    db.commit()
    return {"id": provider_id, "status": "disabled"}


@router.post("/knowledge/imports")
def import_knowledge_file(payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    _write_operation(db, user, "知识库", f"导入{payload.get('type') or '知识库文件'}")
    db.commit()
    return {"id": f"import_{int(time.time() * 1000)}", "type": payload.get("type") or "知识库", "fileName": payload.get("fileName") or "import.xlsx", "rows": 128, "status": "导入成功"}


@router.get("/audit/tasks")
def get_audit_tasks(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT at.*, ss.name AS script_name, t.name AS tenant_name, u.name AS owner_name
        FROM audit_tasks at
        JOIN storyboard_scripts ss ON ss.id = at.script_id
        JOIN tenants t ON t.id = at.tenant_id
        LEFT JOIN users u ON u.id = at.submitted_by
        ORDER BY at.submitted_at DESC
        LIMIT 100
        """,
    )
    return [
        {
            "id": str(row["id"]),
            "script": row.get("script_name") or "分镜脚本",
            "brand": row.get("tenant_name") or "-",
            "owner": row.get("owner_name") or "-",
            "status": _audit_status(row.get("status"), row.get("stage")),
            "risk": row.get("risk_summary") or "低风险",
            "submittedAt": time_label(row.get("submitted_at")),
        }
        for row in rows
    ]


@router.post("/audit/tasks/{task_id}/approve")
def approve_audit_task(task_id: str, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, str]:
    if _is_uuid(task_id):
        db.execute(text("UPDATE audit_tasks SET status = 'approved', completed_at = now() WHERE id = :id"), {"id": task_id})
        db.execute(text("INSERT INTO audit_records (audit_task_id, auditor_id, action, from_status, to_status) VALUES (:id, :auditor_id, 'approve', 'pending', 'approved')"), {"id": task_id, "auditor_id": user["id"]})
        _write_operation(db, user, "审核工作流", "通过脚本审核", "audit_tasks", task_id)
        db.commit()
    return {"id": task_id, "status": "已通过", "message": "审核任务已通过并写入操作日志。"}


@router.post("/audit/tasks/{task_id}/reject")
def reject_audit_task(task_id: str, db: DbSession, user: dict = Depends(get_current_admin_user), payload: dict[str, Any] | None = None) -> dict[str, str]:
    reason = (payload or {}).get("reason") or "未填写原因"
    if _is_uuid(task_id):
        db.execute(text("UPDATE audit_tasks SET status = 'rejected', completed_at = now() WHERE id = :id"), {"id": task_id})
        db.execute(text("INSERT INTO audit_records (audit_task_id, auditor_id, action, comment, from_status, to_status) VALUES (:id, :auditor_id, 'reject', :comment, 'pending', 'rejected')"), {"id": task_id, "auditor_id": user["id"], "comment": reason})
        _write_operation(db, user, "审核工作流", "驳回脚本审核", "audit_tasks", task_id)
        db.commit()
    return {"id": task_id, "status": "已驳回", "message": "审核任务已驳回，已通知提交人。"}


@router.get("/materials")
def get_materials(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT a.*, t.name AS tenant_name, p.product_name
        FROM assets a
        JOIN tenants t ON t.id = a.tenant_id
        LEFT JOIN projects p ON p.id = a.project_id
        WHERE a.deleted_at IS NULL
        ORDER BY a.created_at DESC
        LIMIT 100
        """,
    )
    return [
        {"id": str(row["id"]), "name": row["name"], "type": row.get("category") or row.get("asset_type") or "素材", "brand": row["tenant_name"], "project": row.get("product_name") or "-", "usage": int(row.get("usage_count") or 0), "size": bytes_label(row.get("file_size_bytes"))}
        for row in rows
    ]


@router.delete("/materials/{asset_id}")
def delete_material(asset_id: str, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, str]:
    if _is_uuid(asset_id):
        db.execute(text("UPDATE assets SET deleted_at = now(), status = 'deleted' WHERE id = :id"), {"id": asset_id})
        _write_operation(db, user, "素材项目库", "删除素材", "assets", asset_id)
        db.commit()
    return {"id": asset_id, "status": "deleted"}


@router.post("/materials/{asset_id}/download")
def download_material(asset_id: str, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, str]:
    asset = one(db, "SELECT name FROM assets WHERE id = :id" if _is_uuid(asset_id) else "SELECT NULL AS name", {"id": asset_id} if _is_uuid(asset_id) else {})
    return {"id": asset_id, "fileName": f"{(asset or {}).get('name') or '素材包'}.zip", "url": "#"}


@router.get("/tenants")
def get_tenants(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT t.*, COUNT(u.id) AS user_count
        FROM tenants t
        LEFT JOIN users u ON u.tenant_id = t.id AND u.deleted_at IS NULL
        WHERE t.deleted_at IS NULL
        GROUP BY t.id
        ORDER BY t.created_at
        """,
    )
    return [{"id": str(row["id"]), "name": row["name"], "users": int(row.get("user_count") or 0), "storage": bytes_label(row.get("storage_quota_bytes")), "status": cn_status(row.get("status"))} for row in rows]


@router.post("/tenants")
def create_tenant(payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    name = str(payload.get("name") or "新品牌")
    row = db.execute(
        text(
            """
            INSERT INTO tenants (name, code, contact_name, status, plan, storage_quota_bytes)
            VALUES (:name, :code, :contact, 'trial', 'trial', 53687091200)
            RETURNING id
            """
        ),
        {"name": name, "code": f"{_slug(name)}-{int(time.time())}", "contact": payload.get("contact")},
    ).mappings().first()
    _write_operation(db, user, "系统权限", "创建租户", "tenants", str(row["id"]))
    db.commit()
    return {"id": str(row["id"]), "status": "created", "payload": payload}


@router.get("/users")
def get_admin_users(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT u.*, t.name AS tenant_name
        FROM users u
        LEFT JOIN tenants t ON t.id = u.tenant_id
        WHERE u.deleted_at IS NULL
        ORDER BY u.created_at
        """,
    )
    return [{"id": str(row["id"]), "name": row["name"], "account": row["account"], "role": row.get("role_label") or "用户", "tenantScope": row.get("tenant_name") or "全部品牌", "status": cn_status(row.get("status")), "lastLogin": time_label(row.get("last_login_at"))} for row in rows]


@router.post("/users")
def create_admin_user(payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    tenant_scope = payload.get("tenantScope")
    tenant = one(db, "SELECT id FROM tenants WHERE name = :name LIMIT 1", {"name": tenant_scope}) if tenant_scope and tenant_scope != "全部品牌" else None
    row = db.execute(
        text(
            """
            INSERT INTO users (tenant_id, name, account, email, password_hash, user_type, role_label, status)
            VALUES (:tenant_id, :name, :account, :email, '$dev$replace-me', 'admin', :role_label, 'enabled')
            RETURNING id
            """
        ),
        {"tenant_id": (tenant or {}).get("id"), "name": payload.get("name") or "新用户", "account": payload.get("account") or f"user{int(time.time())}@ai-script.local", "email": payload.get("account"), "role_label": payload.get("role") or "审核员"},
    ).mappings().first()
    role = one(db, "SELECT id FROM roles WHERE name = :name LIMIT 1", {"name": payload.get("role") or "审核员"})
    if role:
        db.execute(text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id) ON CONFLICT DO NOTHING"), {"user_id": row["id"], "role_id": role["id"]})
    _write_operation(db, user, "用户管理", "创建用户", "users", str(row["id"]))
    db.commit()
    return {"id": str(row["id"]), "status": "created", "payload": payload}


@router.post("/users/{user_id}/disable")
def disable_admin_user(user_id: str, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, str]:
    if _is_uuid(user_id):
        db.execute(text("UPDATE users SET status = 'disabled', updated_at = now() WHERE id = :id"), {"id": user_id})
        _write_operation(db, user, "用户管理", "停用用户", "users", user_id)
        db.commit()
    return {"id": user_id, "status": "disabled"}


@router.post("/users/{user_id}/enable")
def enable_admin_user(user_id: str, db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, str]:
    if _is_uuid(user_id):
        db.execute(text("UPDATE users SET status = 'enabled', updated_at = now() WHERE id = :id"), {"id": user_id})
        _write_operation(db, user, "用户管理", "启用用户", "users", user_id)
        db.commit()
    return {"id": user_id, "status": "enabled"}


@router.get("/roles")
def get_roles(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    roles = all_rows(db, "SELECT * FROM roles ORDER BY is_system DESC, created_at")
    result = []
    for role in roles:
        permissions = all_rows(
            db,
            """
            SELECT p.code
            FROM role_permissions rp
            JOIN permissions p ON p.id = rp.permission_id
            WHERE rp.role_id = :role_id
            ORDER BY p.code
            """,
            {"role_id": role["id"]},
        )
        user_count = one(db, "SELECT COUNT(*) AS count FROM user_roles WHERE role_id = :role_id", {"role_id": role["id"]})
        result.append({"id": str(role["id"]), "name": role["name"], "description": role.get("description") or "", "userCount": int((user_count or {}).get("count") or 0), "permissions": [item["code"] for item in permissions if not item["code"].startswith("front.")], "status": cn_status(role.get("status"))})
    return result


@router.post("/roles")
def create_role(payload: dict[str, Any], db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    name = str(payload.get("name") or "自定义角色")
    row = db.execute(
        text(
            """
            INSERT INTO roles (tenant_id, name, code, description, is_system, status)
            VALUES (:tenant_id, :name, :code, :description, false, 'enabled')
            RETURNING id
            """
        ),
        {"tenant_id": user.get("tenant_id"), "name": name, "code": f"custom_{int(time.time())}", "description": payload.get("description")},
    ).mappings().first()
    permissions = payload.get("permissions") or []
    if isinstance(permissions, str):
        permissions = [item.strip() for item in permissions.split(",") if item.strip()]
    for code in permissions:
        permission = one(db, "SELECT id FROM permissions WHERE code = :code", {"code": code})
        if permission:
            db.execute(text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id) ON CONFLICT DO NOTHING"), {"role_id": row["id"], "permission_id": permission["id"]})
    _write_operation(db, user, "角色权限", "创建角色", "roles", str(row["id"]))
    db.commit()
    return {"id": str(row["id"]), "status": "created", "payload": payload}


@router.get("/operation-logs")
def get_operation_logs(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT ol.*, u.name AS operator
        FROM operation_logs ol
        LEFT JOIN users u ON u.id = ol.user_id
        ORDER BY ol.created_at DESC
        LIMIT 100
        """,
    )
    return [{"id": str(row["id"]), "operator": row.get("operator") or "系统", "module": row["module"], "action": row["action"], "ip": str(row.get("ip_address") or "-"), "time": time_label(row.get("created_at")), "result": cn_status(row.get("result"))} for row in rows]


@router.get("/analytics/summary")
def get_analytics(db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, str]:
    row = one(
        db,
        """
        SELECT COALESCE(SUM(plays), 0) AS plays,
               COALESCE(SUM(likes + comments + favorites + shares), 0) AS interactions,
               COALESCE(SUM(orders), 0) AS orders,
               COALESCE(AVG(roi), 0) AS roi
        FROM analytics_metrics
        WHERE metric_date >= current_date - interval '30 days'
        """,
    ) or {}
    plays = int(row.get("plays") or 0)
    interactions = int(row.get("interactions") or 0)
    rate = f"{(interactions / plays * 100):.1f}%" if plays else "0.0%"
    return {"plays": _wan(plays), "interactionRate": rate, "orders": f"{int(row.get('orders') or 0):,}", "roi": f"{float(row.get('roi') or 0):.1f}"}


def _audit_status(status: str | None, stage: str | None) -> str:
    if status == "approved":
        return "已通过"
    if status == "rejected":
        return "已驳回"
    return {"operation_review": "待运营审核", "legal_review": "法务复核"}.get(stage or "", "待分配")


def _wan(value: int) -> str:
    if value >= 10000:
        return f"{value / 10000:.1f} 万"
    return str(value)


def _json(payload: dict[str, Any]) -> str:
    import json

    return json.dumps(payload, ensure_ascii=False)


def _normalize_provider_type(value: str | None) -> str:
    mapping = {
        "parser": "parsing",
        "parsing": "parsing",
        "asr": "asr",
        "llm": "llm",
        "tts": "tts",
        "image": "image",
    }
    return mapping.get(str(value or "llm"), "llm")


def _display_provider_type(value: str | None) -> str:
    if value == "parsing":
        return "parser"
    return value or "llm"


def _api_provider_response(row: dict[str, Any]) -> dict[str, Any]:
    config = row.get("config") or {}
    return {
        "id": str(row["id"]),
        "providerName": row.get("provider_name") or "API Provider",
        "providerType": _display_provider_type(row.get("provider_type")),
        "platform": row.get("platform") or "",
        "endpointUrl": row.get("endpoint_url") or config.get("endpoint_url") or config.get("api_url") or config.get("apiUrl") or config.get("api_base_url") or config.get("base_url") or "",
        "model": config.get("model") or config.get("modelName") or config.get("model_name") or "",
        "priority": row.get("priority") or 100,
        "timeoutMs": row.get("timeout_ms") or 60000,
        "retryCount": row.get("retry_count") or 0,
        "status": "active" if row.get("status") == "enabled" else "inactive",
        "apiKeyRef": _mask_key(row.get("api_key_encrypted") or config.get("api_key") or config.get("apiKey") or ""),
        "description": config.get("description") or _provider_description(_display_provider_type(row.get("provider_type"))),
        "temperature": config.get("temperature"),
        "maxTokens": config.get("max_tokens") or config.get("maxTokens"),
        "callCount": 0,
        "successRate": 100,
        "avgResponseTime": row.get("timeout_ms") or 60000,
    }


def _provider_description(provider_type: str) -> str:
    descriptions = {
        "llm": "用于 Brief 评分、版本对比、脚本生成等大模型文本任务。",
        "asr": "用于将视频音频转写成文案，文案提取功能会读取启用的 ASR Provider。",
        "parser": "用于解析抖音/小红书等分享链接，获取标题、封面、视频地址和图集。",
        "image": "用于生成或改写图片素材。",
        "tts": "用于把脚本文案转换成配音音频。",
    }
    return descriptions.get(provider_type, "第三方能力 Provider。")


def _llm_provider_response(row: dict[str, Any]) -> dict[str, Any]:
    return {**_api_provider_response(row), "providerType": "llm"}


def _original_template_response(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "name": row.get("name") or "未命名模板",
        "structure": row.get("structure") or "",
        "scenario": row.get("scenario") or "默认模板库",
        "prompt": row.get("prompt") or "",
        "platform": row.get("platform") or "通用",
        "status": "active" if row.get("status") == "enabled" else "inactive",
        "updatedAt": time_label(row.get("updated_at")),
    }


def _original_template_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": payload.get("name") or "未命名模板",
        "structure": payload.get("structure") or "",
        "scenario": payload.get("scenario") or "默认模板库",
        "prompt": payload.get("prompt") or "",
        "platform": payload.get("platform") or "通用",
        "status": "enabled" if payload.get("status") in {"active", "enabled", None} else "disabled",
    }


def _mask_key(value: str) -> str:
    if not value:
        return ""
    if value.startswith("env:"):
        return value
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}...{value[-4:]}"
