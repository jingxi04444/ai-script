import unittest

from app.engine.graph import WorkflowGraph
from app.skills.base import SkillContext
from app.skills.director import DirectorResourceSkill
from app.skills.registry import SkillRegistry


class DirectorResourceSkillTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.context = SkillContext(run_id=1, tenant_id=2, project_id=3, node_id="director-1")
        self.skill = DirectorResourceSkill()

    async def test_exported_frame_is_a_downstream_image_reference(self):
        output = await self.skill.execute(self.context, {}, {
            "outputUrl": "https://cdn.example/director-frame.png",
            "assetUrl": "https://cdn.example/older-frame.png",
            "aspectRatio": "9:16",
            "directorScene": {"version": 1, "objects": []},
        })
        self.assertEqual(output["assetUrl"], "https://cdn.example/director-frame.png")
        self.assertEqual(output["mediaType"], "image")
        self.assertEqual(output["aspectRatio"], "9:16")
        self.assertEqual(output["skillCode"], "resource.director")
        graph = WorkflowGraph.from_json({
            "nodes": [
                {"id": "director-1", "data": {"kind": "director"}},
                {"id": "image-1", "data": {"kind": "image"}},
            ],
            "edges": [{"source": "director-1", "target": "image-1"}],
        })
        inputs = graph.inputs_for("image-1", {"director-1": output})
        self.assertEqual(inputs["upstream"]["director-1"]["assetUrl"], output["assetUrl"])

    async def test_relative_uploaded_asset_is_supported(self):
        output = await self.skill.execute(self.context, {}, {"assetUrl": "/files/director-frame.png"})
        self.assertEqual(output["assetUrl"], "/files/director-frame.png")

    async def test_scene_without_snapshot_fails_instead_of_simulating_success(self):
        with self.assertRaisesRegex(ValueError, "尚未导出机位截图"):
            await self.skill.execute(self.context, {}, {"directorScene": {"version": 1}})

    async def test_browser_only_snapshots_cannot_enter_remote_workflow(self):
        for url in ("data:image/png;base64,AAAA", "blob:http://localhost/frame"):
            with self.subTest(url=url), self.assertRaisesRegex(ValueError, "仅保存在浏览器中"):
                await self.skill.execute(self.context, {}, {"outputUrl": url})

    async def test_invalid_snapshot_uri_is_rejected(self):
        for url in ("file:///tmp/frame.png", "javascript:alert(1)", "//cdn.example/frame.png"):
            with self.subTest(url=url), self.assertRaisesRegex(ValueError, "地址无效"):
                await self.skill.execute(self.context, {}, {"outputUrl": url})

    def test_director_is_a_resource_with_and_without_provider_gateway(self):
        for gateway in (None, object()):
            registry = SkillRegistry(provider_gateway=gateway)
            self.assertIsInstance(registry.resolve("director"), DirectorResourceSkill)
            self.assertIsInstance(registry.resolve("director", "resource.director"), DirectorResourceSkill)
