from typing import Any
import json
import re
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text

from app.api.deps import DbSession, get_current_front_user
from app.common.formatting import time_label
from app.common.sql import all_rows, one
from app.providers.llm.prompts import generate_storyboard_rows, suggest_compliance
from app.providers.video_parser import extract_video_copy, parse_video_share_url, parsed_to_dict


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


class ExtractCopyPayload(BaseModel):
    url: str


class AnalyzeCopyPayload(BaseModel):
    transcript: str


class BreakdownStructurePayload(BaseModel):
    transcript: str
    analysis: dict[str, Any] | None = None


class GenerateDraftPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    mode: str = "viral"
    config: dict[str, Any] = {}
    transcript: str | None = None
    analysis: dict[str, Any] | None = None
    structure: dict[str, Any] | None = None
    templateId: str | None = None
    originalPrompt: str | None = None


class SaveGeneratedScriptPayload(BaseModel):
    projectId: str
    script: dict[str, Any]


class SavePolishedScriptPayload(BaseModel):
    script: dict[str, Any]


SCRIPT_FORMATS = [
    {"id": "storyboard-table", "name": "分镜表格"},
    {"id": "oral-script", "name": "台词口播"},
    {"id": "shooting-script", "name": "拍摄执行稿"},
]



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


def _template_category_key_sql() -> str:
    return "COALESCE(NULLIF(scenario, ''), '默认模板库')"


def _template_category_id(row: dict[str, Any]) -> str:
    return str(row.get("category_id") or row.get("categoryId") or "")


def _template_points(row: dict[str, Any]) -> list[str]:
    points = []
    if row.get("prompt"):
        points.append(row["prompt"])
    if row.get("platform"):
        points.append(f"适用平台：{row['platform']}")
    if row.get("scenario"):
        points.append(f"适用场景：{row['scenario']}")
    return points or [row.get("structure") or "按模板结构生成脚本。"]


def _generated_script(payload: GenerateDraftPayload) -> dict[str, Any]:
    config = payload.config or {}
    brief = str(config.get("brief") or "当前产品 Brief")
    duration = int(_duration_seconds(config.get("durationSeconds") or 30))
    mode_title = {"template": "模板脚本", "original": "AI 原创脚本", "viral": "爆款复刻脚本"}.get(payload.mode, "AI 脚本")
    rows = [
        {"shot": "镜头 01", "line": "你是不是也遇到过这个问题？", "visual": "真实使用场景，人物面对痛点停顿。", "duration": "3s", "note": "强钩子，建立代入"},
        {"shot": "镜头 02", "line": brief[:42] or "产品核心卖点出现。", "visual": str(config.get("productVisual") or "产品特写 + 使用动作。"), "duration": "8s", "note": "承接产品 Brief"},
        {"shot": "镜头 03", "line": "关键是它把复杂操作变得很简单。", "visual": "功能演示，字幕标注核心利益点。", "duration": "10s", "note": "证明卖点"},
        {"shot": "镜头 04", "line": "想要同款方案，可以先收藏再了解。", "visual": "结果画面 + 轻 CTA。", "duration": f"{max(duration - 21, 3)}s", "note": "收口转化"},
    ]
    return {
        "id": secrets.token_urlsafe(8),
        "title": f"{mode_title}_初稿",
        "sourceMode": payload.mode,
        "content": "\n".join([f"{row['shot']}｜{row['line']}｜{row['visual']}" for row in rows]),
        "rows": rows,
    }


def _script_rows_from_snapshot(snapshot: Any) -> list[dict[str, Any]]:
    if isinstance(snapshot, dict) and isinstance(snapshot.get("rows"), list):
        return snapshot["rows"]
    if isinstance(snapshot, list):
        return [
            {
                "shot": row.get("shot") or f"镜头 {index:02d}",
                "line": row.get("line") or "",
                "visual": row.get("scene") or row.get("visual") or "",
                "duration": row.get("duration") or "3s",
                "note": row.get("point") or row.get("note") or "",
            }
            for index, row in enumerate(snapshot, start=1)
        ]
    return []


