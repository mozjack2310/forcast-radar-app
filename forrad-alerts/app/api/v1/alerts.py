import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any, AsyncGenerator, Dict, Final, List
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


# ==============================================================================
# DATA & STREAMING CONFIGURATION CONSTANTS (Isolated from Router Logic)
# ==============================================================================
@dataclass(frozen=True)
class SSERouterConfig:
    target_area: str = "AL"
    pubsub_poll_timeout_seconds: float = 1.0
    keepalive_interval_seconds: float = 15.0
    keepalive_frame: str = ": keep-alive\n\n"
    redis_unavailable_frame: str = (
        'event: error\ndata: {"error": "Redis backplane unavailable"}\n\n'
    )


DEFAULT_SSE_CONFIG: Final[SSERouterConfig] = SSERouterConfig()

SSE_RESPONSE_HEADERS: Final[Dict[str, str]] = {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "Content-Type": "text/event-stream; charset=utf-8",
}


# ==============================================================================
# INTERNAL STREAMING HELPERS (Zero Deep Nesting)
# ==============================================================================
def get_redis_dependency() -> Any:
    return core_redis.get_redis_client()


def _decode_payload(raw_data: Any) -> str:
    if isinstance(raw_data, bytes):
        return raw_data.decode("utf-8")
    return str(raw_data)


def _format_sse_event(event_name: str, data_json: str) -> str:
    return f"event: {event_name}\ndata: {data_json}\n\n"


async def _resolve_initial_state_json(
    redis_client: Any,
    target_area: str,
) -> str:
    """
    Reads the active alerts snapshot from Redis, or performs an on-demand
    Cache-Aside hydration if the key is cold.
    """
    cached_raw = await redis_client.get(DEFAULT_FETCHER_CONFIG.cache_key)
    if cached_raw:
        return _decode_payload(cached_raw)

    try:
        hydrated = await sync_alerts_to_redis(
            target_area=target_area,
            redis_client=redis_client,
        )
        return json.dumps([alert.model_dump(mode="json") for alert in hydrated])
    except Exception as exc:
        logger.warning("Initial SSE hydration fetch failed: %s", exc)
        return "[]"


# ==============================================================================
# PLANE 1 (REST SNAPSHOT) & PLANE 2 (SSE STREAM) ENDPOINTS
# ==============================================================================
@router.get("/active", response_model=List[ForRadAlert])
async def get_active_alerts(
    redis_client: Any = Depends(get_redis_dependency),
) -> List[ForRadAlert]:
    """
    Plane 1: Synchronous REST Snapshot with 300s Cache-Aside fallback.
    """
    if redis_client:
        try:
            cached_raw = await redis_client.get(DEFAULT_FETCHER_CONFIG.cache_key)
            if cached_raw:
                parsed = json.loads(_decode_payload(cached_raw))
                return [ForRadAlert.model_validate(item) for item in parsed]
        except Exception as exc:
            logger.warning("Redis cache read failed, falling back to live NWS fetch: %s", exc)

    try:
        return await sync_alerts_to_redis(
            target_area=DEFAULT_SSE_CONFIG.target_area,
            redis_client=redis_client,
        )
    except Exception as exc:
        logger.error("Upstream NWS fetch failed on cache miss: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve active alerts from cache or upstream NWS provider.",
        ) from exc


async def alert_event_generator(
    request: Request,
    redis_client: Any,
    sse_config: SSERouterConfig = DEFAULT_SSE_CONFIG,
) -> AsyncGenerator[str, None]:
    """
    Plane 2: Asynchronous SSE generator backed by Redis Pub/Sub (forrad:alerts:stream).
    Flushes initial cached state immediately upon connection, yields real-time delta
    updates, and emits a 15-second keepalive heartbeat.
    """
    if not redis_client:
        yield sse_config.redis_unavailable_frame
        return

    pubsub = redis_client.pubsub()
    await pubsub.subscribe(DEFAULT_FETCHER_CONFIG.pubsub_channel)
    logger.info("SSE client subscribed to %s", DEFAULT_FETCHER_CONFIG.pubsub_channel)

    try:
        initial_json = await _resolve_initial_state_json(
            redis_client=redis_client,
            target_area=sse_config.target_area,
        )
        yield _format_sse_event("initial_state", initial_json)

        elapsed_since_ping = 0.0
        while True:
            if await request.is_disconnected():
                logger.info("SSE client disconnected cleanly.")
                break

            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=sse_config.pubsub_poll_timeout_seconds,
            )
            if message and message.get("type") == "message":
                payload_str = _decode_payload(message["data"])
                yield _format_sse_event("alert_update", payload_str)
                elapsed_since_ping = 0.0
                continue

            await asyncio.sleep(sse_config.pubsub_poll_timeout_seconds)
            elapsed_since_ping += sse_config.pubsub_poll_timeout_seconds

            if elapsed_since_ping >= sse_config.keepalive_interval_seconds:
                yield sse_config.keepalive_frame
                elapsed_since_ping = 0.0

    except asyncio.CancelledError:
        logger.info("SSE generator task cancelled during shutdown/disconnect.")
    except Exception as exc:
        logger.error("Unexpected exception in SSE stream loop: %s", exc)
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
    Public Server-Sent Events endpoint (/api/v1/alerts/stream) for real-time NWS alerts.
    """
    return StreamingResponse(
        alert_event_generator(request, redis_client),
        media_type="text/event-stream",
        headers=SSE_RESPONSE_HEADERS,
    )
