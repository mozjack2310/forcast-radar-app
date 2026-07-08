from fastapi import APIRouter, HTTPException
from typing import List
import json
import httpx

# Import our Pydantic models (KEEP BOTH!)
from app.models.nws_schemas import NWSFeatureCollection 
from app.models.forrad_schemas import ForRadAlert

# Import our global Redis state
import app.core.redis as core_redis

router = APIRouter()

@router.get("/active", response_model=List[ForRadAlert])
async def get_active_alerts():
    """
    Fetches active NWS alerts.
    Checks Redis cache first. If empty, calls the NWS API.
    """
    cache_key = "forrad:alerts:active"
    
    # 1. Try Cache First
    if core_redis.redis_client:
        cached_data = await core_redis.redis_client.get(cache_key)
        if cached_data:
            print("⚡ CACHE HIT: Serving alerts from Redis.")
            return json.loads(cached_data)
            
    print("⏳ CACHE MISS: Fetching live data from NWS API...")
    
    # 2. Fetch Live Data from NWS
    headers = {
        "User-Agent": "ForRadWeatherApp/2.0 (contact@yourdomain.com)",
        "Accept": "application/geo+json"
    }
    
    # Targeting Alabama (AL) alerts
    url = "https://api.weather.gov/alerts/active?area=AL"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            raw_json = response.json()
        except httpx.HTTPError as e:
            print(f"❌ NWS API Error: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch data from NWS")

    # 3. Pydantic validation kicks in and processes the LIVE data!
    raw_payload = NWSFeatureCollection(**raw_json)
    sanitized_alerts = [ForRadAlert.from_nws_feature(feature) for feature in raw_payload.features]
    
    # 4. Cache the Result
    if core_redis.redis_client:
        alerts_json = json.dumps([alert.model_dump(mode='json') for alert in sanitized_alerts])
        await core_redis.redis_client.setex(cache_key, 120, alerts_json)
        print(f"💾 CACHED: Saved {len(sanitized_alerts)} live alerts to Redis.")
    
    return sanitized_alerts