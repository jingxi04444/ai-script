import asyncio
import time
from typing import Any

import httpx

from app.skills.base import SkillContext


class ProviderGatewayError(RuntimeError):
    pass


class SpringProviderGateway:
    def __init__(
        self,
        url: str,
        token: str,
        timeout_seconds: float = 320.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        if not token.strip():
            raise ValueError(
                "WORKFLOW_PROVIDER_GATEWAY_TOKEN must be configured when the real provider gateway is enabled"
            )
        self.url = url
        self.poll_url = f"{url.rsplit('/', 1)[0]}/poll"
        self.token = token
        self.timeout_seconds = timeout_seconds
        self.transport = transport

    async def execute(
        self,
        context: SkillContext,
        node_kind: str,
        inputs: dict[str, Any],
        config: dict[str, Any],
    ) -> dict[str, Any]:
        payload = {
            "tenantId": context.tenant_id,
            "runId": str(context.run_id),
            "nodeId": context.node_id,
            "nodeKind": node_kind,
            "inputs": inputs,
            "config": config,
        }
        async with httpx.AsyncClient(timeout=self.timeout_seconds, transport=self.transport) as client:
            output = await self._post(client, self.url, payload)
            if output.get("status") != "pending":
                return output
            max_wait_ms = _int_value(output.get("maxWaitMs"), int(self.timeout_seconds * 1000))
            deadline = time.monotonic() + max(1, max_wait_ms) / 1000
            while output.get("status") == "pending":
                if time.monotonic() >= deadline:
                    raise ProviderGatewayError(f"Provider 异步任务轮询超时：{output.get('taskId')}")
                interval_ms = max(500, min(30_000, _int_value(output.get("pollIntervalMs"), 3000)))
                await asyncio.sleep(interval_ms / 1000)
                output = await self._post(client, self.poll_url, {
                    "tenantId": context.tenant_id,
                    "runId": str(context.run_id),
                    "nodeId": context.node_id,
                    "providerId": str(output.get("providerId") or ""),
                    "taskId": str(output.get("taskId") or ""),
                })
            return output

    async def _post(
        self,
        client: httpx.AsyncClient,
        url: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            response = await client.post(
                url,
                headers={"X-Workflow-Token": self.token},
                json=payload,
            )
            response.raise_for_status()
            body = response.json()
        except (httpx.HTTPError, ValueError) as exception:
            raise ProviderGatewayError(f"Spring Provider 网关不可用：{exception}") from exception
        if body.get("code") != 0:
            raise ProviderGatewayError(str(body.get("message") or "Provider 调用失败"))
        data = body.get("data") or {}
        output = data.get("output")
        if not isinstance(output, dict):
            raise ProviderGatewayError("Spring Provider 网关返回格式不正确")
        return output


def _int_value(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback
