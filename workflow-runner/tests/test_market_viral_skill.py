import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from app.skills.base import SkillContext
from app.skills.market_viral import (
    MarketCategoryViralSkill,
    MarketViralSkillError,
    SpringMarketCredentialProvider,
    canonical_category_name,
    classify_candidate,
)
from app.skills.registry import SkillRegistry


class FakeAioneRunner:
    def __init__(self):
        self.calls = []

    async def json(self, arguments, cookies=None):
        self.calls.append((arguments, cookies or {}))
        if arguments[:3] == ["douyin", "work", "search-some-general"]:
            return [
                {
                    "aweme_info": {
                        "aweme_id": "d-1",
                        "desc": "用了三个月的油烟机实测",
                        "create_time": 1_782_000_000,
                        "author": {"nickname": "厨房作者"},
                        "statistics": {"digg_count": 12_000, "comment_count": 80},
                        "video": {
                            "duration": 47_000,
                            "cover": {"url_list": ["https://cdn.example/d1.jpg"]},
                        },
                    }
                },
                {
                    "aweme_info": {
                        "aweme_id": "d-2",
                        "desc": "3款油烟机横测",
                        "statistics": {"digg_count": 99_000},
                        "video": {"duration": 51_000},
                    }
                },
            ]
        if arguments[:3] == ["xhs", "note", "search-some"]:
            return [
                True,
                "success",
                [{
                    "id": "x-1",
                    "xsec_token": "token",
                    "note_card": {
                        "type": "video",
                        "title": "小厨房吸油烟机使用一年",
                        "desc": "单品长期体验",
                        "user": {"nickname": "家居作者"},
                        "interact_info": {"liked_count": "2.3万", "comment_count": "320"},
                        "video": {"duration": 58_000},
                        "image_list": [{"url_default": "https://cdn.example/x1.jpg"}],
                        "tag_list": [{"name": "吸油烟机"}],
                    },
                }],
            ]
        raise AssertionError(f"unexpected arguments: {arguments}")


class FakeCredentialProvider:
    async def fetch(self, tenant_id, platform):
        return f"{platform}-cookie-{tenant_id}"


class MarketViralSkillTest(unittest.IsolatedAsyncioTestCase):
    async def test_skill_searches_normalizes_filters_and_sorts(self):
        settings = Settings(
            aione_command="aione",
            market_viral_max_candidates=20,
            market_viral_xhs_detail_limit=5,
        )
        runner = FakeAioneRunner()
        output = await MarketCategoryViralSkill(settings, runner).search(
            2, "吸油烟机", ["douyin", "xiaohongshu"],
            cookies={"douyin": "d-cookie", "xiaohongshu": "x-cookie"},
        )

        self.assertEqual(output["category"], "油烟机")
        self.assertEqual([item["externalId"] for item in output["candidates"]], ["x-1", "d-1"])
        self.assertEqual(output["candidates"][0]["likeCount"], 23_000)
        self.assertEqual(output["candidates"][0]["sourceUrl"], "https://www.xiaohongshu.com/explore/x-1?xsec_token=token&xsec_source=pc_search")
        self.assertEqual(output["filtered"], 1)
        self.assertIn("疑似多品横测或榜单内容", " ".join(output["rejectedReasons"]))
        self.assertGreaterEqual(len(runner.calls), 6)
        self.assertEqual(runner.calls[0][1]["douyin"], "d-cookie")
        self.assertTrue(all("--filter-duration" not in args for args, _ in runner.calls))

    async def test_skill_can_run_as_workflow_skill(self):
        skill = SkillRegistry(simulation_delay_ms=0).resolve(
            "categorySkill", "market.category-viral-search"
        )
        self.assertEqual(skill.code, "market.category-viral-search")

    async def test_execute_returns_node_lineage(self):
        settings = Settings(
            aione_command="aione",
            market_viral_max_candidates=20,
            market_viral_xhs_detail_limit=5,
        )
        output = await MarketCategoryViralSkill(
            settings, FakeAioneRunner(), FakeCredentialProvider()
        ).execute(
            SkillContext(run_id=1, tenant_id=2, project_id=3, node_id="market-1"),
            {},
            {"category": "油烟机", "platforms": ["douyin"]},
        )
        self.assertEqual(output["nodeId"], "market-1")
        self.assertEqual(output["skillCode"], "market.category-viral-search")

    async def test_credential_provider_fetches_cookie_from_spring(self):
        requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(200, json={
                "code": 0,
                "message": "success",
                "data": {"platform": "douyin", "cookie": "backend-cookie"},
            })

        provider = SpringMarketCredentialProvider(
            "http://spring/internal-credentials",
            "gateway-token",
            transport=httpx.MockTransport(handler),
        )
        cookie = await provider.fetch(7, "douyin")

        self.assertEqual(cookie, "backend-cookie")
        self.assertEqual(requests[0].headers["X-Workflow-Token"], "gateway-token")
        self.assertIn(b'"tenantId":7', requests[0].content)

    def test_classifier_rejects_long_cross_category_and_multi_product(self):
        base = {
            "category": "油烟机",
            "title": "这台油烟机实测",
            "tags": "单品测评",
            "durationSeconds": 47,
        }
        self.assertIsNone(classify_candidate(base))
        self.assertIsNone(classify_candidate({**base, "durationSeconds": 61}))
        self.assertIsNone(classify_candidate({**base, "durationSeconds": None}))
        self.assertIsNone(classify_candidate({
            "category": "空调",
            "title": "这台空调省电又安静",
            "tags": "空调,家电",
        }))
        self.assertIsNone(classify_candidate({
            "category": "平滑板车",
            "title": "儿童滑板车开箱实测",
            "tags": "滑板车,儿童出行",
        }))
        self.assertIn(
            "多品",
            classify_candidate({**base, "title": "油烟机和燃气灶怎么选"}),
        )
        self.assertIn(
            "跨品类",
            classify_candidate({**base, "tags": "全屋家电,油烟机"}),
        )

    def test_category_alias_is_canonical_for_market_storage(self):
        self.assertEqual(canonical_category_name("抽油烟机"), "油烟机")
        self.assertEqual(canonical_category_name("咖啡机"), "咖啡机")


