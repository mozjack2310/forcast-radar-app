import hashlib
import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import httpx
from pydantic import ValidationError

import app.core.redis as core_redis
from app.models.forrad_schemas import ForRadAlert
from app.models.nws_schemas import NWSFeatureCollection

logger = logging.getLogger("forrad.nws_fetcher")


# ==============================================================================
# CONFIGURATION DATA CONTRACT (Strictly Isolated from Execution Logic)
# ==============================================================================
@dataclass(frozen=True)
class NWSAlertFetcherConfig:
    base_url: str = "https://api.weather.gov/alerts/active"
    user_agent: str = "(ForRadWeatherApp/2.0, https://forradwx.app, secops@forradwx.app)"
    accept_header: str = "application/geo+json"
    timeout_seconds: float = 8.0
    cache_key: str = "forrad:alerts:active"
    hash_key: str = "forrad:alerts:hash"
    pubsub_channel: str = "forrad:alerts:stream"
    cache_ttl_seconds: int = 300


DEFAULT_FETCHER_CONFIG = NWSAlertFetcherConfig()


# ==============================================================================
# INTERNAL HELPERS (DRY HTTP Transport & Digest Utilities)
# ==============================================================================
async def _execute_nws_http_get(
    client: httpx.AsyncClient,
    target_area: str,
    config: NWSAlertFetcherConfig,
) -> Dict[str, Any]:
    """
    Executes a single HTTP GET against api.weather.gov with strict headers and timeout.
    """
    headers = {
        "User-Agent": config.user_agent,
        "Accept": config.accept_header,
    }
    params = {"area": target_area.upper().strip()}
    response = await client.get(
        config.base_url,
        headers=headers,
        params=params,
        timeout=config.timeout_seconds,
    )
    response.raise_for_status()
    return response.json()


def _decode_redis_value(raw_value: Optional[Any]) -> Optional[str]:
    """
    Normalizes bytes or string values returned by redis.asyncio clients.
    """
    if raw_value is None:
        return None
    if isinstance(raw_value, bytes):
        return raw_value.decode("utf-8")
    return str(raw_value)


def _serialize_and_hash_alerts(alerts: List[ForRadAlert]) -> tuple[str, str]:
    """
    Serializes ForRadAlert models into deterministic JSON and computes a SHA-256 digest.
    """
    serialized_list = [alert.model_dump(mode="json") for alert in alerts]
    payload_json = json.dumps(serialized_list, sort_keys=True)
    payload_digest = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()
    return payload_json, payload_digest


# ==============================================================================
# CORE SERVICE PIPELINE (Fetch, Sanitize, Cache-Aside & Delta Pub/Sub)
# ==============================================================================
async def fetch_and_sanitize_active_alerts(
    target_area: str = "AL",
    http_client: Optional[httpx.AsyncClient] = None,
    config: NWSAlertFetcherConfig = DEFAULT_FETCHER_CONFIG,
) -> List[ForRadAlert]:
    """
    Fetches live alerts from api.weather.gov, validates against NWSFeatureCollection,
    and transforms features into sanitized ForRadAlert models.
    """
    if http_client is not None:
        raw_json = await _execute_nws_http_get(http_client, target_area, config)
    else:
        async with httpx.AsyncClient() as client:
            raw_json = await _execute_nws_http_get(client, target_area, config)

    try:
        feature_collection = NWSFeatureCollection.model_validate(raw_json)
    except ValidationError as exc:
        logger.error("NWS schema validation failed for area=%s: %s", target_area, exc)
        raise

    return [
        ForRadAlert.from_nws_feature(feature)
        for feature in feature_collection.features
    ]


async def sync_alerts_to_redis(
    target_area: str = "AL",
    redis_client: Optional[Any] = None,
    http_client: Optional[httpx.AsyncClient] = None,
    config: NWSAlertFetcherConfig = DEFAULT_FETCHER_CONFIG,
) -> List[ForRadAlert]:
    """
    Executes the fetch pipeline, writes serialized alerts to Redis with a strict 300s TTL,
    and publishes a real-time SSE event to Redis Pub/Sub only if the SHA-256 digest changed.
    """
    active_redis = redis_client or core_redis.get_redis_client()
    alerts = await fetch_and_sanitize_active_alerts(
        target_area=target_area,
        http_client=http_client,
        config=config,
    )

    if not active_redis:
        logger.warning("Redis client unavailable; returning sanitized alerts without caching.")
        return alerts

    payload_json, payload_digest = _serialize_and_hash_alerts(alerts)
    previous_digest = _decode_redis_value(await active_redis.get(config.hash_key))

    # Always refresh the 300s Cache-Aside TTL so the active snapshot stays warm
    await active_redis.set(
        config.cache_key,
        payload_json,
        ex=config.cache_ttl_seconds,
    )

    if previous_digest != payload_digest:
        await active_redis.set(
            config.hash_key,
            payload_digest,
            ex=config.cache_ttl_seconds * 2,
        )
        subscriber_count = await active_redis.publish(
            config.pubsub_channel,
            payload_json,
        )
        logger.info(
            "Redis Hydrated & Published: %s (%d alerts, %d SSE subscribers notified)",
            config.cache_key,
            len(alerts),
            subscriber_count,
        )
    else:
        logger.debug(
            "NWS alerts unchanged (digest=%s). TTL extended on %s.",
            payload_digest[:8],
            config.cache_key,
        )

    return alerts
