import unittest

from app.skills.base import SkillContext
from app.skills.provider import BatchMaterialSkill, ProviderSkill


class FakeGateway:
    def __init__(self):
        self.calls = []

    async def execute(self, context, node_kind, inputs, config):
        self.calls.append((context, node_kind, inputs, config))
        return {"assetUrl": f"https://cdn.example/{context.node_id}.mp4"}


class ProviderSkillsTest(unittest.IsolatedAsyncioTestCase):
    async def test_provider_skill_passes_workflow_context_to_spring(self):
        gateway = FakeGateway()
        skill = ProviderSkill("video", gateway)
        context = SkillContext(run_id=1, tenant_id=2, project_id=3, node_id="video-1")

        output = await skill.execute(context, {"upstream": {}}, {"prompt": "产品特写"})

        self.assertEqual(gateway.calls[0][1], "video")
        self.assertEqual(gateway.calls[0][0].tenant_id, 2)
        self.assertEqual(output["assetUrl"], "https://cdn.example/video-1.mp4")

    async def test_batch_material_generates_requested_shots_concurrently(self):
        gateway = FakeGateway()
        skill = BatchMaterialSkill(gateway, max_concurrency=2)
        context = SkillContext(run_id=1, tenant_id=2, project_id=3, node_id="batch-1")

        output = await skill.execute(
            context,
            {"upstream": {"script": {"text": "护肤产品卖点"}}},
            {"batchSize": 3, "mediaType": "video"},
        )

        self.assertEqual(len(gateway.calls), 3)
        self.assertEqual(output["count"], 3)
        self.assertEqual(len(output["assetUrls"]), 3)
        self.assertEqual(gateway.calls[0][1], "video")
