import httpx
from typing import List
from app.models.nws_schemas import NWSFeatureCollection
from app.models.forrad_schemas import ForRadAlert

async def fetch_and_sanitize_active_alerts(target_area: str = "AL") -> List[ForRadAlert]:
    """
    Fetches live data from the NWS API, validates it against the NWS schema,
    and returns a sanitized list of ForRadAlerts.
    
    This service is decoupled from FastAPI, meaning it can be called by web routes,
    background workers, or CLI scripts.
    """
    url = f"https://api.weather.gov/alerts/active?area={target_area}"
    
    headers = {
        "User-Agent": "ForRadWeatherApp/2.0 (bjgarner@uab.edu)",
        "Accept": "application/geo+json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            raw_json = response.json()
        except httpx.HTTPError as e:
            print(f"❌ NWS API Error: {e}")
            # We raise a standard Python Exception here, NOT an HTTPException.
            # Services shouldn't know anything about HTTP status codes like 502.
            raise Exception(f"Upstream NWS API failed: {e}")

    # Validate against strict NWS schema
    raw_payload = NWSFeatureCollection(**raw_json)
    
    # Transform into clean ForRad schema
    sanitized_alerts = [ForRadAlert.from_nws_feature(feature) for feature in raw_payload.features]
    
    return sanitized_alerts