import asyncio
import json
from typing import Any, Dict, List, Optional
import httpx
import pytest

from app.models.nws_schemas import NWSAlertFeature
from app.models.forrad_schemas import ForRadAlert
from app.services.nws_fetcher import (
    NWSAlertFetcherConfig,
    fetch_and_sanitize_active_alerts,
    sync_alerts_to_redis,
)
from app.api.v1.alerts import alert_event_generator


MOCK_NWS_GEOJSON_PAYLOAD: Dict[str, Any] = {
    "type": "FeatureCollection",
    "features": [
        {
            "id": "urn:oid:2.49.0.1.840.0.bhm.20261023.001",
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-86.92, 33.48],
                        [-86.75, 33.48],
                        [-86.75, 33.62],
                        [-86.92, 33.62],
                        [-86.92, 33.48],
                    ]
                ],
            },
            "properties": {
                "id": "urn:oid:2.49.0.1.840.0.bhm.20261023.001",
                "event": "Severe Thunderstorm Warning",
                "headline": "Severe Thunderstorm Warning issued October 23 at 5:15PM CDT by NWS Birmingham AL",
                "description": (
                    "The National Weather Service in Birmingham has issued a\n"
                    "Severe Thunderstorm Warning for...\n"
                    "Central Jefferson County in central Alabama...\n\n"
                    "At 515 PM CDT, a severe thunderstorm was located over\n"
                    "downtown Birmingham, moving east at 35 mph.\n\n"
                    "HAIL THREAT...RADAR INDICATED\n"
                    "MAX HAIL SIZE...1.25 IN\n"
                    "WIND THREAT...RADAR INDICATED\n"
                    "MAX WIND GUST...60 MPH"
                ),
                "instruction": (
                    "For your protection move to an interior room on the lowest\n"
                    "floor of a building."
                ),
                "severity": "Severe",
                "urgency": "Immediate",
                "areaDesc": "Jefferson, AL; Shelby, AL",
                "effective": "2026-10-23T17:15:00-05:00",
                "expires": "2026-10-23T18:00:00-05:00",
            },
        },
        {
            "id": "urn:oid:2.49.0.1.840.0.bhm.20261023.002",
            "type": "Feature",
            "geometry": None,
            "properties": {
                "id": "urn:oid:2.49.0.1.840.0.bhm.20261023.002",
                "event": "Special Weather Statement",
                "headline": None,
                "description": "Strong gusty winds up to 40 mph are possible across Blount County.",
                "instruction": None,
                "severity": "Minor",
                "urgency": "Expected",
                "areaDesc": "Blount, AL",
                "effective": "2026-10-23T17:10:00-05:00",
                "expires": "2026-10-23T18:15:00-05:00",
            },
        },
    ],
}


class FakePubSub:
    def __init__(self, queued_messages: Optional[List[Dict[str, Any]]] = None):
        self.subscribed_channels: List[str] = []
        self.queued_messages = list(queued_messages or [])
        self.closed = False

    async def subscribe(self, channel: str) -> None:
        self.subscribed_channels.append(channel)

    async def get_message(
        self, ignore_subscribe_messages: bool = True, timeout: float = 1.0
    ) -> Optional[Dict[str, Any]]:
        if self.queued_messages:
            return self.queued_messages.pop(0)
        return None

    async def unsubscribe(self, channel: str) -> None:
        if channel in self.subscribed_channels:
            self.subscribed_channels.remove(channel)

    async def close(self) -> None:
        self.closed = True


class FakeRedisClient:
    def __init__(self, queued_messages: Optional[List[Dict[str, Any]]] = None):
        self.store: Dict[str, str] = {}
        self.ttls: Dict[str, int] = {}
        self.published: List[tuple[str, str]] = []
        self.pubsub_instance = FakePubSub(queued_messages=queued_messages)

    async def get(self, key: str) -> Optional[str]:
        return self.store.get(key)

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        self.store[key] = value
        if ex is not None:
            self.ttls[key] = ex
        return True

    async def publish(self, channel: str, payload: str) -> int:
        self.published.append((channel, payload))
        return 1

    def pubsub(self) -> FakePubSub:
        return self.pubsub_instance


