from redis.asyncio import Redis

from app.contracts import WorkflowEvent


class WorkflowEventPublisher:
    def __init__(self, redis: Redis, stream: str):
        self.redis = redis
        self.stream = stream

    async def publish(self, event: WorkflowEvent) -> None:
        payload = event.model_dump_json(by_alias=True, exclude_none=True)
        await self.redis.xadd(self.stream, {"payload": payload}, maxlen=50_000, approximate=True)
