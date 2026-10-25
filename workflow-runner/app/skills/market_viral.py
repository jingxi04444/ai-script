"""Market skill: discover short, single-product category hits from social search."""

from __future__ import annotations

import asyncio
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Protocol
from zoneinfo import ZoneInfo

import httpx

from app.config import Settings, get_settings
from app.skills.base import Skill, SkillContext


SUPPORTED_PLATFORMS = {"douyin", "xiaohongshu"}
MULTI_PRODUCT_PHRASES = (
    "横评", "横测", "横向测评", "横向评测", "多品横测", "多款对比", "多款测评",
    "产品对比", "品牌对比", "型号对比", "红黑榜", "排行榜", "榜单", "大合集",
    "合集", "盘点", "怎么选", "哪个好", "哪款好", "买哪款", "选购清单",
    "选购指南", "闭眼入清单", "pk", "vs",
)
CROSS_CATEGORY_PHRASES = (
    "全品类", "跨品类", "多个品类", "多个品牌", "全屋家电", "家电合集",
    "厨房好物", "厨房家电推荐", "家电推荐", "好物清单", "好物合集", "顺便推荐",
    "还想推荐", "除了这款还有", "还有这些",
)
PRODUCT_CATEGORY_TERMS = (
    "油烟机", "吸油烟机", "抽油烟机", "集成灶", "燃气灶", "洗碗机", "冰箱",
    "洗衣机", "烘干机", "电视", "空调", "热水器", "净水器", "蒸烤箱", "烤箱",
    "微波炉", "空气炸锅", "电饭煲", "咖啡机", "扫地机器人", "吸尘器", "投影仪",
)
CATEGORY_EQUIVALENTS = (
    frozenset({"油烟机", "吸油烟机", "抽油烟机"}),
)
CATEGORY_QUALIFIER_PREFIXES = (
    "家用", "智能", "小型", "大型", "便携", "儿童", "商用", "折叠", "全自动", "多功能",
)
MULTI_PRODUCT_COUNT = re.compile(r"(?:\d+|[一二两三四五六七八九十]+)\s*款")
BUSINESS_ZONE = ZoneInfo("Asia/Shanghai")


class MarketViralSkillError(RuntimeError):
    pass


class MarketCredentialError(RuntimeError):
    pass


class AioneCommandRunner(Protocol):
    async def json(self, arguments: list[str], cookies: dict[str, str] | None = None) -> Any: ...


class AioneClient:
    def __init__(self, command: str = "aione", timeout_seconds: float = 180.0):
        self.command = command
        self.timeout_seconds = max(5.0, float(timeout_seconds))

    async def json(
        self,
        arguments: list[str],
        cookies: dict[str, str] | None = None,
    ) -> Any:
        environment = os.environ.copy()
        for platform, cookie in (cookies or {}).items():
            if platform == "douyin":
                environment["AIONE_DOUYIN_WEB_COOKIES"] = cookie
            elif platform == "xiaohongshu":
                environment["AIONE_XHS_PC_COOKIES"] = cookie
        try:
            process = await asyncio.create_subprocess_exec(
                self.command,
                *arguments,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=environment,
            )
        except FileNotFoundError as exception:
            raise MarketViralSkillError(
                "未找到 AIONE CLI，请安装 All-IN-ONE 并配置 WORKFLOW_AIONE_COMMAND"
            ) from exception
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=self.timeout_seconds
            )
        except TimeoutError as exception:
            process.kill()
            await process.communicate()
            raise MarketViralSkillError("AIONE 搜索超时") from exception
        output = stdout.decode("utf-8", errors="replace").strip()
        error = stderr.decode("utf-8", errors="replace").strip()
        if process.returncode != 0:
            raise MarketViralSkillError(
                f"AIONE 搜索失败：{_concise(error or output)}"
            )
        if not output:
            raise MarketViralSkillError("AIONE 搜索未返回数据")
        try:
            return json.loads(output)
        except json.JSONDecodeError as exception:
            raise MarketViralSkillError("AIONE 返回数据不是有效 JSON") from exception


