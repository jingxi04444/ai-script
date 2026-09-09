from app.skills.base import Skill
from app.skills.builtin import SimulatedSkill
from app.skills.director import DirectorResourceSkill
from app.skills.creative_library import CreativeResourceSkill
from app.providers.spring_gateway import SpringProviderGateway
from app.skills.provider import BatchMaterialSkill, ProviderSkill, ResourceSkill


class SkillRegistry:
    def __init__(
        self,
        simulation_delay_ms: int = 180,
        provider_gateway: SpringProviderGateway | None = None,
        max_concurrency: int = 4,
    ):
        self._simulation_delay_ms = simulation_delay_ms
        self._skills: dict[str, Skill] = {}
        # A director is a real browser-authored resource, even in runner demo mode.
        self.register(DirectorResourceSkill())
        for kind in ("character", "style", "effect"):
            self.register(CreativeResourceSkill(kind))
        if provider_gateway is not None:
            for kind in ("product", "scene", "result"):
                self.register(ResourceSkill(kind))
            for kind in (
                "text", "scriptGenerator", "prompt", "categorySkill", "storyboard",
                "image", "video", "music", "voice", "audio", "editor", "export",
            ):
                self.register(ProviderSkill(kind, provider_gateway))
            self.register(BatchMaterialSkill(provider_gateway, max_concurrency))

    def register(self, skill: Skill) -> None:
        self._skills[skill.code] = skill

    def resolve(self, kind: str, skill_code: str | None = None) -> Skill:
        if skill_code and skill_code in self._skills:
            return self._skills[skill_code]
        builtin_code = f"builtin.{kind}"
        provider_code = f"provider.{kind}"
        resource_code = f"resource.{kind}"
        if provider_code in self._skills:
            return self._skills[provider_code]
        if resource_code in self._skills:
            return self._skills[resource_code]
        if kind == "batchMaterial" and "provider.batch-material" in self._skills:
            return self._skills["provider.batch-material"]
        if builtin_code not in self._skills:
            self._skills[builtin_code] = SimulatedSkill(kind, self._simulation_delay_ms)
        return self._skills[builtin_code]
