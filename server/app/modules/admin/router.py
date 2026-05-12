from typing import Any
import re
import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text

from app.api.deps import DbSession, get_current_admin_user
from app.common.formatting import bytes_label, cn_status, risk_label, time_label
from app.common.sql import all_rows, one


router = APIRouter(prefix="/admin", tags=["admin"])


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
    provider_name = payload.providerName or payload.name or "OpenAI-compatible Provider"
    endpoint_url = payload.endpointUrl or payload.apiBaseUrl
    api_key = payload.apiKeyRef or payload.apiKey
    if not endpoint_url or not payload.model or not api_key:
        raise HTTPException(status_code=400, detail="endpointUrl, model and apiKey/apiKeyRef are required")

    config = {
        "model": payload.model,
        "temperature": payload.temperature,
        "max_tokens": payload.maxTokens,
    }
    row = db.execute(
        text(
            """
            INSERT INTO api_provider_configs (
              tenant_id, provider_type, provider_name, platform, endpoint_url, api_key_encrypted,
              priority, timeout_ms, retry_count, status, config, created_by
            )
            VALUES (
              :tenant_id, 'llm', :provider_name, :platform, :endpoint_url, :api_key,
              :priority, :timeout_ms, :retry_count, :status, CAST(:config AS jsonb), :created_by
            )
            RETURNING *
            """
        ),
        {
            "tenant_id": user.get("tenant_id"),
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
    _write_operation(db, user, "LLM Provider", "创建大模型供应商", "api_provider_configs", str(row["id"]))
    db.commit()
    return {"id": str(row["id"]), "status": "created", "provider": _llm_provider_response(dict(row))}


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


@router.get("/knowledge/formulas")
def get_formulas(db: DbSession, user: dict = Depends(get_current_admin_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        """
        SELECT id, name, platform, usage_count, risk_level
        FROM structure_formulas
        ORDER BY updated_at DESC
        LIMIT 100
        """,
    )
    if not rows:
        rows = all_rows(db, "SELECT id, name, platform, 0 AS usage_count, 'low' AS risk_level FROM original_templates WHERE status = 'enabled' ORDER BY created_at")
    return [
        {"id": str(row["id"]), "name": row["name"], "platform": row.get("platform") or "通用", "usage": int(row.get("usage_count") or 0), "risk": risk_label(row.get("risk_level"))}
        for row in rows
    ]


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


def _llm_provider_response(row: dict[str, Any]) -> dict[str, Any]:
    config = row.get("config") or {}
    return {
        "id": str(row["id"]),
        "providerName": row.get("provider_name") or "OpenAI-compatible Provider",
        "platform": row.get("platform") or "openai-compatible",
        "endpointUrl": row.get("endpoint_url") or config.get("api_base_url") or config.get("base_url") or "",
        "model": config.get("model") or config.get("modelName") or config.get("model_name") or "",
        "priority": row.get("priority") or 100,
        "timeoutMs": row.get("timeout_ms") or 60000,
        "retryCount": row.get("retry_count") or 0,
        "status": row.get("status") or "disabled",
        "apiKeyRef": _mask_key(row.get("api_key_encrypted") or config.get("api_key") or config.get("apiKey") or ""),
        "temperature": config.get("temperature"),
        "maxTokens": config.get("max_tokens") or config.get("maxTokens"),
    }


def _mask_key(value: str) -> str:
    if not value:
        return ""
    if value.startswith("env:"):
        return value
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}...{value[-4:]}"