class SpringMarketCredentialProvider:
    def __init__(
        self,
        url: str,
        token: str,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.url = url
        self.token = token
        self.transport = transport

    async def fetch(self, tenant_id: int, platform: str) -> str:
        if not self.url.strip() or not self.token.strip():
            raise MarketCredentialError(
                "未配置 Python 获取后台 Cookie 的内部网关地址或令牌"
            )
        try:
            async with httpx.AsyncClient(timeout=20, transport=self.transport) as client:
                response = await client.post(
                    self.url,
                    headers={"X-Workflow-Token": self.token},
                    json={"tenantId": tenant_id, "platform": platform},
                )
                response.raise_for_status()
                body = response.json()
        except (httpx.HTTPError, ValueError) as exception:
            raise MarketCredentialError("无法从 Spring 获取后台采集 Cookie") from exception
        if body.get("code") != 0:
            raise MarketCredentialError(str(body.get("message") or "后台采集 Cookie 未配置"))
        data = body.get("data") or {}
        cookie = str(data.get("cookie") or "").strip()
        if not cookie:
            raise MarketCredentialError("后台采集 Cookie 为空")
        return cookie


class MarketCategoryViralSkill(Skill):
    code = "market.category-viral-search"
    version = "1.0.0"

    def __init__(
        self,
        settings: Settings | None = None,
        runner: AioneCommandRunner | None = None,
        credential_provider: SpringMarketCredentialProvider | None = None,
    ):
        self.settings = settings or get_settings()
        self.runner = runner or AioneClient(
            self.settings.aione_command,
            self.settings.aione_timeout_seconds,
        )
        self.credential_provider = credential_provider or SpringMarketCredentialProvider(
            self.settings.market_credential_url,
            self.settings.provider_gateway_token,
        )

    async def execute(
        self,
        context: SkillContext,
        inputs: dict[str, Any],
        config: dict[str, Any],
    ) -> dict[str, Any]:
        category = str(config.get("category") or "").strip()
        platforms = config.get("platforms")
        result = await self.search(
            tenant_id=context.tenant_id,
            category=category,
            platforms=platforms if isinstance(platforms, list) else None,
        )
        return {**result, "nodeId": context.node_id}

    async def search(
        self,
        tenant_id: int | None,
        category: str,
        platforms: list[str] | None = None,
        cookies: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        canonical_category = canonical_category_name(category)
        if not canonical_category:
            raise ValueError("品类不能为空")
        if len(canonical_category) > 40:
            raise ValueError("品类名称不能超过 40 个字符")
        selected_platforms = [
            value for value in (platforms or ["douyin", "xiaohongshu"])
            if value in SUPPORTED_PLATFORMS
        ]
        if not selected_platforms:
            raise ValueError("至少选择一个支持平台")
        selected_platforms = list(dict.fromkeys(selected_platforms))
        if cookies is None:
            if tenant_id is None:
                raise MarketCredentialError("缺少租户上下文，无法获取后台采集 Cookie")
            cookies = {
                platform: await self.credential_provider.fetch(tenant_id, platform)
                for platform in selected_platforms
            }
        normalized_cookies = {
            platform: str(cookies.get(platform) or "").strip()
            for platform in selected_platforms
        }
        missing_cookies = [
            _platform_name(platform)
            for platform, cookie in normalized_cookies.items()
            if not cookie
        ]
        if missing_cookies:
            raise MarketViralSkillError(
                "后台尚未配置" + "、".join(missing_cookies) + "采集 Cookie"
            )
        queries = _search_queries(canonical_category)
        warnings: list[str] = []
        raw_candidates: list[dict[str, Any]] = []
        completed_requests = 0
        raw_count = 0

        for platform in selected_platforms:
            for query in queries:
                try:
                    payload = await self._search_platform(
                        platform, query, {platform: normalized_cookies[platform]}
                    )
                    items = _extract_collection(payload)
                    raw_count += len(items)
                    completed_requests += 1
                    for item in items:
                        candidate = (
                            _douyin_candidate(item, canonical_category, query)
                            if platform == "douyin"
                            else _xiaohongshu_candidate(item, canonical_category, query)
                        )
                        if candidate:
                            raw_candidates.append(candidate)
                except Exception as exception:
                    warnings.append(f"{_platform_name(platform)}「{query}」：{_concise(str(exception))}")

        if completed_requests == 0 and warnings:
            raise MarketViralSkillError("品类爆款采集失败：" + "；".join(warnings))

        candidates = _deduplicate(raw_candidates)
        if "xiaohongshu" in selected_platforms:
            candidates = await self._enrich_xiaohongshu(
                candidates, warnings, normalized_cookies["xiaohongshu"]
            )

        accepted: list[dict[str, Any]] = []
        rejected_reasons: dict[str, int] = {}
        rejected_samples: list[dict[str, str]] = []
        for candidate in candidates:
            reason = classify_candidate(candidate)
            if reason:
                rejected_reasons[reason] = rejected_reasons.get(reason, 0) + 1
                if len(rejected_samples) < 12:
                    rejected_samples.append({
                        "platform": str(candidate.get("platform") or ""),
                        "title": _truncate(str(candidate.get("title") or ""), 120),
                        "reason": reason,
                    })
                continue
            accepted.append(candidate)
        accepted.sort(key=lambda item: int(item.get("likeCount") or 0), reverse=True)
        accepted = accepted[: max(1, int(self.settings.market_viral_max_candidates))]
        return {
            "kind": "marketCategoryViralLinks",
            "skillCode": self.code,
            "category": canonical_category,
            "rawCandidateCount": raw_count,
            "candidateCount": len(candidates),
            "candidates": accepted,
            "filtered": len(candidates) - len(accepted),
            "rejectedReasons": rejected_reasons,
            "rejectedSamples": rejected_samples,
            "warnings": warnings,
        }

    async def _search_platform(
        self,
        platform: str,
        query: str,
        cookies: dict[str, str],
    ) -> Any:
        max_candidates = str(max(1, self.settings.market_viral_max_candidates))
        if platform == "douyin":
            return await self.runner.json([
                "douyin", "work", "search-some-general",
                "--query", query,
                "--num", max_candidates,
                "--sort-type", "1",
                "--publish-time", "0",
                "--content-type", "1",
                "--output", "json",
            ], cookies)
        return await self.runner.json([
            "xhs", "note", "search-some",
            "--query", query,
            "--require-num", max_candidates,
            "--sort-type-choice", "2",
            "--note-type", "1",
            "--output", "json",
        ], cookies)

    async def _enrich_xiaohongshu(
        self,
        candidates: list[dict[str, Any]],
        warnings: list[str],
        xiaohongshu_cookie: str,
    ) -> list[dict[str, Any]]:
        semaphore = asyncio.Semaphore(4)
        calls = 0
        detail_limit = max(0, int(self.settings.market_viral_xhs_detail_limit))

        async def enrich(candidate: dict[str, Any]) -> dict[str, Any]:
            nonlocal calls
            if candidate.get("platform") != "xiaohongshu" or candidate.get("durationSeconds"):
                return candidate
            if calls >= detail_limit:
                return candidate
            calls += 1
            async with semaphore:
                try:
                    payload = await self.runner.json([
                        "xhs", "note", "info",
                        "--url", str(candidate.get("sourceUrl") or ""),
                        "--output", "json",
                    ], {"xiaohongshu": xiaohongshu_cookie})
                    note = _find_note_card(payload)
                    if not isinstance(note, dict):
                        return candidate
                    interact = note.get("interact_info") if isinstance(note.get("interact_info"), dict) else {}
                    return {
                        **candidate,
                        "title": _first_non_blank(
                            _deep_text(note, {"title", "display_title"}),
                            candidate.get("title"),
                        ),
                        "authorName": _first_non_blank(
                            _deep_text(note.get("user"), {"nickname", "nick_name"}),
                            candidate.get("authorName"),
                        ),
                        "coverUrl": _first_non_blank(_first_image_url(note), candidate.get("coverUrl")),
                        "tags": _merge_tags(candidate.get("tags"), _collect_tags(note)),
                        "durationSeconds": _duration_seconds(note.get("video")) or candidate.get("durationSeconds"),
                        "likeCount": max(_count(interact, "liked_count", "like_count"), int(candidate.get("likeCount") or 0)),
                        "commentCount": max(_count(interact, "comment_count"), int(candidate.get("commentCount") or 0)),
                        "collectCount": max(_count(interact, "collected_count", "collect_count"), int(candidate.get("collectCount") or 0)),
                        "shareCount": max(_count(interact, "share_count"), int(candidate.get("shareCount") or 0)),
                    }
                except Exception as exception:
                    warnings.append(
                        f"小红书详情「{_concise(str(candidate.get('title') or ''))}」：{_concise(str(exception))}"
                    )
                    return candidate

        return await asyncio.gather(*(enrich(candidate) for candidate in candidates))

    async def validate_cookie(self, platform: str, cookie: str) -> dict[str, Any]:
        if platform not in SUPPORTED_PLATFORMS:
            raise ValueError("不支持的平台")
        if not str(cookie or "").strip():
            raise ValueError("Cookie 不能为空")
        if platform == "douyin":
            arguments = [
                "douyin", "work", "search-some-general",
                "--query", "产品测评",
                "--num", "1",
                "--sort-type", "1",
                "--publish-time", "0",
                "--content-type", "1",
                "--output", "json",
            ]
        else:
            arguments = [
                "xhs", "note", "search-some",
                "--query", "产品测评",
                "--require-num", "1",
                "--sort-type-choice", "2",
                "--note-type", "1",
                "--output", "json",
            ]
        await self.runner.json(arguments, {platform: cookie})
        return {"platform": platform, "valid": True}

    async def validate_from_backend(self, tenant_id: int, platform: str) -> dict[str, Any]:
        if platform not in SUPPORTED_PLATFORMS:
            raise ValueError("不支持的平台")
        cookie = await self.credential_provider.fetch(tenant_id, platform)
        return await self.validate_cookie(platform, cookie)


def canonical_category_name(value: str) -> str:
    category = str(value or "").strip()
    if category in {"油烟机", "吸油烟机", "抽油烟机"}:
        return "油烟机"
    return category


def category_aliases(category: str) -> tuple[str, ...]:
    value = str(category or "").strip()
    aliases = [value]
    core = value
    for prefix in CATEGORY_QUALIFIER_PREFIXES:
        if core.startswith(prefix) and len(core) > len(prefix):
            core = core[len(prefix):]
            aliases.append(core)
            break
    if canonical_category_name(value) == "油烟机":
        aliases.extend(("油烟机", "抽油烟机", "吸油烟机"))
    elif len(core) >= 4:
        aliases.extend(core[index:index + 3] for index in range(len(core) - 2))
    return tuple(dict.fromkeys(alias for alias in aliases if alias))


def _canonical_product_term(term: str) -> str:
    normalized = _normalize(term)
    for group in CATEGORY_EQUIVALENTS:
        if normalized in {_normalize(alias) for alias in group}:
            return _normalize("油烟机")
    return normalized


def classify_candidate(candidate: dict[str, Any]) -> str | None:
    text = _normalize(
        f"{candidate.get('title') or ''} {candidate.get('tags') or ''}"
    )
    aliases = [alias for alias in category_aliases(str(candidate.get("category") or "")) if alias]
    if not any(_normalize(alias) in text for alias in aliases):
        return "标题与标签未明确命中目标品类"
    for phrase in MULTI_PRODUCT_PHRASES:
        if _normalize(phrase) in text:
            return f"疑似多品横测或榜单内容：{phrase}"
    if MULTI_PRODUCT_COUNT.search(text):
        return "标题包含多款产品数量"
    for phrase in CROSS_CATEGORY_PHRASES:
        if _normalize(phrase) in text:
            return f"疑似跨品类推荐：{phrase}"
    matched_categories = {
        _canonical_product_term(term) for term in PRODUCT_CATEGORY_TERMS
        if _normalize(term) in text
    }
    target_categories = {
        _canonical_product_term(alias) for alias in aliases
        if _normalize(alias) in text
    }
    if matched_categories - target_categories:
        return "正文同时出现多个商品品类"
    return None


def _search_queries(category: str) -> list[str]:
    queries = [category, f"{category}测评"]
    if category == "油烟机":
        queries.append("抽油烟机测评")
    return list(dict.fromkeys(queries))[:3]


def _extract_collection(payload: Any) -> list[Any]:
    if isinstance(payload, list):
        if len(payload) >= 3 and isinstance(payload[0], bool):
            if not payload[0]:
                raise MarketViralSkillError(
                    f"平台搜索失败：{_concise(str(payload[1] or 'Cookie 或登录态可能已失效'))}"
                )
            return payload[2] if isinstance(payload[2], list) else []
        return payload
    if not isinstance(payload, dict):
        return []
    data = payload.get("data")
    if isinstance(data, list):
        return data
    if isinstance(payload.get("items"), list):
        return payload["items"]
    if isinstance(data, dict):
        if isinstance(data.get("items"), list):
            return data["items"]
        if isinstance(data.get("notes"), list):
            return data["notes"]
    return []


def _douyin_candidate(item: Any, category: str, query: str) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None
    raw = item.get("aweme_info") if isinstance(item.get("aweme_info"), dict) else item
    if isinstance(raw.get("images"), list) and raw["images"]:
        return None
    external_id = str(raw.get("aweme_id") or raw.get("item_id") or "").strip()
    if not external_id:
        return None
    statistics = raw.get("statistics") if isinstance(raw.get("statistics"), dict) else {}
    video = raw.get("video") if isinstance(raw.get("video"), dict) else {}
    author = raw.get("author") if isinstance(raw.get("author"), dict) else {}
    return {
        "platform": "douyin",
        "externalId": external_id,
        "category": category,
        "title": _first_non_blank(raw.get("desc"), raw.get("title")),
        "authorName": _first_non_blank(author.get("nickname"), author.get("name")),
        "sourceUrl": f"https://www.douyin.com/video/{external_id}",
        "coverUrl": _first_non_blank(
            _first_image_url(video.get("cover")),
            _first_image_url(video.get("origin_cover")),
            _first_image_url(raw.get("cover")),
        ),
        "tags": _collect_tags(raw),
        "durationSeconds": _duration_seconds(video),
        "likeCount": _count(statistics, "digg_count", "like_count"),
        "commentCount": _count(statistics, "comment_count"),
        "collectCount": _count(statistics, "collect_count"),
        "shareCount": _count(statistics, "share_count"),
        "publishedAt": _epoch_time(raw.get("create_time"), seconds=True),
        "discoveryQuery": query,
    }


def _xiaohongshu_candidate(item: Any, category: str, query: str) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None
    note = item.get("note_card") if isinstance(item.get("note_card"), dict) else item.get("note")
    if not isinstance(note, dict):
        note = item
    external_id = str(item.get("id") or item.get("note_id") or note.get("id") or note.get("note_id") or "").strip()
    if not external_id:
        return None
    note_type = str(note.get("type") or "").lower()
    if note_type in {"normal", "image"}:
        return None
    source_url = _first_non_blank(item.get("url"), item.get("note_url"), note.get("url"), note.get("note_url"))
    if not source_url:
        source_url = f"https://www.xiaohongshu.com/explore/{external_id}"
        token = _first_non_blank(item.get("xsec_token"))
        if token:
            source_url += f"?xsec_token={token}&xsec_source=pc_search"
    interact = note.get("interact_info") if isinstance(note.get("interact_info"), dict) else {}
    video = note.get("video") if isinstance(note.get("video"), dict) else {}
    return {
        "platform": "xiaohongshu",
        "externalId": external_id,
        "category": category,
        "title": _first_non_blank(note.get("title"), note.get("display_title"), note.get("desc")),
        "authorName": _deep_text(note.get("user"), {"nickname", "nick_name"}),
        "sourceUrl": source_url,
        "coverUrl": _first_image_url(note),
        "tags": _collect_tags(note),
        "durationSeconds": _duration_seconds(video),
        "likeCount": _count(interact, "liked_count", "like_count"),
        "commentCount": _count(interact, "comment_count"),
        "collectCount": _count(interact, "collected_count", "collect_count"),
        "shareCount": _count(interact, "share_count"),
        "publishedAt": _epoch_time(note.get("time"), seconds=False),
        "discoveryQuery": query,
    }


def _deduplicate(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique: dict[str, dict[str, Any]] = {}
    for candidate in candidates:
        key = f"{candidate.get('platform')}:{candidate.get('externalId')}"
        current = unique.get(key)
        if current is None or int(candidate.get("likeCount") or 0) > int(current.get("likeCount") or 0):
            unique[key] = candidate
    return list(unique.values())


def _duration_seconds(node: Any) -> int | None:
    value = _find_number(node, {"duration", "duration_seconds", "duration_ms"}, depth=0)
    if value is None or value <= 0:
        return None
    if value > 300:
        value /= 1000
    return max(1, round(value))


def _find_number(node: Any, keys: set[str], depth: int) -> float | None:
    if depth > 5 or node is None:
        return None
    if isinstance(node, dict):
        for key in keys:
            if key in node:
                parsed = _number(node[key])
                if parsed is not None:
                    return parsed
        for value in node.values():
            found = _find_number(value, keys, depth + 1)
            if found is not None:
                return found
    elif isinstance(node, list):
        for value in node:
            found = _find_number(value, keys, depth + 1)
            if found is not None:
                return found
    return None


def _count(node: Any, *keys: str) -> int:
    if not isinstance(node, dict):
        return 0
    for key in keys:
        parsed = _number(node.get(key))
        if parsed is not None:
            return max(0, round(parsed))
    return 0


def _number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value or "").replace(",", "").replace("+", "").strip().lower()
    if not text:
        return None
    multiplier = 1.0
    for suffix, factor in (("亿", 100_000_000), ("万", 10_000), ("w", 10_000), ("千", 1_000), ("k", 1_000)):
        if text.endswith(suffix):
            multiplier = factor
            text = text[:-len(suffix)]
            break
    try:
        return float(text.strip()) * multiplier
    except ValueError:
        return None


def _first_image_url(node: Any) -> str:
    if isinstance(node, str):
        return node.strip()
    if isinstance(node, list):
        for value in node:
            url = _first_image_url(value)
            if url:
                return url
        return ""
    if not isinstance(node, dict):
        return ""
    direct = _first_non_blank(
        node.get("url_default"), node.get("urlDefault"), node.get("url_pre"), node.get("url")
    )
    if direct:
        return direct
    urls = node.get("url_list")
    if isinstance(urls, list):
        for value in urls:
            if isinstance(value, str) and value.strip():
                return value.strip()
    for key in ("image_list", "images", "cover", "origin_cover", "info_list"):
        url = _first_image_url(node.get(key))
        if url:
            return url
    return ""


def _collect_tags(node: Any, depth: int = 0) -> str:
    values: list[str] = []
    if depth > 5 or node is None:
        return ""
    if isinstance(node, dict):
        name = _first_non_blank(node.get("name"), node.get("tag_name"), node.get("hashtag_name"), node.get("tag"))
        if name and len(name) <= 40 and name not in values:
            values.append(name)
        for key in ("cha_list", "text_extra", "tag_list", "tags"):
            value = node.get(key)
            if value is not None:
                nested = _collect_tags(value, depth + 1)
                if nested:
                    values.extend(value for value in nested.split(",") if value not in values)
    elif isinstance(node, list):
        for value in node:
            nested = _collect_tags(value, depth + 1)
            if nested:
                values.extend(value for value in nested.split(",") if value not in values)
    return ",".join(values[:30])


def _merge_tags(*values: Any) -> str:
    tags: list[str] = []
    for value in values:
        for tag in str(value or "").split(","):
            tag = tag.strip()
            if tag and tag not in tags:
                tags.append(tag)
    return ",".join(tags[:30])


def _find_note_card(node: Any) -> Any:
    if node is None:
        return None
    if isinstance(node, dict):
        if isinstance(node.get("note_card"), dict):
            return node["note_card"]
        if "video" in node and any(key in node for key in ("title", "desc", "interact_info")):
            return node
        for value in node.values():
            found = _find_note_card(value)
            if found is not None:
                return found
    elif isinstance(node, list):
        for value in node:
            found = _find_note_card(value)
            if found is not None:
                return found
    return None


def _deep_text(node: Any, keys: set[str], depth: int = 0) -> str:
    if depth > 5 or node is None:
        return ""
    if isinstance(node, dict):
        for key in keys:
            value = node.get(key)
            if isinstance(value, (str, int, float)) and str(value).strip():
                return str(value).strip()
        for value in node.values():
            found = _deep_text(value, keys, depth + 1)
            if found:
                return found
    elif isinstance(node, list):
        for value in node:
            found = _deep_text(value, keys, depth + 1)
            if found:
                return found
    return ""


def _epoch_time(value: Any, seconds: bool) -> str | None:
    parsed = _number(value)
    if parsed is None or parsed <= 0:
        return None
    timestamp = parsed if seconds or parsed < 10_000_000_000 else parsed / 1000
    try:
        moment = datetime.fromtimestamp(timestamp, tz=timezone.utc).astimezone(BUSINESS_ZONE)
    except (OverflowError, OSError, ValueError):
        return None
    return moment.isoformat()


def _normalize(value: str) -> str:
    return re.sub(r"[\s\W_]+", "", value.lower(), flags=re.UNICODE)


def _first_non_blank(*values: Any) -> str:
    for value in values:
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def _platform_name(platform: str) -> str:
    return "抖音" if platform == "douyin" else "小红书"


def _int_value(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _truncate(value: str, limit: int) -> str:
    return value if len(value) <= limit else value[:limit]


def _concise(value: str, limit: int = 180) -> str:
    single_line = re.sub(r"\s+", " ", str(value or "")).strip()
    return _truncate(single_line or "未知错误", limit)
