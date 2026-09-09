import json
from datetime import datetime
from typing import Any

from sqlalchemy import Engine, create_engine, text

from app.contracts import RunRecord
from app.ids import id_generator


class WorkflowRunRepository:
    def __init__(self, database_url: str):
        self.engine: Engine = create_engine(database_url, pool_pre_ping=True, pool_recycle=1800)

    def load_run(self, run_id: int, tenant_id: int) -> RunRecord:
        with self.engine.connect() as connection:
            row = connection.execute(text("""
                SELECT id, tenant_id, project_id, graph_json, status, cancel_requested, create_by
                FROM ai_workflow_run
                WHERE id = :run_id AND tenant_id = :tenant_id AND deleted = 0
                LIMIT 1
            """), {"run_id": run_id, "tenant_id": tenant_id}).mappings().first()
        if row is None:
            raise LookupError(f"workflow run {run_id} was not found")
        values = dict(row)
        if not isinstance(values["graph_json"], str):
            values["graph_json"] = json.dumps(values["graph_json"], ensure_ascii=False)
        values["cancel_requested"] = bool(values["cancel_requested"])
        return RunRecord.model_validate(values)

    def mark_run_running(self, run_id: int, tenant_id: int, total_nodes: int) -> None:
        with self.engine.begin() as connection:
            connection.execute(text("""
                UPDATE ai_workflow_run
                SET status = 'running', progress = 1, total_nodes = :total_nodes,
                    started_at = COALESCE(started_at, :now), error_code = NULL, error_message = NULL
                WHERE id = :run_id AND tenant_id = :tenant_id AND deleted = 0
            """), {"run_id": run_id, "tenant_id": tenant_id, "total_nodes": total_nodes, "now": datetime.now()})

    def is_cancel_requested(self, run_id: int, tenant_id: int) -> bool:
        with self.engine.connect() as connection:
            value = connection.execute(text("""
                SELECT cancel_requested FROM ai_workflow_run
                WHERE id = :run_id AND tenant_id = :tenant_id AND deleted = 0
            """), {"run_id": run_id, "tenant_id": tenant_id}).scalar_one_or_none()
        return bool(value)

    def start_node(
        self,
        run: RunRecord,
        node_id: str,
        node_kind: str,
        skill_code: str,
        skill_version: str,
        inputs: dict[str, Any],
        config: dict[str, Any],
        worker_id: str,
    ) -> tuple[int, dict[str, Any] | None, int]:
        with self.engine.begin() as connection:
            existing = connection.execute(text("""
                SELECT id, status, output_json
                FROM ai_workflow_node_run
                WHERE tenant_id = :tenant_id AND workflow_run_id = :run_id
                  AND node_id = :node_id AND status = 'success' AND deleted = 0
                ORDER BY attempt DESC
                LIMIT 1
            """), {
                "tenant_id": run.tenant_id,
                "run_id": run.id,
                "node_id": node_id,
            }).mappings().first()
            if existing:
                output = existing["output_json"]
                if isinstance(output, str):
                    output = json.loads(output)
                return int(existing["id"]), output or {}, 0
            latest_attempt = connection.execute(text("""
                SELECT COALESCE(MAX(attempt), 0)
                FROM ai_workflow_node_run
                WHERE tenant_id = :tenant_id AND workflow_run_id = :run_id
                  AND node_id = :node_id AND deleted = 0
            """), {
                "tenant_id": run.tenant_id,
                "run_id": run.id,
                "node_id": node_id,
            }).scalar_one()
            attempt = int(latest_attempt) + 1
            node_run_id = id_generator.next_id()
            params = {
                "id": node_run_id,
                "tenant_id": run.tenant_id,
                "run_id": run.id,
                "node_id": node_id,
                "node_kind": node_kind,
                "skill_code": skill_code,
                "skill_version": skill_version,
                "input_json": json.dumps(inputs, ensure_ascii=False),
                "config_json": json.dumps(config, ensure_ascii=False),
                "worker_id": worker_id,
                "create_by": run.create_by,
                "now": datetime.now(),
                "attempt": attempt,
            }
            connection.execute(text("""
                INSERT INTO ai_workflow_node_run (
                    id, tenant_id, workflow_run_id, node_id, node_kind, skill_code, skill_version,
                    status, attempt, progress, input_json, config_json, worker_id, started_at,
                    create_by, update_by, create_time, update_time, deleted
                ) VALUES (
                    :id, :tenant_id, :run_id, :node_id, :node_kind, :skill_code, :skill_version,
                    'running', :attempt, 5, :input_json, :config_json, :worker_id, :now,
                    :create_by, :create_by, :now, :now, 0
                )
            """), params)
            return node_run_id, None, attempt

    def complete_node(self, node_run_id: int, tenant_id: int, output: dict[str, Any]) -> None:
        with self.engine.begin() as connection:
            connection.execute(text("""
                UPDATE ai_workflow_node_run
                SET status = 'success', progress = 100, output_json = :output_json,
                    finished_at = :now, update_time = :now
                WHERE id = :node_run_id AND tenant_id = :tenant_id AND deleted = 0
            """), {
                "node_run_id": node_run_id,
                "tenant_id": tenant_id,
                "output_json": json.dumps(output, ensure_ascii=False),
                "now": datetime.now(),
            })

    def fail_node(self, node_run_id: int, tenant_id: int, error_code: str, error_message: str) -> None:
        with self.engine.begin() as connection:
            connection.execute(text("""
                UPDATE ai_workflow_node_run
                SET status = 'failed', progress = 0, error_code = :error_code,
                    error_message = :error_message, finished_at = :now, update_time = :now
                WHERE id = :node_run_id AND tenant_id = :tenant_id AND deleted = 0
            """), {
                "node_run_id": node_run_id,
                "tenant_id": tenant_id,
                "error_code": error_code,
                "error_message": error_message[:2000],
                "now": datetime.now(),
            })

    def update_run_progress(self, run_id: int, tenant_id: int, completed: int, failed: int, total: int) -> None:
        progress = 100 if total == 0 else min(99, int((completed + failed) * 100 / total))
        with self.engine.begin() as connection:
            connection.execute(text("""
                UPDATE ai_workflow_run
                SET progress = :progress, completed_nodes = :completed, failed_nodes = :failed
                WHERE id = :run_id AND tenant_id = :tenant_id AND deleted = 0
            """), {
                "run_id": run_id,
                "tenant_id": tenant_id,
                "progress": progress,
                "completed": completed,
                "failed": failed,
            })

    def complete_run(self, run_id: int, tenant_id: int, outputs: dict[str, dict[str, Any]]) -> None:
        with self.engine.begin() as connection:
            connection.execute(text("""
                UPDATE ai_workflow_run
                SET status = 'success', progress = 100, output_json = :output_json,
                    finished_at = :now, update_time = :now
                WHERE id = :run_id AND tenant_id = :tenant_id AND deleted = 0
            """), {
                "run_id": run_id,
                "tenant_id": tenant_id,
                "output_json": json.dumps({"nodes": outputs}, ensure_ascii=False),
                "now": datetime.now(),
            })

    def fail_run(self, run_id: int, tenant_id: int, error_code: str, error_message: str) -> None:
        with self.engine.begin() as connection:
            connection.execute(text("""
                UPDATE ai_workflow_run
                SET status = 'failed', error_code = :error_code, error_message = :error_message,
                    finished_at = :now, update_time = :now
                WHERE id = :run_id AND tenant_id = :tenant_id AND deleted = 0
            """), {
                "run_id": run_id,
                "tenant_id": tenant_id,
                "error_code": error_code,
                "error_message": error_message[:2000],
                "now": datetime.now(),
            })

    def cancel_run(self, run_id: int, tenant_id: int) -> None:
        with self.engine.begin() as connection:
            connection.execute(text("""
                UPDATE ai_workflow_run
                SET status = 'canceled', finished_at = :now, update_time = :now
                WHERE id = :run_id AND tenant_id = :tenant_id AND deleted = 0
            """), {"run_id": run_id, "tenant_id": tenant_id, "now": datetime.now()})
