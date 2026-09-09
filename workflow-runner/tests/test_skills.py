import asyncio
import unittest

from app.skills.base import SkillContext
from app.skills.registry import SkillRegistry


class SkillRegistryTest(unittest.TestCase):
    def test_image_skill_returns_demo_asset_and_upstream_lineage(self):
        skill = SkillRegistry(simulation_delay_ms=0).resolve("image")

        output = asyncio.run(skill.execute(
            SkillContext(run_id=1, tenant_id=2, project_id=3, node_id="image-1"),
            {"upstream": {"product-1": {"assetUrl": "product.jpg"}}},
            {"batchSize": 2},
        ))

        self.assertEqual(output["assetUrl"], "/demo-media/skincare-lifestyle.jpg")
        self.assertEqual(output["count"], 2)
        self.assertEqual(output["upstreamNodeIds"], ["product-1"])
