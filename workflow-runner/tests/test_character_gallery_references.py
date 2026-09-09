"""Offline contract regressions: character sets survive up to the Spring boundary.

The HTTP transport is in-memory. These tests do not assert that a real video
provider consumes references; provider-specific image support is a separate layer.
"""

import copy
import json
import unittest

import httpx

from app.engine.graph import WorkflowGraph
from app.providers.spring_gateway import SpringProviderGateway
from app.skills.base import SkillContext
from app.skills.registry import SkillRegistry


def character_config(include_expressions=True):
    gallery = [
        {"label": "全身图", "url": "/creative-library/character-fullbody.png"},
        {"label": "面部特写", "url": "/creative-library/character-portrait.png"},
    ]
    if include_expressions:
        gallery.append({"label": "表情九宫格", "url": "/creative-library/character-expressions.png"})
    gallery.extend([
        {"label": "多角度设定图", "url": "/creative-library/character-turnaround.png"},
        {"label": "原始综合设定板", "url": "https://cdn.example.test/character-original-sheet.png"},
        # Cover and repeated gallery entries must not produce repeated references.
        {"label": "肖像备用标注", "url": "/creative-library/character-portrait.png"},
        {"label": "全身重复引用", "url": "  /creative-library/character-fullbody.png  "},
    ])
    return {
        "kind": "character",
        "skillCode": "resource.character",
        "creativeResourceId": "910260905000000101",
        "resourceName": "离线多图角色测试",
        "resourcePrompt": "保持所有视图中的同一位成年虚构人物身份和服装一致。",
        "assetUrl": "/creative-library/character-portrait.png",
        "resourceCoverUrl": "/creative-library/character-portrait.png",
        "resourceGallery": gallery,
    }


def expected_references(include_expressions=True):
    urls = [
        "/creative-library/character-portrait.png",
        "/creative-library/character-fullbody.png",
    ]
    if include_expressions:
        urls.append("/creative-library/character-expressions.png")
    return urls + [
        "/creative-library/character-turnaround.png",
        "https://cdn.example.test/character-original-sheet.png",
    ]


class CharacterGalleryReferencesTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.context = SkillContext(run_id=1, tenant_id=2, project_id=3, node_id="character-1")

    async def test_complete_four_views_and_extra_sheet_become_five_unique_references(self):
        config = character_config()
        original_config = copy.deepcopy(config)
        skill = SkillRegistry().resolve("character", "resource.character")

        output = await skill.execute(self.context, {}, config)

        self.assertEqual(output["skillCode"], "resource.character")
        self.assertEqual(output["assetUrls"], expected_references())
        self.assertEqual(len(output["assetUrls"]), 5)
        self.assertEqual(output["assetUrl"], config["assetUrl"])
        self.assertEqual(output["mediaType"], "image")
        self.assertEqual(config, original_config, "execution must not mutate the stored full gallery")

    async def test_missing_nine_grid_preserves_three_core_views_and_original_sheet(self):
        config = character_config(include_expressions=False)
        skill = SkillRegistry().resolve("character", "resource.character")

        output = await skill.execute(self.context, {}, config)

        self.assertEqual(output["assetUrls"], expected_references(False))
        self.assertEqual(len(output["assetUrls"]), 4)
        self.assertFalse(any("expressions" in url for url in output["assetUrls"]))
        self.assertIn("original-sheet.png", output["assetUrls"][-1])

    async def test_all_references_survive_graph_and_provider_serialization_not_just_cover(self):
        for include_expressions in (True, False):
            for downstream_kind in ("image", "video"):
                with self.subTest(include_expressions=include_expressions, downstream_kind=downstream_kind):
                    payloads = []

                    def handle(request: httpx.Request) -> httpx.Response:
                        payloads.append(json.loads(request.content))
                        return httpx.Response(200, json={
                            "code": 0,
                            "data": {"output": {"status": "success", "assetUrl": "/test-only/output.png"}},
                        })

                    gateway = SpringProviderGateway(
                        "http://spring.test/api/internal/workflow/providers/execute",
                        "offline-test-token",
                        transport=httpx.MockTransport(handle),
                    )
                    registry = SkillRegistry(provider_gateway=gateway)
                    config = character_config(include_expressions)
                    downstream_config = {"kind": downstream_kind, "prompt": "保持角色一致", "model": "offline-fixture"}
                    graph = WorkflowGraph.from_json({
                        "nodes": [
                            {"id": self.context.node_id, "data": config},
                            {"id": "generation-1", "data": downstream_config},
                        ],
                        "edges": [{"source": self.context.node_id, "target": "generation-1"}],
                    })
                    resource = await registry.resolve("character", "resource.character").execute(self.context, {}, config)
                    inputs = graph.inputs_for("generation-1", {self.context.node_id: resource})
                    context = SkillContext(run_id=1, tenant_id=2, project_id=3, node_id="generation-1")

                    await registry.resolve(downstream_kind).execute(context, inputs, downstream_config)

                    self.assertEqual(len(payloads), 1, "the gateway transport is entirely mocked")
                    payload = payloads[0]
                    self.assertEqual(payload["nodeKind"], downstream_kind)
                    self.assertEqual(payload["inputs"]["upstream"][self.context.node_id], resource)
                    self.assertEqual(
                        payload["inputs"]["upstream"][self.context.node_id]["assetUrls"],
                        expected_references(include_expressions),
                    )
                    self.assertEqual(payload["config"], downstream_config, "gallery must not overwrite model or first-frame settings")


if __name__ == "__main__":
    unittest.main()
