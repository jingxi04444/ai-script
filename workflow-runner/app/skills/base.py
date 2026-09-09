from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SkillContext:
    run_id: int
    tenant_id: int
    project_id: int
    node_id: str


class Skill(ABC):
    code = "generic"
    version = "1.0.0"

    @abstractmethod
    async def execute(
        self,
        context: SkillContext,
        inputs: dict[str, Any],
        config: dict[str, Any],
    ) -> dict[str, Any]:
        raise NotImplementedError