class FakeDisconnectRequest:
    def __init__(self, disconnect_after_checks: int = 1):
        self.remaining = disconnect_after_checks

    async def is_disconnected(self) -> bool:
        if self.remaining <= 0:
            return True
        self.remaining -= 1
        return False


def test_forrad_alert_preserves_description_and_instruction():
    feature = NWSAlertFeature.model_validate(MOCK_NWS_GEOJSON_PAYLOAD["features"][0])
    alert = ForRadAlert.from_nws_feature(feature)

    assert alert.alert_id == "urn:oid:2.49.0.1.840.0.bhm.20261023.001"
    assert alert.event_type == "Severe Thunderstorm Warning"
    assert alert.active_areas == ["Jefferson, AL", "Shelby, AL"]
    assert alert.has_polygon is True
    assert "downtown Birmingham, moving east at 35 mph." in alert.description
    assert "MAX HAIL SIZE...1.25 IN\nWIND THREAT...RADAR INDICATED" in alert.description
    assert (
        alert.instruction
        == "For your protection move to an interior room on the lowest floor of a building."
    )


def test_forrad_alert_handles_missing_instruction_and_null_geometry():
    feature = NWSAlertFeature.model_validate(MOCK_NWS_GEOJSON_PAYLOAD["features"][1])
    alert = ForRadAlert.from_nws_feature(feature)

    assert alert.event_type == "Special Weather Statement"
    assert alert.instruction is None
    assert alert.headline is None
    assert alert.has_polygon is False
    assert alert.polygon_coordinates is None


@pytest.mark.asyncio
async def test_sync_alerts_to_redis_deduplicates_pubsub_broadcasts():
    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=MOCK_NWS_GEOJSON_PAYLOAD)

    transport = httpx.MockTransport(mock_handler)
    fake_redis = FakeRedisClient()
    config = NWSAlertFetcherConfig(cache_ttl_seconds=300)

    async with httpx.AsyncClient(transport=transport) as client:
        # 1st poll: should write cache and publish to stream
        alerts_first = await sync_alerts_to_redis(
            target_area="AL",
            redis_client=fake_redis,
            http_client=client,
            config=config,
        )
        assert len(alerts_first) == 2
        assert len(fake_redis.published) == 1
        assert fake_redis.ttls[config.cache_key] == 300

        # 2nd poll with identical payload: should refresh TTL but NOT re-publish
        await sync_alerts_to_redis(
            target_area="AL",
            redis_client=fake_redis,
            http_client=client,
            config=config,
        )
        assert len(fake_redis.published) == 1


@pytest.mark.asyncio
async def test_sse_generator_yields_initial_state_and_realtime_update():
    sample_alert = ForRadAlert.from_nws_feature(
        NWSAlertFeature.model_validate(MOCK_NWS_GEOJSON_PAYLOAD["features"][0])
    )
    initial_json = json.dumps([sample_alert.model_dump(mode="json")])

    fake_redis = FakeRedisClient(
        queued_messages=[{"type": "message", "data": initial_json}]
    )
    await fake_redis.set("forrad:alerts:active", initial_json, ex=300)

    fake_request = FakeDisconnectRequest(disconnect_after_checks=1)
    generator = alert_event_generator(fake_request, fake_redis)

    frames: List[str] = []
    async for frame in generator:
        frames.append(frame)

    assert len(frames) == 2
    assert frames[0].startswith("event: initial_state\ndata: ")
    assert "Severe Thunderstorm Warning" in frames[0]
    assert frames[1].startswith("event: alert_update\ndata: ")
    assert fake_redis.pubsub_instance.closed is True
