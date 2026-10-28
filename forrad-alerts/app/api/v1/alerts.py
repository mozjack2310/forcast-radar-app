import asyncio
import json
import logging
from typing import Any, AsyncGenerator, List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

import app.core.redis as core_redis
from app.models.forrad_schemas import ForRadAlert
from app.services.nws_fetcher import (
    DEFAULT_FETCHER_CONFIG,
    sync_alerts_to_redis,
)

logger = logging.getLogger("forrad.alerts_router")
router = APIRouter()


def get_redis_dependency() -> Any:
    return core_redis.get_redis_client()


@router.get("/active", response_model=List[ForRadAlert])
async def get_active_alerts(
    redis_client: Any = Depends(get_redis_dependency),
) -> List[ForRadAlert]:
    """
    Plane 1: Synchronous REST Snapshot with Cache-Aside fallback.
    """
    if redis_client:
        try:
            cached_raw = await redis_client.get(DEFAULT_FETCHER_CONFIG.cache_key)
            if cached_raw:
                parsed = json.loads(cached_raw)
                return [ForRadAlert.model_validate(item) for item in parsed]
        except Exception as exc:
            logger.warning(f"Redis cache read failed, falling back to live NWS fetch: {exc}")

    try:
        return await sync_alerts_to_redis(target_area="AL", redis_client=redis_client)
    except Exception as exc:
        logger.error(f"Upstream NWS fetch failed on cache miss: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve active alerts from cache or upstream NWS provider.",
        )


async def alert_event_generator(
    request: Request,
    redis_client: Any,
) -> AsyncGenerator[str, None]:
    """
    Plane 2: Asynchronous SSE generator backed by Redis Pub/Sub.
    Flushes initial cached state immediately upon connection, then yields live updates.
    """
    if not redis_client:
        yield 'event: error\ndata: {"error": "Redis backplane unavailable"}\n\n'
        return

    pubsub = redis_client.pubsub()
    await pubsub.subscribe(DEFAULT_FETCHER_CONFIG.pubsub_channel)
    logger.info("SSE client subscribed to forrad:alerts:stream")

    try:
        cached_raw = await redis_client.get(DEFAULT_FETCHER_CONFIG.cache_key)
        if not cached_raw:
            try:
                hydrated = await sync_alerts_to_redis(target_area="AL", redis_client=redis_client)
                cached_str = json.dumps([a.model_dump(mode="json") for a in hydrated])
            except Exception as exc:
                logger.warning(f"Initial SSE hydration fetch failed: {exc}")
                cached_str = "[]"
        else:
            cached_str = (
                cached_raw.decode("utf-8")
                if isinstance(cached_raw, bytes)
                else cached_raw
            )

        yield f"event: initial_state\ndata: {cached_str}\n\n"

        while True:
            if await request.is_disconnected():
                logger.info("SSE client disconnected cleanly.")
                break

            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1.0,
            )
            if message and message.get("type") == "message":
                raw_data = message["data"]
                payload_str = (
                    raw_data.decode("utf-8")
                    if isinstance(raw_data, bytes)
                    else str(raw_data)
                )
                yield f"event: alert_update\ndata: {payload_str}\n\n"
                continue

            yield ": keep-alive\n\n"
            await asyncio.sleep(15)

    except asyncio.CancelledError:
        logger.info("SSE generator task cancelled during shutdown/disconnect.")
    except Exception as exc:
        logger.error(f"Unexpected exception in SSE stream loop: {exc}")
    finally:
        await pubsub.unsubscribe(DEFAULT_FETCHER_CONFIG.pubsub_channel)
        await pubsub.close()
        logger.info("Closed Redis Pub/Sub subscription for SSE client.")


@router.get("/stream")
async def stream_alerts(
    request: Request,
    redis_client: Any = Depends(get_redis_dependency),
) -> StreamingResponse:
    """
    Public Server-Sent Events endpoint for real-time NWS alert streaming.
    """
    return StreamingResponse(
        alert_event_generator(request, redis_client),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream; charset=utf-8",
        },
    )
