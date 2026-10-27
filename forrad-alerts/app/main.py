import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Final, List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import alerts, matrix, telemetry
from app.core import redis as core_redis
from app.services.nws_fetcher import sync_alerts_to_redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("forrad.main")

# ==============================================================================
# APPLICATION CONFIGURATION CONSTANTS
# ==============================================================================
ALERTS_POLL_INTERVAL_SECONDS: Final[int] = 60
TARGET_ALERT_AREA: Final[str] = "AL"
ALLOWED_CORS_ORIGINS: Final[List[str]] = [
    "https://forradwx.app",
    "https://dash.forradwx.com",
    "http://localhost:3000",
    "http://192.168.50.101:3000",
]


async def _run_alerts_background_daemon() -> None:
    """
    Supervised background producer polling NWS active alerts every 60 seconds,
    extending the 300s Redis TTL and publishing SHA-256 delta events to SSE.
    """
    logger.info(
        "Alerts Daemon Started: Polling NWS active alerts (%s) every %ds",
        TARGET_ALERT_AREA,
        ALERTS_POLL_INTERVAL_SECONDS,
    )
    while True:
        try:
            await sync_alerts_to_redis(target_area=TARGET_ALERT_AREA)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("[Alerts Daemon Error] Poll cycle failed: %s", exc)
        await asyncio.sleep(ALERTS_POLL_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    ASGI Lifespan Context Manager: Verifies Redis connectivity on boot,
    starts the supervised background poller, and guarantees clean teardown.
    """
    client = core_redis.get_redis_client()
    if client and hasattr(client, "ping"):
        try:
            await client.ping()
            logger.info("[Redis] Startup connection verified.")
        except Exception as exc:
            logger.warning("[Redis] Initial ping failed (daemon will retry): %s", exc)

    poller_task = asyncio.create_task(_run_alerts_background_daemon())

    try:
        yield
    finally:
        poller_task.cancel()
        try:
            await poller_task
        except asyncio.CancelledError:
            logger.info("Alerts background daemon cancelled cleanly.")

        if client:
            try:
                if hasattr(client, "aclose"):
                    await client.aclose()
                elif hasattr(client, "close"):
                    await client.close()
                logger.info("[Redis] Disconnected cleanly.")
            except Exception as exc:
                logger.warning("[Redis] Teardown exception: %s", exc)


app = FastAPI(
    title="ForRad Alerts & Telemetry API",
    version="2.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])
app.include_router(telemetry.router, prefix="/api/v1/telemetry", tags=["Telemetry"])
app.include_router(matrix.router, prefix="/api/v1/matrix", tags=["Matrix"])


@app.get("/healthz", tags=["Health"])
async def healthz() -> dict[str, object]:
    redis_ok = False
    try:
        client = core_redis.get_redis_client()
        if client and hasattr(client, "ping"):
            redis_ok = bool(await client.ping())
    except Exception:
        redis_ok = False

    return {
        "status": "healthy" if redis_ok else "degraded",
        "redis_connected": redis_ok,
        "service": "forrad-alerts",
    }