def _script_content_from_snapshot(snapshot: Any, rows: list[dict[str, Any]]) -> str:
    if isinstance(snapshot, dict) and snapshot.get("content"):
        return str(snapshot["content"])
    return "\n".join([f"{row.get('shot', '')}｜{row.get('line', '')}｜{row.get('visual', '')}" for row in rows])


def _script_source_type(snapshot: Any) -> str:
    if isinstance(snapshot, dict) and snapshot.get("sourceMode") in {"viral", "template", "original"}:
        return snapshot["sourceMode"]
    return "original"


def _library_item(row: dict[str, Any]) -> dict[str, Any]:
    snapshot = row.get("content_snapshot") or {}
    rows = _script_rows_from_snapshot(snapshot)
    source_type = _script_source_type(snapshot)
    return {
        "id": str(row["id"]),
        "title": row.get("name") or row.get("version_title") or "未命名脚本",
        "productName": row.get("product_name") or "未绑定产品",
        "sourceType": source_type,
        "status": "已提交" if row.get("audit_status") == "submitted" else "草稿",
        "updatedAt": time_label(row.get("updated_at")),
        "summary": rows[0].get("note") if rows else "暂无脚本摘要",
        "content": _script_content_from_snapshot(snapshot, rows),
        "rows": rows,
    }


def _latest_script_rows(db: DbSession, user: dict, script_id: str) -> dict[str, Any] | None:
    return one(
        db,
        """
        SELECT ss.*, p.product_name, sv.id AS version_id, sv.title AS version_title, sv.content_snapshot
        FROM storyboard_scripts ss
        LEFT JOIN projects p ON p.id = ss.project_id
        LEFT JOIN script_versions sv ON sv.id = ss.current_version_id
        WHERE ss.id = :script_id
          AND ss.tenant_id = :tenant_id
        LIMIT 1
        """,
        {"script_id": script_id, "tenant_id": user["tenant_id"]},
    )


@router.get("/script-generator/formats")
def get_script_formats(user: dict = Depends(get_current_front_user)) -> list[dict[str, str]]:
    return SCRIPT_FORMATS


