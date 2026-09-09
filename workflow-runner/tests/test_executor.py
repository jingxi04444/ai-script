import json
import unittest

from app.contracts import RunRecord
from app.engine.executor import WorkflowExecutor
from app.skills.base import Skill
from app.skills.registry import SkillRegistry


class FakeRepository:
    def __init__(self, run: RunRecord):
        self.run = run
        self.node_outputs = {}
        self.completed_run_outputs = None

    def load_run(self, run_id, tenant_id):
        assert run_id == self.run.id and tenant_id == self.run.tenant_id
        return self.run

    def mark_run_running(self, run_id, tenant_id, total_nodes):
        self.total_nodes = total_nodes

    def is_cancel_requested(self, run_id, tenant_id):
        return False

    def start_node(self, run, node_id, node_kind, skill_code, skill_version, inputs, config, worker_id):
        self.last_inputs = getattr(self, "last_inputs", {})
        self.last_inputs[node_id] = inputs
        return len(self.last_inputs), None, 1

    def complete_node(self, node_run_id, tenant_id, output):
        self.node_outputs[node_run_id] = output

    def fail_node(self, node_run_id, tenant_id, error_code, error_message):
        self.failed_nodes = getattr(self, "failed_nodes", [])
        self.failed_nodes.append((node_run_id, error_code, error_message))

    def update_run_progress(self, run_id, tenant_id, completed, failed, total):
        self.progress = (completed, failed, total)

    def complete_run(self, run_id, tenant_id, outputs):
        self.completed_run_outputs = outputs

    def fail_run(self, run_id, tenant_id, error_code, error_message):
        raise AssertionError(error_message)


class FakeEvents:
    def __init__(self):
        self.items = []

    async def publish(self, event):
        self.items.append(event)


class FlakySkill(Skill):
    code = "test.flaky"

    def __init__(self):
        self.calls = 0

    async def execute(self, context, inputs, config):
        self.calls += 1
        if self.calls == 1:
            raise RuntimeError("temporary provider error")
        return {"text": "recovered"}


class WorkflowExecutorTest(unittest.IsolatedAsyncioTestCase):
    async def test_executor_runs_dag_and_passes_upstream_outputs(self):
        graph = {
            "nodes": [
                {"id": "product", "data": {"kind": "product", "assetUrl": "product.jpg"}},
                {"id": "image", "data": {"kind": "image", "batchSize": 2}},
                {"id": "video", "data": {"kind": "video", "batchSize": 3}},
            ],
            "edges": [
                {"source": "product", "target": "image"},
                {"source": "image", "target": "video"},
            ],
        }
        run = RunRecord(
            id=11,
            tenant_id=2,
            project_id=3,
            graph_json=json.dumps(graph),
            status="queued",
            create_by=5,
        )
        repository = FakeRepository(run)
        events = FakeEvents()
        executor = WorkflowExecutor(repository, events, SkillRegistry(0), max_concurrency=2)

        await executor.execute(run.id, run.tenant_id)

        self.assertEqual(repository.total_nodes, 3)
        self.assertEqual(repository.progress, (3, 0, 3))
        self.assertEqual(set(repository.last_inputs["image"]["upstream"]), {"product"})
        self.assertEqual(set(repository.last_inputs["video"]["upstream"]), {"image"})
        self.assertEqual(repository.completed_run_outputs["video"]["assetUrl"], "/demo-media/skincare-demo.mp4")
        self.assertEqual(events.items[0].type, "WORKFLOW_STARTED")
        self.assertEqual(events.items[-1].type, "WORKFLOW_COMPLETED")

    async def test_executor_retries_a_failed_provider_node(self):
        graph = {
            "nodes": [{
                "id": "text",
                "data": {"kind": "text", "skillCode": "test.flaky", "retryCount": 1},
            }],
            "edges": [],
        }
        run = RunRecord(
            id=12,
            tenant_id=2,
            project_id=3,
            graph_json=json.dumps(graph),
            status="queued",
            create_by=5,
        )
        repository = FakeRepository(run)
        events = FakeEvents()
        skills = SkillRegistry(0)
        flaky = FlakySkill()
        skills.register(flaky)
        executor = WorkflowExecutor(repository, events, skills, max_concurrency=1)

        await executor.execute(run.id, run.tenant_id)

        self.assertEqual(flaky.calls, 2)
        self.assertEqual(len(repository.failed_nodes), 1)
        self.assertEqual(repository.completed_run_outputs["text"]["text"], "recovered")
        self.assertIn("NODE_RETRY_SCHEDULED", [event.type for event in events.items])
