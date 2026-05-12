from typing import Any
import json
import re
import secrets

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text

from app.api.deps import DbSession, get_current_front_user
from app.common.sql import all_rows, one
from app.providers.llm.prompts import generate_storyboard_rows, suggest_compliance


router = APIRouter(tags=["script"])


DEFAULT_STORYBOARD = [
    {
        "id": 1,
        "shot": "镜号 01",
        "type": "特写",
        "scene": "加班工位，冷掉的便当盒放在键盘旁，人物看向窗外城市灯光。",
        "line": "加班到晚上，想吃一口热饭怎么就这么难？",
        "duration": "3s",
        "point": "痛点开场，建立职场场景代入",
        "risk": "低",
    },
    {
        "id": 2,
        "shot": "镜号 02",
        "type": "中景",
        "scene": "插电启动加热饭盒，蒸汽升起，字幕强调 20 分钟快速加热。",
        "line": "插电 20 分钟，办公室也能吃上刚热好的饭。",
        "duration": "4s",
        "point": "主卖点直出",
        "risk": "低",
    },
    {
        "id": 3,
        "shot": "镜号 03",
        "type": "近景",
        "scene": "打开分层餐盒，米饭和配菜保持完整，人物吃下第一口后表情放松。",
        "line": "分层不串味，忙一天也能认真吃顿热乎的。",
        "duration": "3s",
        "point": "辅助卖点自然植入",
        "risk": "低",
    },
]


class ScriptNamePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    scriptName: str | None = None