@router.post("/script-generator/extract-copy")
def extract_copy(payload: ExtractCopyPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    return extract_video_copy(payload.url, db, str(user["tenant_id"]))


@router.post("/video/share/url/parse")
def parse_video_share_link(payload: ExtractCopyPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    return {"code": 200, "msg": "success", "data": parsed_to_dict(parse_video_share_url(payload.url, db, str(user["tenant_id"]))) }


@router.post("/script-generator/analyze-copy")
def analyze_copy(payload: AnalyzeCopyPayload, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    return {"emotions": ["加班委屈", "效率焦虑", "被照顾感"], "keyMessages": ["冷饭痛点", "20 分钟快速加热", "分层不串味"], "summary": f"文案围绕真实痛点展开，用产品方案完成情绪转正。原文长度 {len(payload.transcript)} 字。"}


@router.post("/script-generator/breakdown-structure")
def breakdown_structure(payload: BreakdownStructurePayload, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    return {"title": "冷饭痛点复刻结构", "hook": "用强情绪开场制造停留。", "turningPoints": ["痛点放大", "产品出现", "效果证明"], "formula": "痛点控诉 -> 场景放大 -> 产品救场 -> 结果证明 -> 轻 CTA", "sections": [{"title": "开头钩子", "points": ["直接说痛点", "语气真实"]}, {"title": "中段证明", "points": ["时间数字", "产品画面"]}, {"title": "结尾转化", "points": ["弱 CTA", "收藏引导"]}]}


@router.get("/script-generator/template-categories")
def get_template_categories(db: DbSession, user: dict = Depends(get_current_front_user)) -> list[dict[str, str]]:
    category_key = _template_category_key_sql()
    rows = all_rows(
        db,
        f"""
        SELECT md5({category_key}) AS category_id,
               {category_key} AS name,
               COUNT(*) AS template_count,
               MIN(platform) AS platform,
               MIN(created_at) AS first_created_at
        FROM original_templates
        WHERE status = 'enabled'
        GROUP BY {category_key}
        ORDER BY first_created_at ASC
        """,
    )
    return [
        {
            "id": str(row["category_id"]),
            "name": row["name"],
            "description": f"{row.get('platform') or '全平台'} / {int(row.get('template_count') or 0)} 个模板",
        }
        for row in rows
    ]


@router.get("/script-generator/template-categories/{category_id}/templates")
def get_templates(category_id: str, db: DbSession, user: dict = Depends(get_current_front_user)) -> list[dict[str, Any]]:
    category_key = _template_category_key_sql()
    rows = all_rows(
        db,
        f"""
        SELECT id, md5({category_key}) AS category_id, name, structure, scenario, prompt, platform
        FROM original_templates
        WHERE status = 'enabled'
          AND md5({category_key}) = :category_id
        ORDER BY updated_at DESC, created_at DESC
        """,
        {"category_id": category_id},
    )
    return [
        {
            "id": str(row["id"]),
            "categoryId": _template_category_id(row),
            "name": row["name"],
            "summary": row.get("structure") or row.get("prompt") or "",
        }
        for row in rows
    ]


@router.get("/script-generator/templates/{template_id}")
def get_template_detail(template_id: str, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    category_key = _template_category_key_sql()
    row = one(
        db,
        f"""
        SELECT id, md5({category_key}) AS category_id, name, structure, scenario, prompt, platform
        FROM original_templates
        WHERE id = :template_id
          AND status = 'enabled'
        LIMIT 1
        """,
        {"template_id": template_id},
    )
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    return {
        "id": str(row["id"]),
        "categoryId": _template_category_id(row),
        "name": row["name"],
        "summary": row.get("structure") or row.get("prompt") or "",
        "formula": row.get("structure") or "",
        "points": _template_points(row),
    }


@router.post("/script-generator/generate")
def generate_script_draft(payload: GenerateDraftPayload, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    return _generated_script(payload)


@router.post("/script-generator/save")
def save_generated_script(payload: SaveGeneratedScriptPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, str]:
    project = one(db, "SELECT * FROM projects WHERE id = :id AND tenant_id = :tenant_id LIMIT 1", {"id": payload.projectId, "tenant_id": user["tenant_id"]}) or _ensure_project(db, user)
    script = payload.script or {}
    row = db.execute(
        text(
            """
            INSERT INTO storyboard_scripts (tenant_id, project_id, name, status, audit_status, created_by)
            VALUES (:tenant_id, :project_id, :name, 'draft', 'not_submitted', :created_by)
            RETURNING *
            """
        ),
        {"tenant_id": user["tenant_id"], "project_id": project["id"], "name": script.get("title") or "AI 生成脚本", "created_by": user["id"]},
    ).mappings().first()
    version = db.execute(
        text(
            """
            INSERT INTO script_versions (script_id, version_no, title, content_snapshot, change_note, created_by)
            VALUES (:script_id, 1, :title, CAST(:content AS jsonb), '脚本生成器保存', :created_by)
            RETURNING *
            """
        ),
        {"script_id": row["id"], "title": script.get("title") or "AI 生成脚本", "content": json.dumps(script, ensure_ascii=False), "created_by": user["id"]},
    ).mappings().first()
    db.execute(text("UPDATE storyboard_scripts SET current_version_id = :version_id, updated_at = now() WHERE id = :script_id"), {"version_id": version["id"], "script_id": row["id"]})
    db.commit()
    return {"savedAt": time_label(version.get("created_at"))}


@router.get("/storyboard-scripts")
def get_storyboard_scripts(category: str = "mine", db: DbSession = None, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    rows = all_rows(
        db,
        """
        SELECT ss.*, p.product_name, sv.id AS version_id, sv.title AS version_title, sv.content_snapshot
        FROM storyboard_scripts ss
        LEFT JOIN projects p ON p.id = ss.project_id
        LEFT JOIN script_versions sv ON sv.id = ss.current_version_id
        WHERE ss.tenant_id = :tenant_id
          AND (:category <> 'mine' OR ss.created_by = :user_id)
          AND (:category <> 'product' OR p.product_name IS NOT NULL)
          AND (
            :category NOT IN ('viral', 'template', 'original')
            OR (jsonb_typeof(sv.content_snapshot) = 'object' AND sv.content_snapshot ->> 'sourceMode' = :category)
          )
        ORDER BY ss.updated_at DESC
        """,
        {"tenant_id": user["tenant_id"], "user_id": user["id"], "category": category},
    )
    scripts = [_library_item(row) for row in rows]
    return {"category": category, "total": len(scripts), "scripts": scripts}


@router.post("/storyboard-scripts/{script_id}/polish")
def polish_storyboard_script(script_id: str, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, Any]:
    row = _latest_script_rows(db, user, script_id)
    if not row:
        raise HTTPException(status_code=404, detail="Script not found")
    item = _library_item(row)
    rows = [
        {
            **script_row,
            "line": f"先别急着划走，{script_row.get('line', '')}" if index == 0 else script_row.get("line", ""),
            "note": f"{script_row.get('note', '')} / AI 润色：强化节奏和画面动作".strip(),
        }
        for index, script_row in enumerate(item["rows"])
    ]
    content = "\n".join([f"{script_row.get('shot', '')}｜{script_row.get('line', '')}｜{script_row.get('visual', '')}" for script_row in rows])
    return {"id": script_id, "title": f"{item['title']}_润色版", "sourceMode": item["sourceType"], "content": content, "rows": rows}


@router.post("/storyboard-scripts/{script_id}/polished-version")
def save_polished_script(script_id: str, payload: SavePolishedScriptPayload, db: DbSession, user: dict = Depends(get_current_front_user)) -> dict[str, str]:
    row = _latest_script_rows(db, user, script_id)
    if not row:
        raise HTTPException(status_code=404, detail="Script not found")
    version_no = db.execute(text("SELECT COALESCE(MAX(version_no), 0) + 1 FROM script_versions WHERE script_id = :script_id"), {"script_id": script_id}).scalar()
    script = payload.script or {}
    version = db.execute(
        text(
            """
            INSERT INTO script_versions (script_id, version_no, title, content_snapshot, change_note, created_by)
            VALUES (:script_id, :version_no, :title, CAST(:content AS jsonb), 'AI 润色保存', :created_by)
            RETURNING *
            """
        ),
        {"script_id": script_id, "version_no": version_no, "title": script.get("title") or row.get("name") or "润色脚本", "content": json.dumps(script, ensure_ascii=False), "created_by": user["id"]},
    ).mappings().first()
    for index, item in enumerate(script.get("rows") or [], start=1):
        db.execute(
            text(
                """
                INSERT INTO shots (script_version_id, shot_no, shot_label, shot_type, scene_description, line_text, duration_seconds, selling_point_note, compliance_risk, display_order)
                VALUES (:version_id, :shot_no, :shot_label, '中景', :scene, :line, :duration, :point, 'low', :display_order)
                """
            ),
            {
                "version_id": version["id"],
                "shot_no": index,
                "shot_label": item.get("shot") or f"镜头 {index:02d}",
                "scene": item.get("visual") or "",
                "line": item.get("line") or "",
                "duration": _duration_seconds(item.get("duration") or "3s"),
                "point": item.get("note") or "",
                "display_order": index,
            },
        )
    db.execute(text("UPDATE storyboard_scripts SET current_version_id = :version_id, updated_at = now() WHERE id = :script_id"), {"version_id": version["id"], "script_id": script_id})
    db.commit()
    return {"savedAt": time_label(version.get("created_at"))}


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
