import asyncio
import json
import logging
import socket
import uuid
from datetime import datetime, timezone
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import ResponseError

from app.config import Settings, get_settings
from app.contracts import WorkflowCommand
from app.engine.executor import WorkflowExecutionFailed, WorkflowExecutor
from app.events import WorkflowEventPublisher
from app.providers.spring_gateway import SpringProviderGateway
from app.repositories.run_repository import WorkflowRunRepository
from app.skills.registry import SkillRegistry

log = logging.getLogger(__name__)


class WorkflowCommandConsumer:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis = Redis.from_url(settings.redis_url, decode_responses=True)
        self.consumer_name = f"{settings.consumer_name}-{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
        provider_gateway = SpringProviderGateway(
            settings.provider_gateway_url,
            settings.provider_gateway_token,
            settings.provider_gateway_timeout_seconds,
        ) if settings.provider_gateway_enabled else None
        self.executor = WorkflowExecutor(
            repository=WorkflowRunRepository(settings.database_url),
            events=WorkflowEventPublisher(self.redis, settings.events_stream),
            skills=SkillRegistry(
                settings.simulation_delay_ms,
                provider_gateway=provider_gateway,
                max_concurrency=settings.max_concurrency,
            ),
            max_concurrency=settings.max_concurrency,
            max_node_attempts=settings.node_max_attempts,
            worker_id=self.consumer_name,
        )
        self._stopping = False

    async def start(self) -> None:
        await self._ensure_group()
        log.info("Workflow consumer started: %s", self.consumer_name)
        while not self._stopping:
            await self._recover_pending()
            messages = await self.redis.xreadgroup(
                groupname=self.settings.consumer_group,
                consumername=self.consumer_name,
                streams={self.settings.commands_stream: ">"},
                count=4,
                block=3000,
            )
            for _, entries in messages:
                for message_id, fields in entries:
                    await self._handle(message_id, fields)

    async def stop(self) -> None:
        self._stopping = True
        await self.redis.aclose()

    async def _ensure_group(self) -> None:
        try:
            await self.redis.xgroup_create(
                self.settings.commands_stream,
                self.settings.consumer_group,
                id="0-0",
                mkstream=True,
            )
        except ResponseError as exception:
            if "BUSYGROUP" not in str(exception):
                raise

    async def _recover_pending(self) -> None:
        claimed = await self.redis.xautoclaim(
            self.settings.commands_stream,
            self.settings.consumer_group,
            self.consumer_name,
            min_idle_time=60_000,
            start_id="0-0",
            count=4,
        )
        entries = claimed[1] if len(claimed) > 1 else []
        for message_id, fields in entries:
            await self._handle(message_id, fields)

    async def _handle(self, message_id: str, fields: dict[str, Any]) -> None:
        raw_payload = fields.get("payload")
        try:
            if not raw_payload:
                raise ValueError("workflow command payload is empty")
            command = WorkflowCommand.model_validate(json.loads(raw_payload))
            if command.type == "START_WORKFLOW":
                await self.executor.execute(command.run_id, command.tenant_id)
            elif command.type == "CANCEL_WORKFLOW":
                log.info("Cancel request recorded for workflow run %s", command.run_id)
            await self.redis.xack(
                self.settings.commands_stream,
                self.settings.consumer_group,
                message_id,
            )
        except WorkflowExecutionFailed as exception:
            log.warning("Workflow reached terminal failure, message_id=%s: %s", message_id, exception)
            await self._move_to_dead_letter(message_id, raw_payload, 1, exception)
        except Exception as exception:
            log.exception("Workflow command failed, message_id=%s", message_id)
            retry_count = _int_value(fields.get("retryCount"), 0) + 1
            if retry_count >= self.settings.command_max_attempts:
                await self._move_to_dead_letter(message_id, raw_payload, retry_count, exception)
            else:
                await self.redis.xadd(self.settings.commands_stream, {
                    "payload": raw_payload or "",
                    "retryCount": str(retry_count),
                    "previousMessageId": message_id,
                })
                await self.redis.xack(
                    self.settings.commands_stream,
                    self.settings.consumer_group,
                    message_id,
                )

    async def _move_to_dead_letter(
        self,
        message_id: str,
        raw_payload: str | None,
        retry_count: int,
        exception: Exception,
    ) -> None:
        await self.redis.xadd(self.settings.commands_dead_letter_stream, {
            "payload": raw_payload or "",
            "sourceMessageId": message_id,
            "retryCount": str(retry_count),
            "error": str(exception)[:1000],
            "failedAt": datetime.now(timezone.utc).isoformat(),
        })
        await self.redis.xack(
            self.settings.commands_stream,
            self.settings.consumer_group,
            message_id,
        )


async def serve() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    consumer = WorkflowCommandConsumer(get_settings())
    try:
        await consumer.start()
    finally:
        await consumer.stop()


def run() -> None:
    asyncio.run(serve())


def _int_value(value: Any, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


if __name__ == "__main__":
    run()
