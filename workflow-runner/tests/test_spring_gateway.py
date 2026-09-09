import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.providers.spring_gateway import SpringProviderGateway
from app.skills.base import SkillContext


class SpringProviderGatewayTest(unittest.IsolatedAsyncioTestCase):
    async def test_polls_async_provider_until_asset_is_ready(self):
        requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            if request.url.path.endswith("/execute"):
                output = {
                    "status": "pending",
                    "taskId": "task-1",
                    "providerId": "9",
                    "pollIntervalMs": 1,
                    "maxWaitMs": 5000,
                }
            elif len(requests) == 2:
                output = {
                    "status": "pending",
                    "taskId": "task-1",
                    "providerId": "9",
                    "pollIntervalMs": 1,
                    "maxWaitMs": 5000,
                }
            else:
                output = {"status": "success", "assetUrl": "https://cdn.example/video.mp4"}
            return httpx.Response(200, json={"code": 0, "message": "success", "data": {"output": output}})

        gateway = SpringProviderGateway(
            "http://spring/api/internal/workflow/providers/execute",
            "test-token",
            transport=httpx.MockTransport(handler),
        )
        context = SkillContext(run_id=1, tenant_id=2, project_id=3, node_id="video-1")

        with patch("app.providers.spring_gateway.asyncio.sleep", new=AsyncMock()):
            output = await gateway.execute(context, "video", {"upstream": {}}, {"prompt": "镜头"})

        self.assertEqual(output["assetUrl"], "https://cdn.example/video.mp4")
        self.assertEqual(len(requests), 3)
        self.assertTrue(requests[1].url.path.endswith("/poll"))