class MarketSkillEndpointTest(unittest.TestCase):
    def test_endpoint_rejects_when_token_is_not_configured(self):
        settings = Settings(worker_enabled=False, provider_gateway_token="")
        with patch("app.main.get_settings", return_value=settings):
            response = TestClient(app).post(
                "/api/internal/skills/market-category-viral-search/execute",
                json={"tenantId": 2, "category": "油烟机"},
            )
        self.assertEqual(response.status_code, 503)

    def test_endpoint_requires_matching_internal_token(self):
        settings = Settings(worker_enabled=False, provider_gateway_token="expected")
        with patch("app.main.get_settings", return_value=settings):
            response = TestClient(app).post(
                "/api/internal/skills/market-category-viral-search/execute",
                headers={"X-Workflow-Token": "wrong"},
                json={"tenantId": 2, "category": "油烟机"},
            )
        self.assertEqual(response.status_code, 401)

    def test_endpoint_returns_skill_output_for_spring(self):
        settings = Settings(worker_enabled=False, provider_gateway_token="expected")
        skill = AsyncMock()
        skill.search.return_value = {
            "skillCode": "market.category-viral-search",
            "category": "油烟机",
            "candidates": [],
        }
        with patch("app.main.get_settings", return_value=settings), patch(
            "app.main.MarketCategoryViralSkill", return_value=skill
        ):
            response = TestClient(app).post(
                "/api/internal/skills/market-category-viral-search/execute",
                headers={"X-Workflow-Token": "expected"},
                json={
                    "tenantId": 2,
                    "category": "吸油烟机",
                    "platforms": ["douyin"],
                },
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["code"], 0)
        self.assertEqual(response.json()["data"]["skillCode"], "market.category-viral-search")

    def test_cookie_validation_endpoint_returns_failure_as_observable_state(self):
        settings = Settings(worker_enabled=False, provider_gateway_token="expected")
        skill = AsyncMock()
        skill.validate_from_backend.side_effect = MarketViralSkillError("Cookie 已失效")
        with patch("app.main.get_settings", return_value=settings), patch(
            "app.main.MarketCategoryViralSkill", return_value=skill
        ):
            response = TestClient(app).post(
                "/api/internal/skills/market-category-viral-search/validate-cookie",
                headers={"X-Workflow-Token": "expected"},
                json={"tenantId": 2, "platform": "douyin"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["data"]["valid"])
        self.assertIn("失效", response.json()["data"]["error"])


if __name__ == "__main__":
    unittest.main()
