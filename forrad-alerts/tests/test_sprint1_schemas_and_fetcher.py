import asyncio
import json
from typing import Any, Dict, List, Optional
import httpx

from app.api.v1.alerts import SSERouterConfig, alert_event_generator
from app.models.forrad_schemas import (
    DEFAULT_DESCRIPTION_FALLBACK,
    ForRadAlert,
    _extract_polygon_rings,
    _normalize_nws_text,
)
from app.models.nws_schemas import NWSAlertFeature
from app.services.nws_fetcher import (
    DEFAULT_FETCHER_CONFIG,
    sync_alerts_to_redis,
)


MOCK_SVR_WARNING_FEATURE_DICT: Dict[str, Any] = {
    "id": "urn:oid:2.49.0.1.840.0.bmx.20261025.001",
    "type": "Feature",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [-86.8104, 33.5186],
                [-86.7500, 33.5800],
                [-86.7000, 33.5000],
                [-86.8104, 33.5186],
            ]
        ],
    },
    "properties": {
        "id": "urn:oid:2.49.0.1.840.0.bmx.20261025.001",
        "event": "Severe Thunderstorm Warning",
        "headline": "Severe Thunderstorm Warning issued October 25 at 8:50PM CDT\nuntil October 25 at 9:45PM CDT by NWS Birmingham AL",
        "description": (
            "The National Weather Service in Birmingham has issued a\n"
            "Severe Thunderstorm Warning for Central Jefferson County in\n"
            "central Alabama.\r\n\r\n"
            "* Until 945 PM CDT.\n"
            "* At 849 PM CDT, a severe thunderstorm was located over\n"
            "  downtown Birmingham, moving northeast at 35 mph.\n\n"
            "HAZARD...70 MPH WIND GUSTS AND PING PONG BALL SIZE HAIL.\n"
            "SOURCE...RADAR INDICATED.\n"
            "IMPACT...PEOPLE AND ANIMALS OUTDOORS WILL BE INJURED.\n"
            "DAMAGE THREAT...CONSIDERABLE"
        ),
        "instruction": (
            "For your protection move to an interior room on the lowest\n"
            "floor of a building.\n\n"
            "Continuous cloud to ground lightning is occurring with this\n"
            "storm. Move indoors immediately."
        ),
        "severity": "Severe",
        "urgency": "Immediate",
        "areaDesc": "Jefferson, AL; Shelby, AL ",
        "effective": "2026-10-25T20:50:00-05:00",
        "expires": "2026-10-25T21:45:00-05:00",
    },
}

MOCK_HEAT_ADVISORY_NO_POLYGON_DICT: Dict[str, Any] = {
    "id": "urn:oid:2.49.0.1.840.0.bmx.20261025.002",
    "type": "Feature",
    "geometry": None,
    "properties": {
        "id": "urn:oid:2.49.0.1.840.0.bmx.20261025.002",
        "event": "Heat Advisory",
        "headline": None,
        "description": "   ",
        "instruction": None,
        "severity": "Moderate",
        "urgency": "Expected",
        "areaDesc": "Tuscaloosa, AL",
        "effective": "2026-10-25T12:00:00-05:00",
        "expires": "2026-10-25T19:00:00-05:00",
    },
}


class FakePubSub:
    def __init__(self, queued_messages: Optional[List[Optional[Dict[str, Any]]]] = None) -> None:
        self.subscribed_channels: List[str] = []
        self.queued_messages: List[Optional[Dict[str, Any]]] = queued_messages or []
        self.closed: bool = False

    async def subscribe(self, channel: str) -> None:
        self.subscribed_channels.append(channel)

    async def get_message(
        self,
        ignore_subscribe_messages: bool = True,
        timeout: float = 1.0,
    ) -> Optional[Dict[str, Any]]:
        if self.queued_messages:
            return self.queued_messages.pop(0)
        return None

    async def unsubscribe(self, channel: str) -> None:
        if channel in self.subscribed_channels:
            self.subscribed_channels.remove(channel)

    async def close(self) -> None:
        self.closed = True


class FakeAsyncRedis:
    def __init__(self, pubsub_instance: Optional[FakePubSub] = None) -> None:
        self.store: Dict[str, Any] = {}
        self.ttls: Dict[str, Optional[int]] = {}
        self.published_messages: List[tuple[str, str]] = []
        self._pubsub = pubsub_instance or FakePubSub()
        self.is_closed: bool = False

    async def ping(self) -> bool:
        return True

    async def close(self) -> None:
        self.is_closed = True

    async def aclose(self) -> None:
        self.is_closed = True

    async def get(self, key: str) -> Optional[bytes]:
        val = self.store.get(key)
        if val is None:
            return None
        return val.encode("utf-8") if isinstance(val, str) else val

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        self.store[key] = value
        self.ttls[key] = ex
        return True

    async def publish(self, channel: str, message: str) -> int:
        self.published_messages.append((channel, message))
        return 2

    def pubsub(self) -> FakePubSub:
        return self._pubsub


class FakeRequest:
    def __init__(self, disconnect_after_checks: int = 2) -> None:
        self.checks = 0
        self.disconnect_after_checks = disconnect_after_checks

    async def is_disconnected(self) -> bool:
        self.checks += 1
        return self.checks > self.disconnect_after_checks


def test_normalize_nws_text_unwraps_prose_and_preserves_ibw_tags() -> None:
    raw = MOCK_SVR_WARNING_FEATURE_DICT["properties"]["description"]
    normalized = _normalize_nws_text(raw)
    assert normalized is not None

    paragraphs = normalized.split("\n\n")
    assert len(paragraphs) == 3
    assert paragraphs[0] == (
        "The National Weather Service in Birmingham has issued a "
        "Severe Thunderstorm Warning for Central Jefferson County in "
        "central Alabama."
    )
    assert paragraphs[1].startswith("* Until 945 PM CDT.\n* At 849 PM CDT")
    assert "HAZARD...70 MPH WIND GUSTS AND PING PONG BALL SIZE HAIL.\n" in paragraphs[2]
    assert paragraphs[2].endswith("DAMAGE THREAT...CONSIDERABLE")


