from fastapi import APIRouter, HTTPException
import json

from app.models.telemetry_schemas import ForRadTelemetry
from app.services.telemetry_fetcher import fetch_and_sanitize_telemetry
# 1. Import the getter function instead of the whole core module
from app.core.redis import get_redis_client 

router = APIRouter()

@router.get("/current", response_model=ForRadTelemetry)
async def get_current_telemetry():
    """
    Fetches the current weather telemetry.
    Checks Redis cache first. If empty, calls the Open-Meteo Service.
    """
    cache_key = "forrad:telemetry:current"
    
    # --- LATE BINDING: Grab the live connection right as the request hits! ---
    redis_client = get_redis_client()
    
    # 1. Try Cache First
    if redis_client:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            print("⚡ CACHE HIT: Serving telemetry from Redis.")
            return json.loads(cached_data)
            
    print("⏳ CACHE MISS: Calling Open-Meteo Fetcher Service...")
    
    # 2. Call the Service Layer
    try:
        # We rely on the default Birmingham coordinates defined in the service
        sanitized_telemetry = await fetch_and_sanitize_telemetry()
    except Exception as e:
        # The service throws a raw Python Exception. We translate it to an HTTP 502 for Next.js.
        raise HTTPException(status_code=502, detail=str(e))
    
    # 3. Cache the Result (TTL: 5 minutes / 300 seconds)
    if redis_client:
        telemetry_json = json.dumps(sanitized_telemetry.model_dump(mode='json'))
        await redis_client.setex(cache_key, 300, telemetry_json)
        print("💾 CACHED: Saved live telemetry to Redis.")
    
    return sanitized_telemetry