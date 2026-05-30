from typing import Any
import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text

from app.api.deps import DbSession, get_current_front_user
from app.common.formatting import time_label
from app.common.import_parser import map_import_record, parse_import_file
from app.common.oss_service import OssBucket, oss_delete_file, oss_upload_file
from app.common.sql import all_rows, one


router = APIRouter(tags=["project-workflow"])


STEP_PROGRESS = {
    "selling-points": 14,
    "script-generator": 28,
    "storyboard": 42,
    "visual": 57,
    "video": 71,
    "dubbing": 85,
    "preview": 100,
}


class ProjectPatch(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str | None = None
    product: str | None = None
    announcement: str | None = None
    avatarUrl: str | None = None


class CreateProjectPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str | None = None
    announcement: str | None = None
    avatarUrl: str | None = None


class SaveStepPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    projectId: str
    step: str
    data: Any | None = None


class UploadFilePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    fileName: str


# --- Brief Store API Models ---
class CreateBriefPayload(BaseModel):
    name: str


class CreateBriefVersionPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    label: str
    seed: str = "copy"


class SetActiveBriefPayload(BaseModel):
    briefId: str


class SetActiveVersionPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    briefId: str
    versionId: str


class SaveBriefVersionPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    data: dict[str, Any] = {}
    score: int = 0


def _next_version_label(versions: list[dict]) -> str:
    if not versions:
        return "v1.0"
    latest = versions[0].get("label") or "v1.0"
    try:
        number = float(str(latest).lstrip("vV"))
    except ValueError:
        number = float(len(versions))
    return f"v{number + 0.1:.1f}"


def _brief_data_from_import(mapped: dict[str, str], label: str) -> dict[str, Any]:
    auxiliary_points = [item.strip() for item in re_split_points(mapped.get("auxiliarySellingPoint", "")) if item.strip()]
    target_groups = [item.strip() for item in re_split_points(mapped.get("targetGroups", "")) if item.strip()]
    selling_points = [mapped.get("primarySellingPoint", ""), *auxiliary_points, mapped.get("specialSellingPoint", "")]
    selling_points = [item for item in selling_points if item]
    return {
        "productName": mapped.get("productModel") or mapped.get("productName") or "",
        "brief": mapped.get("specialSellingPoint") or mapped.get("primarySellingPoint") or "",
        "sellingPoints": selling_points[:5],
        "primarySellingPoint": mapped.get("primarySellingPoint") or "",
        "auxiliarySellingPoints": auxiliary_points,
        "targetGroups": target_groups,
        "otherRequirements": mapped.get("otherRequirements") or "",
        "productVersion": label,
        "productPrice": mapped.get("productPrice") or "",
        "productSlogan": mapped.get("productSlogan") or "",
        "specialSellingPoint": mapped.get("specialSellingPoint") or "",
        "mainSellingPoint": mapped.get("primarySellingPoint") or "",
        "auxiliarySellingPoint": mapped.get("auxiliarySellingPoint") or "",
        "suitableCrowd": mapped.get("targetGroups") or "",
        "suitableScene": mapped.get("suitableScene") or "",
        "briefScore": 0,
    }


def re_split_points(value: str) -> list[str]:
    import re
    return re.split(r"[、,，;；]", value or "")


# --- Helpers ---
def _brief_version_response(row: dict) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "label": row["label"],
        "createdAt": time_label(row["created_at"]),
        "updatedAt": time_label(row["updated_at"]),
        "data": row.get("data") or {},
        "score": row.get("score") or 0,
    }


def _brief_item_response(row: dict, versions: list[dict]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "createdAt": time_label(row["created_at"]),
        "updatedAt": time_label(row["updated_at"]),
        "activeVersionId": str(row["active_version_id"]) if row.get("active_version_id") else "",
        "versions": versions,
    }