def test_extract_polygon_rings_handles_valid_and_edge_geometries() -> None:
    valid_geo = MOCK_SVR_WARNING_FEATURE_DICT["geometry"]
    rings = _extract_polygon_rings(valid_geo)
    assert rings is not None
    assert len(rings[0]) == 4
    assert _extract_polygon_rings(None) is None
    assert _extract_polygon_rings({"type": "Point", "coordinates": [-86.8, 33.5]}) is None
    assert _extract_polygon_rings({"type": "Polygon", "coordinates": []}) is None


def test_forrad_alert_from_nws_feature_full_and_fallback() -> None:
    svr_feature = NWSAlertFeature.model_validate(MOCK_SVR_WARNING_FEATURE_DICT)
    svr_alert = ForRadAlert.from_nws_feature(svr_feature)
    assert svr_alert.alert_id == "urn:oid:2.49.0.1.840.0.bmx.20261025.001"
    assert svr_alert.has_polygon is True
    assert svr_alert.active_areas == ["Jefferson, AL", "Shelby, AL"]
    assert svr_alert.headline is not None and "\n" not in svr_alert.headline
    assert svr_alert.instruction is not None and "\n\n" in svr_alert.instruction

    heat_feature = NWSAlertFeature.model_validate(MOCK_HEAT_ADVISORY_NO_POLYGON_DICT)
    heat_alert = ForRadAlert.from_nws_feature(heat_feature)
    assert heat_alert.has_polygon is False
    assert heat_alert.polygon_coordinates is None
    assert heat_alert.description == DEFAULT_DESCRIPTION_FALLBACK
    assert heat_alert.instruction is None


def test_sync_alerts_to_redis_hydrates_ttl_and_gates_pubsub_on_sha256() -> None:
    async def _run() -> None:
        mock_collection = {
            "type": "FeatureCollection",
            "features": [
                MOCK_SVR_WARNING_FEATURE_DICT,
                MOCK_HEAT_ADVISORY_NO_POLYGON_DICT,
            ],
        }

        def mock_handler(request: httpx.Request) -> httpx.Response:
            assert request.url.params.get("area") == "AL"
            assert "ForRadWeatherApp/2.0" in request.headers.get("User-Agent", "")
            return httpx.Response(200, json=mock_collection)

        transport = httpx.MockTransport(mock_handler)
        fake_redis = FakeAsyncRedis()

        async with httpx.AsyncClient(transport=transport) as client:
            alerts_cycle_1 = await sync_alerts_to_redis(
                target_area="al",
                redis_client=fake_redis,
                http_client=client,
            )
            assert len(alerts_cycle_1) == 2
            assert fake_redis.ttls[DEFAULT_FETCHER_CONFIG.cache_key] == 300
            assert len(fake_redis.published_messages) == 1
            channel, payload_str = fake_redis.published_messages[0]
            assert channel == "forrad:alerts:stream"
            assert len(json.loads(payload_str)) == 2

            alerts_cycle_2 = await sync_alerts_to_redis(
                target_area="AL",
                redis_client=fake_redis,
                http_client=client,
            )
            assert len(alerts_cycle_2) == 2
            assert fake_redis.ttls[DEFAULT_FETCHER_CONFIG.cache_key] == 300
            assert len(fake_redis.published_messages) == 1

    asyncio.run(_run())


def test_sse_alert_event_generator_yields_initial_update_keepalive_and_cleans_up() -> None:
    async def _run() -> None:
        queued_pubsub_events: List[Optional[Dict[str, Any]]] = [
            {"type": "message", "data": b'[{"alert_id":"test-1"}]'},
            None,
        ]
        fake_pubsub = FakePubSub(queued_messages=queued_pubsub_events)
        fake_redis = FakeAsyncRedis(pubsub_instance=fake_pubsub)
        await fake_redis.set(DEFAULT_FETCHER_CONFIG.cache_key, "[]", ex=300)

        fake_request = FakeRequest(disconnect_after_checks=2)
        fast_sse_config = SSERouterConfig(
            target_area="AL",
            pubsub_poll_timeout_seconds=0.01,
            keepalive_interval_seconds=0.01,
        )

        frames: List[str] = []
        async for frame in alert_event_generator(
            request=fake_request,  # type: ignore[arg-type]
            redis_client=fake_redis,
            sse_config=fast_sse_config,
        ):
            frames.append(frame)

        assert frames[0] == "event: initial_state\ndata: []\n\n"
        assert frames[1] == 'event: alert_update\ndata: [{"alert_id":"test-1"}]\n\n'
        assert frames[2] == ": keep-alive\n\n"
        assert fake_pubsub.closed is True
        assert fake_pubsub.subscribed_channels == []

    asyncio.run(_run())


def test_application_main_imports_cleanly() -> None:
    import importlib
    main_module = importlib.import_module("app.main")
    assert main_module.app is not None
    assert len(main_module.app.routes) > 0


def test_fastapi_lifespan_startup_and_shutdown(monkeypatch: Any) -> None:
    async def _run() -> None:
        import app.core.redis as core_redis
        from app.main import app, lifespan

        fake_redis = FakeAsyncRedis()
        monkeypatch.setattr(core_redis, "get_redis_client", lambda: fake_redis)

        async with lifespan(app):
            assert app.state is not None

        assert fake_redis.is_closed is True

    asyncio.run(_run())
