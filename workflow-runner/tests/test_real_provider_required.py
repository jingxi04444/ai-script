import unittest

from app.skills.registry import SkillRegistry


class RealProviderRequiredTest(unittest.TestCase):
    def test_production_registry_rejects_simulated_generation(self):
        with self.assertRaisesRegex(ValueError, "未配置真实模型适配器"):
            SkillRegistry(allow_simulation=False).resolve("image")
