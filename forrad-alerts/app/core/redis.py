import logging
import os
from dataclasses import dataclass
from typing import Optional
import redis.asyncio as aioredis

logger = logging.getLogger("forrad.redis")


# ==============================================================================
# CONFIGURATION DATA CONTRACT (Strictly Isolated from Connection Logic)
# ==============================================================================
@dataclass(frozen=True)
class RedisConnectionConfig:
    url: Optional[str]
    host: str
    port: int
    db: int
    decode_responses: bool = True
    socket_connect_timeout: float = 2.0
    socket_timeout: float = 2.0

    @classmethod
    def from_env(cls) -> "RedisConnectionConfig":
        raw_url = os.getenv("REDIS_URL") or os.getenv("INTERNAL_REDIS_URL")
        host = os.getenv("REDIS_HOST") or os.getenv("REDIS_IP") or "redis-cache"
        port = int(os.getenv("REDIS_PORT", "6379"))
        db = int(os.getenv("REDIS_DB", "0"))
        return cls(
            url=raw_url.strip() if raw_url else None,
            host=host.strip(),
            port=port,
            db=db,
        )


# Module-level singleton instance
redis_client: Optional[aioredis.Redis] = None


def _create_redis_instance(config: RedisConnectionConfig) -> aioredis.Redis:
    """
    Pure factory function that instantiates an async Redis client pool
    from either a full REDIS_URL or discrete host/port parameters.
    """
    if config.url:
        return aioredis.Redis.from_url(
            config.url,
            decode_responses=config.decode_responses,
            socket_connect_timeout=config.socket_connect_timeout,
            socket_timeout=config.socket_timeout,
        )
    return aioredis.Redis(
        host=config.host,
        port=config.port,
        db=config.db,
        decode_responses=config.decode_responses,
        socket_connect_timeout=config.socket_connect_timeout,
        socket_timeout=config.socket_timeout,
    )


async def init_redis_client(
    config: Optional[RedisConnectionConfig] = None,
) -> aioredis.Redis:
    """
    Explicit async initializer for FastAPI lifespan startup.
    """
    global redis_client
    if redis_client is None:
        active_config = config or RedisConnectionConfig.from_env()
        redis_client = _create_redis_instance(active_config)
        logger.info(
            "[Redis] Client pool configured (host=%s, port=%d)",
            active_config.host,
            active_config.port,
        )
    return redis_client


def get_redis_client(
    config: Optional[RedisConnectionConfig] = None,
) -> aioredis.Redis:
    """
    Returns the active Redis client, lazily initializing the connection pool
    on first access so route handlers and background daemons never receive None.
    """
    global redis_client
    if redis_client is None:
        active_config = config or RedisConnectionConfig.from_env()
        redis_client = _create_redis_instance(active_config)
        logger.info(
            "[Redis] Lazily initialized client pool (host=%s, port=%d)",
            active_config.host,
            active_config.port,
        )
    return redis_client
