from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text

from app.api.deps import DbSession, get_current_admin_user, get_current_front_user, get_permissions_for_user
from app.common.sql import one
from app.core.config import get_settings
from app.core.security import make_token, verify_password


router = APIRouter(tags=["auth"])


class AuthPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    account: str | None = None
    password: str | None = None
    name: str | None = None


def front_user_response(user: dict) -> dict[str, Any]:
    return {
        "id": str(user["id"]),
        "name": user["name"],
        "tenantName": user.get("tenant_name") or "默认品牌",
        "role": user.get("role_label") or "品牌运营",
        "points": user.get("points_balance") or 0,
    }


def admin_user_response(db, user: dict) -> dict[str, Any]:
    permissions = [code for code in get_permissions_for_user(db, str(user["id"])) if not code.startswith("front.")]
    return {
        "id": str(user["id"]),
        "name": user["name"],
        "role": user.get("role_label") or "管理员",
        "tenantScope": user.get("tenant_name") or "全部品牌",
        "permissions": permissions,
    }


def _find_login_user(db, account: str, user_type: str) -> dict | None:
    return one(
        db,
        """
        SELECT u.*, t.name AS tenant_name
        FROM users u
        LEFT JOIN tenants t ON t.id = u.tenant_id
        WHERE u.account = :account
          AND u.user_type = :user_type
          AND u.deleted_at IS NULL
        LIMIT 1
        """,
        {"account": account, "user_type": user_type},
    )


@router.post("/auth/login")
def front_login(payload: AuthPayload, db: DbSession) -> dict[str, Any]:
    settings = get_settings()
    account = payload.account or settings.default_front_account
    user = _find_login_user(db, account, "front")
    if not user or user["status"] != "enabled" or not verify_password(payload.password, user.get("password_hash")):
        raise HTTPException(status_code=401, detail="Invalid account or password")
    return {"token": make_token("front", str(user["id"])), "user": front_user_response(user)}


@router.post("/auth/register")
def front_register(payload: AuthPayload, db: DbSession) -> dict[str, Any]:
    if not payload.account or not payload.password:
        raise HTTPException(status_code=400, detail="account and password are required")

    existing = _find_login_user(db, payload.account, "front")
    if existing:
        return {"token": make_token("front", str(existing["id"])), "user": front_user_response(existing)}

    tenant = one(db, "SELECT id, name FROM tenants WHERE status IN ('enabled', 'trial') ORDER BY created_at LIMIT 1")
    if not tenant:
        raise HTTPException(status_code=500, detail="No tenant available")

    user = db.execute(
        text(
            """
            INSERT INTO users (tenant_id, name, account, email, password_hash, user_type, role_label, points_balance, status)
            VALUES (:tenant_id, :name, :account, :email, :password_hash, 'front', '品牌运营', 1280, 'enabled')
            RETURNING *, (SELECT name FROM tenants WHERE id = :tenant_id) AS tenant_name
            """
        ),
        {
            "tenant_id": tenant["id"],
            "name": payload.name or payload.account.split("@")[0],
            "account": payload.account,
            "email": payload.account,
            "password_hash": "$dev$replace-me",
        },
    ).mappings().first()
    db.commit()
    user_dict = dict(user)
    return {"token": make_token("front", str(user_dict["id"])), "user": front_user_response(user_dict)}


@router.get("/auth/me")
def front_me(user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    return front_user_response(user)


@router.post("/admin/auth/login")
def admin_login(payload: AuthPayload, db: DbSession) -> dict[str, Any]:
    settings = get_settings()
    account = payload.account or settings.default_admin_account
    user = _find_login_user(db, account, "admin")
    if not user or user["status"] != "enabled" or not verify_password(payload.password, user.get("password_hash")):
        raise HTTPException(status_code=401, detail="Invalid account or password")
    return {"token": make_token("admin", str(user["id"])), "user": admin_user_response(db, user)}


@router.get("/admin/auth/current-user")
def admin_me(db: DbSession, user: dict = Depends(get_current_admin_user)) -> dict[str, Any]:
    return admin_user_response(db, user)
