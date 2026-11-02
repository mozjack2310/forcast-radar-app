import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any, AsyncGenerator, Final, Optional
from fastapi import APIRouter, Request, Response
from fastapi.responses import StreamingResponse

import app.core.redis as core_redis

router = APIRouter()
logger = logging.getLogger("forrad.alerts")


@dataclass
class SSERouterConfig:
    """Configuration parameters for Server-Sent Events router delivery."""
    target_area: str = "AL"
    cache_key: str = "forrad:alerts:active"
    pubsub_channel: str = "forrad:alerts:stream"
    pubsub_poll_timeout_seconds: float = 1.0
    keepalive_interval_seconds: float = 15.0
    media_type: str = "text/event-stream"


async def alert_event_generator(
    request: Request,
    redis_client: Any = None,
    sse_config: Optional[SSERouterConfig] = None,
) -> AsyncGenerator[str, None]:
    """
    Asynchronous event generator yielding SSE frames:
    1. Immediate 'initial_state' snapshot from Redis cache.
    2. Streaming 'alert_update' frames on Redis Pub/Sub events.
    3. Periodic ': keep-alive\\n\\n' comments to prevent proxy timeouts.
    """
    config = sse_config or SSERouterConfig()
    client = redis_client if redis_client is not None else core_redis.get_redis_client()
    if not client:
        logger.error("[SSE Stream] Redis client unavailable.")
        yield f"event: error\ndata: {json.dumps({'error': 'Redis cache unavailable'})}\n\n"
        return

    # Step 1: Emit immediate initial state snapshot upon connection
    try:
        cached = await client.get(config.cache_key)
        if isinstance(cached, bytes):
            initial_data = cached.decode("utf-8")
        else:
            initial_data = cached if cached else "[]"
        yield f"event: initial_state\ndata: {initial_data}\n\n"
    except Exception as exc:
        logger.error("[SSE Stream] Failed to read initial state: %s", exc)
        yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n"

    # Step 2: Subscribe to Pub/Sub channel for live delta emissions
    pubsub = client.pubsub()
    await pubsub.subscribe(config.pubsub_channel)
    logger.info("[SSE Stream] Client subscribed to channel %s", config.pubsub_channel)

    try:
        while True:
            if await request.is_disconnected():
                logger.info("[SSE Stream] Client disconnected.")
                break

            try:
                msg = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=config.pubsub_poll_timeout_seconds,
                )
                if msg and msg.get("data"):
                    payload = msg["data"]
                    data = payload.decode("utf-8") if isinstance(payload, bytes) else str(payload)
                    yield f"event: alert_update\ndata: {data}\n\n"
                else:
                    yield ": keep-alive\n\n"
            except asyncio.TimeoutError:
                yield ": keep-alive\n\n"
            except asyncio.CancelledError:
                raise
            except Exception as stream_err:
                logger.error("[SSE Stream] Pubsub read error: %s", stream_err)
                await asyncio.sleep(0.1)
    finally:
        try:
            await pubsub.unsubscribe(config.pubsub_channel)
            await pubsub.close()
            logger.info("[SSE Stream] Pubsub subscription cleaned up cleanly.")
        except Exception as cleanup_err:
            logger.error("[SSE Stream] Pubsub teardown error: %s", cleanup_err)


@router.get("/active")
async def get_active_alerts() -> Response:
    """REST hydration endpoint returning current active alert snapshot."""
    client = core_redis.get_redis_client()
    if not client:
        return Response(content="[]", media_type="application/json")
    cached = await client.get("forrad:alerts:active")
    if isinstance(cached, bytes):
        content = cached.decode("utf-8")
    else:
        content = cached or "[]"
    return Response(content=content, media_type="application/json")


@router.get("/stream")
async def stream_active_alerts(request: Request) -> StreamingResponse:
    """Server-Sent Events endpoint with unbuffered upstream headers."""
    headers = {
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        alert_event_generator(request),
        headers=headers,
        media_type="text/event-stream",
    )
