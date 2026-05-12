from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.api.deps import DbSession, get_current_front_user
from app.common.sql import one


router = APIRouter(tags=["generation"])


@router.get("/generation/tasks/current")
def get_current_task(db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, str | int]:
    row = one(
        db,
        """
        SELECT *
        FROM generation_tasks
        WHERE tenant_id = :tenant_id
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        {"tenant_id": user["tenant_id"]},
    )
    if row:
        return {"status": row["status"], "progress": row.get("progress") or 0, "label": row.get("label") or "任务进行中"}

    created = db.execute(
        text(
            """
            INSERT INTO generation_tasks (tenant_id, created_by, task_type, provider, status, progress, label)
            VALUES (:tenant_id, :created_by, 'video-generation', 'mock-provider', 'running', 76, '正在生成镜号 03 视频片段')
            RETURNING *
            """
        ),
        {"tenant_id": user["tenant_id"], "created_by": user["id"]},
    ).mappings().first()
    db.commit()
    return {"status": created["status"], "progress": created["progress"], "label": created["label"]}


@router.post("/projects/current/export")
def export_video(db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, str]:
    project = one(
        db,
        """
        SELECT *
        FROM projects
        WHERE tenant_id = :tenant_id
          AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        {"tenant_id": user["tenant_id"]},
    )
    file_name = f"{(project or {}).get('title') or '短视频成片'}.mp4"
    db.execute(
        text(
            """
            INSERT INTO export_jobs (tenant_id, project_id, export_type, resolution, file_name, status, created_by)
            VALUES (:tenant_id, :project_id, 'video', '1080P', :file_name, 'succeeded', :created_by)
            """
        ),
        {"tenant_id": user["tenant_id"], "project_id": (project or {}).get("id"), "file_name": file_name, "created_by": user["id"]},
    )
    db.commit()
    return {"fileName": file_name, "url": "#"}
