import unittest

from app.engine.graph import WorkflowGraph
from app.skills.base import SkillContext
from app.skills.creative_library import CreativeResourceSkill
from app.skills.registry import SkillRegistry


class CreativeLibrarySkillTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.context = SkillContext(run_id=1, tenant_id=2, project_id=3, node_id="library-1")

    async def test_character_passes_deduplicated_portrait_and_sheet_and_prompt(self):
        result = await CreativeResourceSkill("character").execute(self.context, {}, {
            "creativeResourceId": "910260905000000101", "resourceName": "原创角色",
            "resourcePrompt": "保持人物一致", "resourceNegativePrompt": "不要改变服装",
            "assetUrl": "/creative-library/portrait.png",
            "resourceGallery": [{"url": "/creative-library/portrait.png"}, {"url": "https://cdn.example/sheet.png"}],
        })
        self.assertEqual(result["assetUrls"], ["/creative-library/portrait.png", "https://cdn.example/sheet.png"])
        self.assertIn("保持人物一致", result["resource"])
        self.assertIn("不要改变服装", result["resource"])
        self.assertEqual(result["creativeResourceId"], "910260905000000101")

    async def test_effect_never_forwards_cover_or_preview_as_input(self):
        result = await CreativeResourceSkill("effect").execute(self.context, {}, {
            "resourcePrompt": "缓慢环绕", "assetUrl": "https://cdn.example/cover.png",
            "resourcePreviewVideoUrl": "https://cdn.example/demo.mp4",
            "resourceConfig": {"cameraMotion": "环绕30度", "durationSeconds": 5, "apiKey": "must-not-pass", "model": "must-not-override", "url": "https://unexpected.example"},
        })
        self.assertIsNone(result["assetUrl"])
        self.assertEqual(result["assetUrls"], [])
        self.assertEqual(result["mediaType"], "template")
        self.assertIn("环绕30度", result["resource"])
        self.assertNotIn("must-not", result["resource"])
        self.assertNotIn("unexpected", result["resource"])

    async def test_empty_library_prompt_fails_explicitly(self):
        for kind in ("character", "style", "effect"):
            with self.subTest(kind=kind), self.assertRaisesRegex(ValueError, "缺少提示词"):
                await CreativeResourceSkill(kind).execute(self.context, {}, {"creativeResourceId": "123"})

    async def test_legacy_uploaded_character_still_works(self):
        result = await CreativeResourceSkill("character").execute(self.context, {}, {"assetUrl": "/files/old.png"})
        self.assertEqual(result["assetUrl"], "/files/old.png")

    async def test_image_reference_rejects_browser_only_and_unsafe_urls(self):
        for url in ("data:image/png;base64,abc", "blob:abc", "javascript:alert(1)", "//outside/image.png", "https://user:secret@example.com/a.png", "/bad\\file"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                await CreativeResourceSkill("style").execute(self.context, {}, {"resourcePrompt": "柔光", "assetUrl": url})

    async def test_style_requires_an_image_and_forwards_reference_text(self):
        with self.assertRaisesRegex(ValueError, "缺少参考图片"):
            await CreativeResourceSkill("style").execute(self.context, {}, {"resourcePrompt": "柔光"})
        output = await CreativeResourceSkill("style").execute(self.context, {}, {"resourcePrompt": "柔光", "assetUrl": "/creative-library/style.png"})
        graph = WorkflowGraph.from_json({"nodes": [{"id": "s", "data": {"kind": "style"}}, {"id": "image", "data": {"kind": "image"}}], "edges": [{"source": "s", "target": "image"}]})
        upstream = graph.inputs_for("image", {"s": output})["upstream"]["s"]
        self.assertIn("柔光", upstream["resource"])
        self.assertEqual(upstream["assetUrl"], "/creative-library/style.png")

    def test_real_resource_registration_in_demo_and_gateway_modes(self):
        for gateway in (None, object()):
            registry = SkillRegistry(provider_gateway=gateway)
            for kind in ("character", "style", "effect"):
                self.assertIsInstance(registry.resolve(kind), CreativeResourceSkill)


if __name__ == "__main__":
    unittest.main()