# --- Brief Store Endpoints ---
@router.get("/projects/{project_id}/brief-store")
def get_brief_store(project_id: str, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    get_project(project_id, db, user)
    brief_rows = all_rows(
        db,
        """
        SELECT pb.*
        FROM project_briefs pb
        WHERE pb.project_id = :project_id
        ORDER BY pb.updated_at DESC
        """,
        {"project_id": project_id},
    )
    briefs = []
    for b in brief_rows:
        ver_rows = all_rows(
            db,
            """
            SELECT pbv.*
            FROM project_brief_versions pbv
            WHERE pbv.brief_id = :brief_id
            ORDER BY pbv.created_at DESC
            """,
            {"brief_id": b["id"]},
        )
        briefs.append(_brief_item_response(b, [_brief_version_response(v) for v in ver_rows]))
    active_id = brief_rows[0]["id"] if brief_rows and brief_rows[0].get("id") else None
    return {
        "projectId": project_id,
        "activeBriefId": str(active_id) if active_id else "",
        "briefs": briefs,
    }


@router.post("/projects/{project_id}/briefs")
def create_brief(project_id: str, payload: CreateBriefPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    get_project(project_id, db, user)
    name = payload.name.strip() or "未命名 Brief"
    tenant_id = str(user["tenant_id"])

    brief_id = db.execute(text("SELECT gen_random_uuid() AS v")).scalar()
    version_id = db.execute(text("SELECT gen_random_uuid() AS v")).scalar()
    default_data = {
        "productName": "",
        "brief": "",
        "sellingPoints": [],
        "primarySellingPoint": "",
        "auxiliarySellingPoints": [],
        "targetGroups": [],
        "otherRequirements": "",
        "productVersion": "v1.0",
        "productPrice": "",
        "productSlogan": "",
        "specialSellingPoint": "",
        "mainSellingPoint": "",
        "auxiliarySellingPoint": "",
        "suitableCrowd": "",
        "suitableScene": "",
        "briefScore": 0,
    }
    ver_row = db.execute(
        text(
            """
            INSERT INTO project_brief_versions (id, tenant_id, brief_id, label, data, score, created_by)
            VALUES (:id, :tenant_id, :brief_id, 'v1.0', CAST(:data AS jsonb), 0, :created_by)
            RETURNING *
            """
        ),
        {"id": str(version_id), "tenant_id": tenant_id, "brief_id": str(brief_id), "data": json.dumps(default_data), "created_by": str(user["id"])},
    ).mappings().first()

    brief_row = db.execute(
        text(
            """
            INSERT INTO project_briefs (id, tenant_id, project_id, name, active_version_id, created_by)
            VALUES (:id, :tenant_id, :project_id, :name, :active_version_id, :created_by)
            RETURNING *
            """
        ),
        {
            "id": str(brief_id),
            "tenant_id": tenant_id,
            "project_id": project_id,
            "name": name,
            "active_version_id": str(version_id),
            "created_by": str(user["id"]),
        },
    ).mappings().first()
    db.commit()

    return get_brief_store(project_id, db, user)


@router.post("/projects/{project_id}/briefs/import")
async def import_briefs(project_id: str, db: DbSession, user: dict = Depends(get_current_front_user), file: UploadFile = File(...)) -> dict[str, Any]:
    get_project(project_id, db, user)
    file_name = file.filename or "brief-import.xlsx"
    if not file_name.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only csv/xlsx/xls files are supported")
    parsed = parse_import_file(file_name, await file.read())
    rows = parsed.get("rows") or []
    if not rows:
        raise HTTPException(status_code=400, detail="Import file has no data")

    imported = 0
    created = 0
    versioned = 0
    tenant_id = str(user["tenant_id"])
    original_active_brief = one(
        db,
        """
        SELECT id
        FROM project_briefs
        WHERE project_id = :project_id AND tenant_id = :tenant_id
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        {"project_id": project_id, "tenant_id": tenant_id},
    )
    for row in rows:
        mapped = map_import_record(row)
        product_model = (mapped.get("productModel") or mapped.get("productName") or "").strip()
        if not product_model:
            continue
        brief_row = one(
            db,
            """
            SELECT *
            FROM project_briefs
            WHERE project_id = :project_id AND tenant_id = :tenant_id AND name = :name
            LIMIT 1
            """,
            {"project_id": project_id, "tenant_id": tenant_id, "name": product_model},
        )
        versions = all_rows(
            db,
            """
            SELECT *
            FROM project_brief_versions
            WHERE brief_id = :brief_id
            ORDER BY created_at DESC
            """,
            {"brief_id": brief_row["id"]} if brief_row else {"brief_id": "00000000-0000-0000-0000-000000000000"},
        )
        label = _next_version_label(versions)
        data = _brief_data_from_import(mapped, label)
        if brief_row:
            ver_row = db.execute(
                text(
                    """
                    INSERT INTO project_brief_versions (tenant_id, brief_id, label, data, score, created_by)
                    VALUES (:tenant_id, :brief_id, :label, CAST(:data AS jsonb), 0, :created_by)
                    RETURNING *
                    """
                ),
                {"tenant_id": tenant_id, "brief_id": str(brief_row["id"]), "label": label, "data": json.dumps(data), "created_by": str(user["id"])},
            ).mappings().first()
            db.execute(
                text("UPDATE project_briefs SET active_version_id = :ver_id, updated_at = now() WHERE id = :brief_id"),
                {"ver_id": str(ver_row["id"]), "brief_id": str(brief_row["id"])},
            )
            versioned += 1
        else:
            brief_id = db.execute(text("SELECT gen_random_uuid() AS v")).scalar()
            version_id = db.execute(text("SELECT gen_random_uuid() AS v")).scalar()
            ver_row = db.execute(
                text(
                    """
                    INSERT INTO project_brief_versions (id, tenant_id, brief_id, label, data, score, created_by)
                    VALUES (:id, :tenant_id, :brief_id, 'v1.0', CAST(:data AS jsonb), 0, :created_by)
                    RETURNING *
                    """
                ),
                {"id": str(version_id), "tenant_id": tenant_id, "brief_id": str(brief_id), "data": json.dumps(data), "created_by": str(user["id"])},
            ).mappings().first()
            db.execute(
                text(
                    """
                    INSERT INTO project_briefs (id, tenant_id, project_id, name, active_version_id, created_by)
                    VALUES (:id, :tenant_id, :project_id, :name, :active_version_id, :created_by)
                    """
                ),
                {"id": str(brief_id), "tenant_id": tenant_id, "project_id": project_id, "name": product_model, "active_version_id": str(ver_row["id"]), "created_by": str(user["id"])},
            )
            created += 1
        imported += 1

    db.commit()
    store = get_brief_store(project_id, db, user)
    if original_active_brief:
        store["activeBriefId"] = str(original_active_brief["id"])
    return {"imported": imported, "created": created, "versioned": versioned, "store": store}


@router.post("/projects/{project_id}/briefs/{brief_id}/versions")
def create_brief_version(project_id: str, brief_id: str, payload: CreateBriefVersionPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    get_project(project_id, db, user)
    brief_row = one(
        db,
        "SELECT * FROM project_briefs WHERE id = :id AND tenant_id = :tenant_id LIMIT 1",
        {"id": brief_id, "tenant_id": user["tenant_id"]},
    )
    if not brief_row:
        raise HTTPException(status_code=404, detail="Brief not found")

    # get active version data as seed
    seed_data = {}
    if payload.seed == "copy" and brief_row["active_version_id"]:
        active_ver = one(db, "SELECT data FROM project_brief_versions WHERE id = :id", {"id": brief_row["active_version_id"]})
        if active_ver:
            seed_data = dict(active_ver["data"]) if active_ver["data"] else {}
            seed_data["productVersion"] = payload.label

    ver_row = db.execute(
        text(
            """
            INSERT INTO project_brief_versions (tenant_id, brief_id, label, data, score, created_by)
            VALUES (:tenant_id, :brief_id, :label, CAST(:data AS jsonb), 0, :created_by)
            RETURNING *
            """
        ),
        {
            "tenant_id": user["tenant_id"],
            "brief_id": brief_id,
            "label": payload.label,
            "data": json.dumps(seed_data),
            "created_by": user["id"],
        },
    ).mappings().first()
    db.execute(
        text("UPDATE project_briefs SET active_version_id = :ver_id, updated_at = now() WHERE id = :brief_id"),
        {"ver_id": str(ver_row["id"]), "brief_id": brief_id},
    )
    db.commit()
    return get_brief_store(project_id, db, user)


@router.get("/projects/{project_id}/briefs/{brief_id}/versions")
def get_brief_versions(project_id: str, brief_id: str, db: DbSession, user: dict = Depends(get_current_front_user)) -> list[dict[str, Any]]:
    get_project(project_id, db, user)
    brief_row = one(
        db,
        "SELECT * FROM project_briefs WHERE id = :id AND tenant_id = :tenant_id AND project_id = :project_id LIMIT 1",
        {"id": brief_id, "tenant_id": str(user["tenant_id"]), "project_id": project_id},
    )
    if not brief_row:
        raise HTTPException(status_code=404, detail="Brief not found")
    ver_rows = all_rows(
        db,
        """
        SELECT *
        FROM project_brief_versions
        WHERE brief_id = :brief_id
        ORDER BY created_at DESC
        """,
        {"brief_id": brief_id},
    )
    return [_brief_version_response(v) for v in ver_rows]


@router.patch("/projects/{project_id}/briefs/active")
def set_active_brief(project_id: str, payload: SetActiveBriefPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    get_project(project_id, db, user)
    brief_row = one(
        db,
        "SELECT * FROM project_briefs WHERE id = :id AND tenant_id = :tenant_id LIMIT 1",
        {"id": payload.briefId, "tenant_id": user["tenant_id"]},
    )
    if not brief_row:
        raise HTTPException(status_code=404, detail="Brief not found")
    db.execute(text("UPDATE project_briefs SET updated_at = now() WHERE id = :id"), {"id": payload.briefId})
    db.commit()
    return get_brief_store(project_id, db, user)


@router.patch("/projects/{project_id}/briefs/{brief_id}/versions/active")
def set_active_version(project_id: str, brief_id: str, payload: SetActiveVersionPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    get_project(project_id, db, user)
    brief_row = one(
        db,
        "SELECT * FROM project_briefs WHERE id = :id AND tenant_id = :tenant_id LIMIT 1",
        {"id": payload.briefId, "tenant_id": user["tenant_id"]},
    )
    if not brief_row:
        raise HTTPException(status_code=404, detail="Brief not found")
    ver_row = one(
        db,
        "SELECT * FROM project_brief_versions WHERE id = :id AND brief_id = :brief_id LIMIT 1",
        {"id": payload.versionId, "brief_id": payload.briefId},
    )
    if not ver_row:
        raise HTTPException(status_code=404, detail="Version not found")
    db.execute(
        text("UPDATE project_briefs SET active_version_id = :ver_id, updated_at = now() WHERE id = :brief_id"),
        {"ver_id": payload.versionId, "brief_id": payload.briefId},
    )
    db.commit()
    updated_brief = one(
        db,
        "SELECT * FROM project_briefs WHERE id = :id AND tenant_id = :tenant_id AND project_id = :project_id LIMIT 1",
        {"id": payload.briefId, "tenant_id": user["tenant_id"], "project_id": project_id},
    )
    return {
        "projectId": project_id,
        "briefId": payload.briefId,
        "activeBriefId": payload.briefId,
        "activeVersionId": payload.versionId,
        "brief": _brief_item_response(updated_brief, [_brief_version_response(ver_row)]) if updated_brief else None,
        "version": _brief_version_response(ver_row),
    }


@router.patch("/projects/{project_id}/briefs/{brief_id}/versions/{version_id}")
def save_brief_version(
    project_id: str,
    brief_id: str,
    version_id: str,
    payload: SaveBriefVersionPayload,
    db: DbSession,
    user: dict = Depends(get_current_front_user),
) -> dict[str, Any]:
    get_project(project_id, db, user)
    brief_row = one(
        db,
        "SELECT * FROM project_briefs WHERE id = :id AND tenant_id = :tenant_id LIMIT 1",
        {"id": brief_id, "tenant_id": str(user["tenant_id"])},
    )
    if not brief_row:
        raise HTTPException(status_code=404, detail="Brief not found")
    ver_row = one(
        db,
        "SELECT * FROM project_brief_versions WHERE id = :id AND brief_id = :brief_id LIMIT 1",
        {"id": version_id, "brief_id": brief_id},
    )
    if not ver_row:
        raise HTTPException(status_code=404, detail="Version not found")
    row = db.execute(
        text(
            """
            UPDATE project_brief_versions
            SET data = CAST(:data AS jsonb), score = :score, updated_at = now()
            WHERE id = :id
            RETURNING updated_at
            """
        ),
        {"id": version_id, "data": json.dumps(payload.data or {}), "score": payload.score or 0},
    ).mappings().first()
    db.commit()
    return {"projectId": project_id, "briefId": brief_id, "versionId": version_id, "savedAt": time_label(row.get("updated_at"))}


def project_response(row: dict) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "product": row.get("product_name") or "待填写产品",
        "announcement": row.get("announcement") or "",
        "avatarUrl": row.get("avatar_url") or "",
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
def create_project(
    payload: CreateProjectPayload | None = None,
    db: DbSession = None,
    user: dict = Depends(get_current_front_user),
) -> dict[str, Any]:
    title = (payload.title or "新建短视频脚本项目").strip()
    announcement = payload.announcement if payload else None
    avatar_url = payload.avatarUrl if payload else None
    row = db.execute(
        text(
            """
            INSERT INTO projects (tenant_id, owner_id, title, product_name, platform, status, current_step, progress, announcement, avatar_url)
            VALUES (:tenant_id, :owner_id, :title, '待填写产品', '抖音', 'draft', 'global', 0, :announcement, :avatar_url)
            RETURNING *
            """
        ),
        {
            "tenant_id": user["tenant_id"],
            "owner_id": user["id"],
            "title": title,
            "announcement": announcement,
            "avatar_url": avatar_url,
        },
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
    set_clauses = ["title = COALESCE(:title, title)", "product_name = COALESCE(:product_name, product_name)", "updated_at = now()"]
    params: dict[str, Any] = {"project_id": existing["id"], "tenant_id": user["tenant_id"], "title": payload.title, "product_name": payload.product}
    if payload.announcement is not None:
        set_clauses.append("announcement = :announcement")
        params["announcement"] = payload.announcement
    if payload.avatarUrl is not None:
        set_clauses.append("avatar_url = :avatar_url")
        params["avatar_url"] = payload.avatarUrl
    row = db.execute(
        text(f"UPDATE projects SET {', '.join(set_clauses)} WHERE id = :project_id AND tenant_id = :tenant_id RETURNING *"),
        params,
    ).mappings().first()
    db.commit()
    return project_response(dict(row))


@router.post("/projects/{project_id}/avatar")
def upload_project_avatar(
    project_id: str,
    file: UploadFile = File(...),
    db: DbSession = None,
    user: dict = Depends(get_current_front_user),
) -> dict[str, Any]:
    """Upload a project avatar image to OSS and update the project record."""
    get_project(project_id, db, user)

    try:
        oss_url = oss_upload_file(
            bucket=OssBucket.AVATAR,
            prefix=f"{user['tenant_id']}/{project_id}",
            filename=file.filename or "avatar",
            content=file.file,
            content_type=file.content_type or "image/jpeg",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OSS upload failed: {e}")

    db.execute(
        text("UPDATE projects SET avatar_url = :avatar_url, updated_at = now() WHERE id = :project_id AND tenant_id = :tenant_id"),
        {"avatar_url": oss_url, "project_id": project_id, "tenant_id": user["tenant_id"]},
    )
    db.commit()
    return {"avatarUrl": oss_url}


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
def upload_file(
    file: UploadFile = File(...),
    upload_type: str = "",
    db: DbSession = None,
    user: dict = Depends(get_current_front_user),
) -> dict[str, Any]:
    if not upload_type:
        raise HTTPException(status_code=400, detail="upload_type is required")

    allowed = {
        "selling-point-script-asset": OssBucket.MATERIAL,
        "viral-link-script-asset": OssBucket.MATERIAL,
        "project-asset": OssBucket.PROJECT,
        "storyboard-reference": OssBucket.PROJECT,
    }
    bucket = allowed.get(upload_type, OssBucket.PROJECT)
    prefix = f"{user['tenant_id']}/{upload_type}"

    try:
        oss_url = oss_upload_file(
            bucket=bucket,
            prefix=prefix,
            filename=file.filename or "file",
            content=file.file,
            content_type=file.content_type or "application/octet-stream",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OSS upload failed: {e}")

    row = db.execute(
        text(
            """
            INSERT INTO project_uploads (tenant_id, uploaded_by, upload_type, file_name, storage_key, mime_type, file_size_bytes, status)
            VALUES (:tenant_id, :uploaded_by, :upload_type, :file_name, :storage_key, :mime_type, :file_size_bytes, 'uploaded')
            RETURNING *
            """
        ),
        {
            "tenant_id": user["tenant_id"],
            "uploaded_by": user["id"],
            "upload_type": upload_type,
            "file_name": file.filename or "file",
            "storage_key": oss_url,
            "mime_type": file.content_type,
            "file_size_bytes": 0,
        },
    ).mappings().first()

    if upload_type == "selling-point-script-asset":
        db.execute(
            text(
                """
                INSERT INTO selling_point_assets (id, tenant_id, name, source_type, tag, main_point, target_groups, usage_count, status, created_by)
                VALUES (:id, :tenant_id, :name, 'upload', '产品卖点脚本', :main_point, '[]'::jsonb, 0, 'enabled', :created_by)
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {"id": row["id"], "tenant_id": user["tenant_id"], "name": file.filename or "file", "main_point": file.filename or "file", "created_by": user["id"]},
        )
    if upload_type == "viral-link-script-asset":
        db.execute(
            text(
                """
                INSERT INTO viral_script_assets (id, tenant_id, name, source_type, asset_kind, tags, usage_count, status, created_by)
                VALUES (:id, :tenant_id, :name, 'upload', 'script', '[]'::jsonb, 0, 'enabled', :created_by)
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {"id": row["id"], "tenant_id": user["tenant_id"], "name": file.filename or "file", "created_by": user["id"]},
        )
    db.commit()
    return {
        "id": str(row["id"]),
        "type": row["upload_type"],
        "fileName": row["file_name"],
        "url": oss_url,
        "status": row["status"],
        "uploadedAt": "刚刚",
    }
