from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import parse_token


DbSession = Annotated[Session, Depends(get_db)]


def _user_by_account(db: Session, account: str, user_type: str) -> dict:
    row = db.execute(
        text(
            """
            SELECT u.*, t.name AS tenant_name
            FROM users u
            LEFT JOIN tenants t ON t.id = u.tenant_id
            WHERE u.account = :account
              AND u.user_type = :user_type
              AND u.deleted_at IS NULL
            LIMIT 1
            """
        ),
        {"account": account, "user_type": user_type},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    return dict(row)


def _user_by_id(db: Session, user_id: str, user_type: str) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT u.*, t.name AS tenant_name
            FROM users u
            LEFT JOIN tenants t ON t.id = u.tenant_id
            WHERE u.id = :user_id
              AND u.user_type = :user_type
              AND u.deleted_at IS NULL
            LIMIT 1
            """
        ),
        {"user_id": user_id, "user_type": user_type},
    ).mappings().first()
    return dict(row) if row else None


def _current_user(db: Session, authorization: str | None, scope: str, default_account: str) -> dict:
    token = parse_token(authorization)
    if token and token[0] == scope:
        user = _user_by_id(db, token[1], "admin" if scope == "admin" else "front")
        if user:
            return user

    return _user_by_account(db, default_account, "admin" if scope == "admin" else "front")


def get_current_front_user(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    settings = get_settings()
    return _current_user(db, authorization, "front", settings.default_front_account)


def get_current_admin_user(
    db: DbSession,
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    settings = get_settings()
    return _current_user(db, authorization, "admin", settings.default_admin_account)


def get_permissions_for_user(db: Session, user_id: str) -> list[str]:
    rows = db.execute(
        text(
            """
            SELECT DISTINCT p.code
            FROM user_roles ur
            JOIN role_permissions rp ON rp.role_id = ur.role_id
            JOIN permissions p ON p.id = rp.permission_id
            WHERE ur.user_id = :user_id
            ORDER BY p.code
            """
        ),
        {"user_id": user_id},
    ).mappings().all()
    return [row["code"] for row in rows]
