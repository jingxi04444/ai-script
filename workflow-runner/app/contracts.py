from typing import Any, Literal

from pydantic import BaseModel, Field


class WorkflowCommand(BaseModel):
    type: Literal["START_WORKFLOW", "CANCEL_WORKFLOW"]
    run_id: int = Field(alias="runId")
    tenant_id: int = Field(alias="tenantId")
    project_id: int | None = Field(default=None, alias="projectId")
    workflow_version: int | None = Field(default=None, alias="workflowVersion")


class WorkflowEvent(BaseModel):
    type: str
    run_id: str = Field(alias="runId")
    node_id: str | None = Field(default=None, alias="nodeId")
    status: str | None = None
    progress: int | None = None
    message: str | None = None
    output: dict[str, Any] | None = None

    model_config = {"populate_by_name": True}


class RunRecord(BaseModel):
    id: int
    tenant_id: int
    project_id: int
    graph_json: str
    status: str
    cancel_requested: bool = False
    create_by: int | None = None
