import asyncio
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from app.config import get_settings
from app.workers.command_consumer import WorkflowCommandConsumer


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    consumer = WorkflowCommandConsumer(settings) if settings.worker_enabled else None
    task = asyncio.create_task(consumer.start()) if consumer else None
    try:
        yield
    finally:
        if consumer:
            await consumer.stop()
        if task:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)


app = FastAPI(title="AI Script Workflow Runner", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "workflow-runner"}


def run() -> None:
    uvicorn.run("app.main:app", host="0.0.0.0", port=8091)
