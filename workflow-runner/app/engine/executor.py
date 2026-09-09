import asyncio
import socket
from typing import Any

from app.contracts import RunRecord, WorkflowEvent
from app.engine.graph import WorkflowGraph, WorkflowNode
from app.events import WorkflowEventPublisher
from app.repositories.run_repository import WorkflowRunRepository
from app.skills.base import SkillContext
from app.skills.registry import SkillRegistry


class WorkflowExecutionFailed(RuntimeError):
    """The run reached a recorded terminal failure and must not be executed again automatically."""


class WorkflowExecutor:
    def __init__(
        self,
        repository: WorkflowRunRepository,
        events: WorkflowEventPublisher,
        skills: SkillRegistry,
        max_concurrency: int = 4,
        max_node_attempts: int = 3,
        worker_id: str | None = None,
    ):
        self.repository = repository
        self.events = events
        self.skills = skills
        self.semaphore = asyncio.Semaphore(max(1, max_concurrency))
        self.max_node_attempts = max(1, min(5, max_node_attempts))
        self.worker_id = worker_id or socket.gethostname()

    async def execute(self, run_id: int, tenant_id: int) -> None:
        run = await asyncio.to_thread(self.repository.load_run, run_id, tenant_id)
        if run.status == "success":
            await self._publish("WORKFLOW_COMPLETED", run, "success", 100, "工作流已经执行完成")
            return
        graph = WorkflowGraph.from_json(run.graph_json)
        await asyncio.to_thread(self.repository.mark_run_running, run.id, run.tenant_id, len(graph.nodes))
        await self._publish("WORKFLOW_STARTED", run, "running", 1, "工作流开始执行")

        outputs: dict[str, dict[str, Any]] = {}
        completed = 0
        try:
            for layer in graph.layers():
                if await asyncio.to_thread(self.repository.is_cancel_requested, run.id, run.tenant_id):
                    await asyncio.to_thread(self.repository.cancel_run, run.id, run.tenant_id)
                    await self._publish("WORKFLOW_CANCELED", run, "canceled", None, "工作流已取消")
                    return
                results = await asyncio.gather(*[
                    self._execute_node(run, graph, node, outputs) for node in layer
                ])
                for node_id, output in results:
                    outputs[node_id] = output
                    completed += 1
                await asyncio.to_thread(
                    self.repository.update_run_progress, run.id, run.tenant_id, completed, 0, len(graph.nodes)
                )
            await asyncio.to_thread(self.repository.complete_run, run.id, run.tenant_id, outputs)
            await self._publish("WORKFLOW_COMPLETED", run, "success", 100, "工作流执行完成", {"nodes": outputs})
        except Exception as exception:
            await asyncio.to_thread(
                self.repository.fail_run, run.id, run.tenant_id, "WORKFLOW_EXECUTION_FAILED", str(exception)
            )
            await self._publish("WORKFLOW_FAILED", run, "failed", None, str(exception))
            raise WorkflowExecutionFailed(str(exception)) from exception

    async def _execute_node(
        self,
        run: RunRecord,
        graph: WorkflowGraph,
        node: WorkflowNode,
        outputs: dict[str, dict[str, Any]],
    ) -> tuple[str, dict[str, Any]]:
        async with self.semaphore:
            inputs = graph.inputs_for(node.id, outputs)
            skill = self.skills.resolve(node.kind, node.data.get("skillCode"))
            configured_retries = _int_value(node.data.get("retryCount"), self.max_node_attempts - 1)
            max_attempts = max(1, min(5, configured_retries + 1))
            for local_attempt in range(1, max_attempts + 1):
                node_run_id, cached_output, persisted_attempt = await asyncio.to_thread(
                    self.repository.start_node,
                    run,
                    node.id,
                    node.kind,
                    skill.code,
                    skill.version,
                    inputs,
                    node.data,
                    self.worker_id,
                )
                if cached_output is not None:
                    return node.id, cached_output
                await self.events.publish(WorkflowEvent(
                    type="NODE_STARTED" if local_attempt == 1 else "NODE_RETRYING",
                    runId=str(run.id),
                    nodeId=node.id,
                    status="running",
                    progress=5,
                    message=f"{node.data.get('title', node.id)}第 {persisted_attempt} 次执行",
                ))
                try:
                    output = await skill.execute(
                        SkillContext(run.id, run.tenant_id, run.project_id, node.id),
                        inputs,
                        node.data,
                    )
                    await asyncio.to_thread(self.repository.complete_node, node_run_id, run.tenant_id, output)
                    await self.events.publish(WorkflowEvent(
                        type="NODE_COMPLETED",
                        runId=str(run.id),
                        nodeId=node.id,
                        status="success",
                        progress=100,
                        message=f"{node.data.get('title', node.id)}执行完成",
                        output=output,
                    ))
                    return node.id, output
                except Exception as exception:
                    await asyncio.to_thread(
                        self.repository.fail_node,
                        node_run_id,
                        run.tenant_id,
                        "SKILL_EXECUTION_FAILED",
                        str(exception),
                    )
                    if local_attempt >= max_attempts:
                        await self.events.publish(WorkflowEvent(
                            type="NODE_FAILED",
                            runId=str(run.id),
                            nodeId=node.id,
                            status="failed",
                            progress=0,
                            message=str(exception),
                        ))
                        raise
                    delay_seconds = min(8, 2 ** (local_attempt - 1))
                    await self.events.publish(WorkflowEvent(
                        type="NODE_RETRY_SCHEDULED",
                        runId=str(run.id),
                        nodeId=node.id,
                        status="retrying",
                        progress=5,
                        message=f"调用失败，{delay_seconds} 秒后重试：{exception}",
                    ))
                    await asyncio.sleep(delay_seconds)
            raise RuntimeError(f"node {node.id} exhausted retries")

    async def _publish(
        self,
        event_type: str,
        run: RunRecord,
        status: str,
        progress: int | None,
        message: str,
        output: dict[str, Any] | None = None,
    ) -> None:
        await self.events.publish(WorkflowEvent(
            type=event_type,
            runId=str(run.id),
            status=status,
            progress=progress,
            message=message,
            output=output,
        ))


def _int_value(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback
