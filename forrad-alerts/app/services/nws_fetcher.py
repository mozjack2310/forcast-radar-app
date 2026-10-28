import hashlib
import json
import logging
from dataclasses import dataclass
from typing import Any, List, Optional
import httpx
from pydantic import ValidationError

from app.models.nws_schemas import NWSFeatureCollection
from app.models.forrad_schemas import ForRadAlert
import app.core.redis as core_redis

logger = logging.getLogger("forrad.nws_fetcher")


@dataclass(frozen=True)
class NWSAlertFetcherConfig:
    base_url: str = "https://api.weather.gov/alerts/active"
    user_agent: str = "(ForRadWeatherApp/2.0, https://forradwx.app, bjgarner@uab.edu)"
    accept_header: str = "application/geo+json"
    timeout_seconds: float = 8.0
    cache_key: str = "forrad:alerts:active"
    hash_key: str = "forrad:alerts:hash"
    pubsub_channel: str = "forrad:alerts:stream"
    cache_ttl_seconds: int = 300


DEFAULT_FETCHER_CONFIG = NWSAlertFetcherConfig()


async def fetch_and_sanitize_active_alerts(
    target_area: str = "AL",
    http_client: Optional[httpx.AsyncClient] = None,
    config: NWSAlertFetcherConfig = DEFAULT_FETCHER_CONFIG,
) -> List[ForRadAlert]:
    """
    Fetches live alerts from api.weather.gov, validates against NWSFeatureCollection,
    and transforms features into sanitized ForRadAlert models with description and instruction.
    """
    headers = {
        "User-Agent": config.user_agent,
        "Accept": config.accept_header,
    }
    params = {"area": target_area.upper().strip()}

    if http_client is not None:
        response = await http_client.get(
            config.base_url,
            headers=headers,
            params=params,
            timeout=config.timeout_seconds,
        )
        response.raise_for_status()
        raw_json = response.json()
    else:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                config.base_url,
                headers=headers,
                params=params,
                timeout=config.timeout_seconds,
            )
            response.raise_for_status()
            raw_json = response.json()

    try:
        feature_collection = NWSFeatureCollection.model_validate(raw_json)
    except ValidationError as exc:
        logger.error(f"NWS schema validation failed for area={target_area}: {exc}")
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
    Executes the fetch pipeline, writes serialized alerts to Redis with a strict TTL,
    and publishes a real-time SSE event to Redis Pub/Sub if the state digest changed.
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

    serialized_list = [alert.model_dump(mode="json") for alert in alerts]
    payload_json = json.dumps(serialized_list, sort_keys=True)
    payload_digest = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()

    previous_digest_raw = await active_redis.get(config.hash_key)
    previous_digest = (
        previous_digest_raw.decode("utf-8")
        if isinstance(previous_digest_raw, bytes)
        else previous_digest_raw
    )

    # Always refresh Cache-Aside TTL so active snapshot stays warm
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
            f"✅ Redis Hydrated & Published: {config.cache_key} "
            f"({len(alerts)} alerts, {subscriber_count} SSE subscribers notified)"
        )
    else:
        logger.debug(
            f"NWS alerts unchanged (digest={payload_digest[:8]}). TTL extended on {config.cache_key}."
        )

    return alerts
