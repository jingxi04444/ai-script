from typing import Any
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text

from app.api.deps import DbSession, get_current_front_user
from app.common.formatting import time_label
from app.common.sql import all_rows, one


router = APIRouter(tags=["project-workflow"])


STEP_PROGRESS = {
    "global": 11,
    "selling-points": 22,
    "source": 33,
    "viral-analysis": 33,
    "storyboard": 44,
    "visual": 55,
    "scene-role": 55,
    "video": 66,
    "video-gen": 66,
    "dubbing": 77,
    "preview": 88,
    "analytics": 100,
}


class ProjectPatch(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str | None = None
    product: str | None = None


class SaveStepPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    projectId: str
    step: str
    data: Any | None = None


class UploadFilePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    fileName: str


def project_response(row: dict) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "product": row.get("product_name") or "待填写产品",
        "status": row["status"],
        "currentStep": row["current_step"],
        "platform": row.get("platform") or "抖音",
        "updatedAt": time_label(row.get("updated_at")),
        "progress": row.get("progress") or 0,
    }


def _project_scope_sql(extra: str = "") -> str:
    return f"""
        SELECT *
        FROM projects
        WHERE deleted_at IS NULL
          AND tenant_id = :tenant_id
          {extra}
    """


@router.get("/projects")
def get_projects(db: DbSession, user: dict = Depends(get_current_front_user)) -> list[dict[str, Any]]:
    rows = all_rows(
        db,
        _project_scope_sql("ORDER BY updated_at DESC"),
        {"tenant_id": user["tenant_id"]},
    )
    return [project_response(row) for row in rows]


@router.post("/projects")
def create_project(db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            INSERT INTO projects (tenant_id, owner_id, title, product_name, platform, status, current_step, progress)
            VALUES (:tenant_id, :owner_id, '新建短视频脚本项目', '待填写产品', '抖音', 'draft', 'global', 0)
            RETURNING *
            """
        ),
        {"tenant_id": user["tenant_id"], "owner_id": user["id"]},
    ).mappings().first()
    db.commit()
    return project_response(dict(row))


@router.get("/projects/{project_id}")
def get_project(project_id: str, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    row = one(
        db,
        _project_scope_sql("AND id = :project_id LIMIT 1"),
        {"tenant_id": user["tenant_id"], "project_id": project_id},
    )
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_response(row)


@router.patch("/projects/{project_id}")
def update_project(project_id: str, payload: ProjectPatch, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    existing = get_project(project_id, db, user)
    row = db.execute(
        text(
            """
            UPDATE projects
            SET title = COALESCE(:title, title),
                product_name = COALESCE(:product_name, product_name),
                updated_at = now()
            WHERE id = :project_id
              AND tenant_id = :tenant_id
            RETURNING *
            """
        ),
        {
            "project_id": existing["id"],
            "tenant_id": user["tenant_id"],
            "title": payload.title,
            "product_name": payload.product,
        },
    ).mappings().first()
    db.commit()
    return project_response(dict(row))


@router.patch("/projects/{project_id}/step")
def save_step(project_id: str, payload: SaveStepPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    if project_id != payload.projectId:
        raise HTTPException(status_code=400, detail="Project id mismatch")
    get_project(project_id, db, user)
    progress = STEP_PROGRESS.get(payload.step, 0)
    db.execute(
        text(
            """
            INSERT INTO project_step_states (project_id, step_key, status, data, completed_at, updated_at)
            VALUES (:project_id, :step, 'completed', CAST(:data AS jsonb), now(), now())
            ON CONFLICT (project_id, step_key) DO UPDATE SET
              status = EXCLUDED.status,
              data = EXCLUDED.data,
              completed_at = EXCLUDED.completed_at,
              updated_at = now()
            """
        ),
        {"project_id": project_id, "step": payload.step, "data": json.dumps(payload.data if payload.data is not None else {})},
    )
    db.execute(
        text(
            """
            UPDATE projects
            SET current_step = :step,
                progress = GREATEST(progress, :progress),
                updated_at = now()
            WHERE id = :project_id
              AND tenant_id = :tenant_id
            """
        ),
        {"project_id": project_id, "tenant_id": user["tenant_id"], "step": payload.step, "progress": progress},
    )
    db.commit()
    return {"projectId": project_id, "step": payload.step, "savedAt": "刚刚", "data": payload.data}


@router.get("/projects/{project_id}/steps/{step}")
def get_step(project_id: str, step: str, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    get_project(project_id, db, user)
    row = one(
        db,
        """
        SELECT status, data, updated_at
        FROM project_step_states
        WHERE project_id = :project_id
          AND step_key = :step
        LIMIT 1
        """,
        {"project_id": project_id, "step": step},
    )
    if not row:
        return {"projectId": project_id, "step": step, "status": "empty", "data": None, "savedAt": ""}
    return {
        "projectId": project_id,
        "step": step,
        "status": row["status"],
        "data": row.get("data"),
        "savedAt": time_label(row.get("updated_at")),
    }


@router.post("/files")
def upload_file(payload: UploadFilePayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    row = db.execute(
        text(
            """
            INSERT INTO project_uploads (tenant_id, uploaded_by, upload_type, file_name, storage_key, status)
            VALUES (:tenant_id, :uploaded_by, :upload_type, :file_name, :storage_key, 'uploaded')
            RETURNING *
            """
        ),
        {
            "tenant_id": user["tenant_id"],
            "uploaded_by": user["id"],
            "upload_type": payload.type,
            "file_name": payload.fileName,
            "storage_key": f"uploads/{user['tenant_id']}/{payload.type}/{payload.fileName}",
        },
    ).mappings().first()
    if payload.type == "selling-point-script-asset":
        db.execute(
            text(
                """
                INSERT INTO selling_point_assets (id, tenant_id, name, source_type, tag, main_point, target_groups, usage_count, status, created_by)
                VALUES (:id, :tenant_id, :name, 'upload', '产品卖点脚本', :main_point, '[]'::jsonb, 0, 'enabled', :created_by)
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {"id": row["id"], "tenant_id": user["tenant_id"], "name": payload.fileName, "main_point": payload.fileName, "created_by": user["id"]},
        )
    if payload.type == "viral-link-script-asset":
        db.execute(
            text(
                """
                INSERT INTO viral_script_assets (id, tenant_id, name, source_type, asset_kind, tags, usage_count, status, created_by)
                VALUES (:id, :tenant_id, :name, 'upload', 'script', '[]'::jsonb, 0, 'enabled', :created_by)
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {"id": row["id"], "tenant_id": user["tenant_id"], "name": payload.fileName, "created_by": user["id"]},
        )
    db.commit()
    return {
        "id": str(row["id"]),
        "type": row["upload_type"],
        "fileName": row["file_name"],
        "status": row["status"],
        "uploadedAt": "刚刚",
    }