def _latest_project(db, user: dict) -> dict | None:
    return one(
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


def _ensure_project(db, user: dict) -> dict:
    project = _latest_project(db, user)
    if project:
        return project
    row = db.execute(
        text(
            """
            INSERT INTO projects (tenant_id, owner_id, title, product_name, platform, status, current_step, progress)
            VALUES (:tenant_id, :owner_id, '新建短视频脚本项目', '待填写产品', '抖音', 'draft', 'storyboard', 44)
            RETURNING *
            """
        ),
        {"tenant_id": user["tenant_id"], "owner_id": user["id"]},
    ).mappings().first()
    return dict(row)


def _latest_script(db, user: dict) -> dict | None:
    return one(
        db,
        """
        SELECT ss.*, sv.id AS version_id, sv.title AS version_title, sv.content_snapshot
        FROM storyboard_scripts ss
        LEFT JOIN script_versions sv ON sv.id = ss.current_version_id
        WHERE ss.tenant_id = :tenant_id
        ORDER BY ss.updated_at DESC
        LIMIT 1
        """,
        {"tenant_id": user["tenant_id"]},
    )


def _rows_from_version(db, version_id: str | None, fallback: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    if not version_id:
        return fallback or DEFAULT_STORYBOARD
    rows = all_rows(
        db,
        """
        SELECT *
        FROM shots
        WHERE script_version_id = :version_id
        ORDER BY display_order, shot_no
        """,
        {"version_id": version_id},
    )
    if not rows:
        return fallback or DEFAULT_STORYBOARD
    return [
        {
            "id": int(row["shot_no"]),
            "shot": row.get("shot_label") or f"镜号 {int(row['shot_no']):02d}",
            "type": row.get("shot_type") or "中景",
            "scene": row.get("scene_description") or "",
            "line": row.get("line_text") or "",
            "duration": f"{row.get('duration_seconds') or 3}s",
            "point": row.get("selling_point_note") or "",
            "risk": "低" if row.get("compliance_risk") in (None, "low") else "中",
        }
        for row in rows
    ]


def _step_states_for_project(db, project_id: str) -> list[dict[str, Any]]:
    return all_rows(
        db,
        """
        SELECT step_key, status, data
        FROM project_step_states
        WHERE project_id = :project_id
        ORDER BY created_at
        """,
        {"project_id": project_id},
    )


def _duration_seconds(value: Any) -> float:
    match = re.search(r"\d+(?:\.\d+)?", str(value))
    return float(match.group(0)) if match else 3.0


@router.post("/scripts/generate")
def generate_storyboard(db: DbSession, user: dict = Depends(get_current_front_user)) -> list[dict[str, Any]]:
    project = _ensure_project(db, user)
    title = f"{project.get('product_name') or '产品'}_分镜脚本"
    storyboard = generate_storyboard_rows(db, str(user["tenant_id"]), project, _step_states_for_project(db, str(project["id"]))) or DEFAULT_STORYBOARD
    script = db.execute(
        text(
            """
            INSERT INTO storyboard_scripts (tenant_id, project_id, name, status, audit_status, created_by)
            VALUES (:tenant_id, :project_id, :name, 'draft', 'not_submitted', :created_by)
            RETURNING *
            """
        ),
        {"tenant_id": user["tenant_id"], "project_id": project["id"], "name": title, "created_by": user["id"]},
    ).mappings().first()
    version = db.execute(
        text(
            """
            INSERT INTO script_versions (script_id, version_no, title, content_snapshot, change_note, created_by)
            VALUES (:script_id, 1, :title, CAST(:content AS jsonb), 'AI 生成初稿', :created_by)
            RETURNING *
            """
        ),
        {"script_id": script["id"], "title": title, "content": json.dumps(storyboard, ensure_ascii=False), "created_by": user["id"]},
    ).mappings().first()
    for index, item in enumerate(storyboard, start=1):
        duration = _duration_seconds(item["duration"])
        db.execute(
            text(
                """
                INSERT INTO shots (script_version_id, shot_no, shot_label, shot_type, scene_description, line_text, duration_seconds, selling_point_note, compliance_risk, display_order)
                VALUES (:version_id, :shot_no, :shot_label, :shot_type, :scene, :line, :duration, :point, 'low', :display_order)
                """
            ),
            {
                "version_id": version["id"],
                "shot_no": index,
                "shot_label": item["shot"],
                "shot_type": item["type"],
                "scene": item["scene"],
                "line": item["line"],
                "duration": duration,
                "point": item["point"],
                "display_order": index,
            },
        )
    db.execute(text("UPDATE storyboard_scripts SET current_version_id = :version_id, updated_at = now() WHERE id = :script_id"), {"version_id": version["id"], "script_id": script["id"]})
    db.execute(text("UPDATE projects SET status = 'scripting', current_step = 'storyboard', progress = GREATEST(progress, 44), updated_at = now() WHERE id = :project_id"), {"project_id": project["id"]})
    db.commit()
    return storyboard


@router.post("/scripts/compliance-check")
def run_compliance(db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    script = _latest_script(db, user)
    rows = _rows_from_version(db, str(script.get("version_id")) if script else None)
    words = all_rows(
        db,
        """
        SELECT word, suggestion
        FROM compliance_words
        WHERE status = 'enabled'
          AND (tenant_id IS NULL OR tenant_id = :tenant_id)
        """,
        {"tenant_id": user["tenant_id"]},
    )
    joined = "\n".join([f"{row['scene']} {row['line']}" for row in rows])
    matched = [word for word in words if word["word"] in joined]
    llm_result = suggest_compliance(db, str(user["tenant_id"]), rows, matched)
    if llm_result:
        return llm_result

    suggestion = matched[0]["suggestion"] if matched else "当前脚本未命中高风险词，建议继续保留人工复核。"
    return {"similarity": "38%", "riskCount": len(matched), "suggestion": suggestion}


@router.post("/scripts/submit-audit")
def submit_audit(db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, str]:
    script = _latest_script(db, user)
    if not script:
        generate_storyboard(db, user)
        script = _latest_script(db, user)
    db.execute(
        text(
            """
            INSERT INTO audit_tasks (tenant_id, project_id, script_id, current_version_id, status, stage, submitted_by, risk_summary)
            VALUES (:tenant_id, :project_id, :script_id, :version_id, 'pending', 'operation_review', :submitted_by, '低风险')
            """
        ),
        {
            "tenant_id": user["tenant_id"],
            "project_id": script["project_id"],
            "script_id": script["id"],
            "version_id": script.get("version_id"),
            "submitted_by": user["id"],
        },
    )
    db.execute(text("UPDATE storyboard_scripts SET audit_status = 'submitted', updated_at = now() WHERE id = :script_id"), {"script_id": script["id"]})
    db.commit()
    return {"status": "submitted", "message": "脚本已提交审核，待运营审核。"}


@router.post("/scripts/download")
def download_script(payload: ScriptNamePayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, str]:
    script_name = payload.scriptName or "分镜脚本"
    project = _ensure_project(db, user)
    db.execute(
        text(
            """
            INSERT INTO export_jobs (tenant_id, project_id, export_type, file_name, status, created_by)
            VALUES (:tenant_id, :project_id, 'script', :file_name, 'succeeded', :created_by)
            """
        ),
        {"tenant_id": user["tenant_id"], "project_id": project["id"], "file_name": f"{script_name}.xlsx", "created_by": user["id"]},
    )
    db.commit()
    return {"fileName": f"{script_name}.xlsx", "url": "#"}


@router.post("/scripts/share")
def share_script(payload: ScriptNamePayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, str]:
    script = _latest_script(db, user)
    if not script:
        generate_storyboard(db, user)
        script = _latest_script(db, user)
    token = secrets.token_urlsafe(12)
    title = payload.scriptName or script.get("name") or "分镜脚本"
    db.execute(text("UPDATE storyboard_scripts SET share_token = :token, name = :title, updated_at = now() WHERE id = :script_id"), {"token": token, "title": title, "script_id": script["id"]})
    db.commit()
    return {"title": title, "url": f"/share/scripts/{token}", "scope": "只读分享"}


@router.get("/share/scripts/current")
def get_share_script(db: DbSession) -> dict[str, Any]:
    script = one(
        db,
        """
        SELECT ss.*, sv.id AS version_id, sv.title AS version_title
        FROM storyboard_scripts ss
        LEFT JOIN script_versions sv ON sv.id = ss.current_version_id
        ORDER BY ss.updated_at DESC
        LIMIT 1
        """,
    )
    if not script:
        return {"title": "宠鲜鲜加热饭盒_职场加班版_v3", "status": "已审核", "scenes": DEFAULT_STORYBOARD}
    scenes = _rows_from_version(db, str(script.get("version_id")), DEFAULT_STORYBOARD)
    status = "已审核" if script.get("audit_status") in ("approved", "submitted") else "草稿"
    return {"title": script.get("name") or script.get("version_title") or "分镜脚本", "status": status, "scenes": scenes}
