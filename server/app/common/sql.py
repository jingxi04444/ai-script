from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def one(db: Session, sql: str, params: dict[str, Any] | None = None) -> dict | None:
    row = db.execute(text(sql), params or {}).mappings().first()
    return dict(row) if row else None


def all_rows(db: Session, sql: str, params: dict[str, Any] | None = None) -> list[dict]:
    return [dict(row) for row in db.execute(text(sql), params or {}).mappings().all()]
