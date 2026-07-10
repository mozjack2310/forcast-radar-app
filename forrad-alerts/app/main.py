import os 
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import redis.asyncio as aioredis

# Import our modular components
import app.core.redis as core_redis
from app.api.v1 import alerts, telemetry # <-- ADD TELEMETRY HERE

redis_host = os.getenv("REDIS_HOST", "localhost")
redis_port = int(os.getenv("REDIS_PORT", 6379))
redis_db = int(os.getenv("REDIS_DB", 0))

# ==========================================
# LIFESPAN & APPLICATION SETUP
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages global startup and shutdown events for the API.
    """
    # Initialize the global Redis client using our core state module
    # Note: We use aioredis as an alias to avoid naming collisions with our local redis.py
    core_redis.redis_client = aioredis.Redis(host=redis_host, port=redis_port, db=redis_db, decode_responses=True)
    print("🚀 Connected to Redis cache")
    
    yield # The FastAPI app is now running
    
    # On Shutdown: Cleanly close the connection
    if core_redis.redis_client:
        await core_redis.redis_client.close()
        print("🛑 Disconnected from Redis cache")

# Initialize FastAPI
app = FastAPI(title="ForRad Weather API", version="2.0.0", lifespan=lifespan)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://localhost:3002", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://192.168.50.101:3000" # Added your network IP from earlier too!
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# ROUTER REGISTRATION
# ==========================================

# We attach the alerts router here and define its prefix path
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])

# Attach the new telemetry router!
app.include_router(telemetry.router, prefix="/api/v1/telemetry", tags=["Telemetry"])

# Temporary stubs for future implementation
@app.get("/api/v1/radar/latest", tags=["Radar"])
async def get_radar():
    return {"status": "pending implementation"}

# (Remove the old /api/v1/telemetry/history stub from here)