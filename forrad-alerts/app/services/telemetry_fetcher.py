import httpx
from app.models.telemetry_schemas import ForRadTelemetry, OpenMeteoResponse

async def _fetch_nws(client: httpx.AsyncClient, station_id: str) -> ForRadTelemetry:
    """The Primary Provider"""
    url = f"https://api.weather.gov/stations/{station_id}/observations/latest"
    headers = {
        "User-Agent": "ForRadWeatherApp/2.0 (bjgarner@uab.edu)",
        "Accept": "application/geo+json"
    }
    # FAIL FAST: 3.0 second timeout
    response = await client.get(url, headers=headers, timeout=3.0)
    response.raise_for_status()
    raw_json = response.json()
    
    props = raw_json.get("properties", {})
    def get_val(key_path, default=0.0):
        val = props.get(key_path, {}).get("value")
        return float(val) if val is not None else default

    temp_c = get_val("temperature")
    feels_c = get_val("heatIndex") if props.get("heatIndex", {}).get("value") is not None else get_val("windChill", temp_c)
    wind_kmh = get_val("windSpeed")
    gust_kmh = get_val("windGust")
    
    return ForRadTelemetry(
        timestamp=props.get("timestamp", "Unknown"),
        temperature=round(temp_c, 1),
        feels_like=round(feels_c, 1),
        humidity=int(get_val("relativeHumidity", 0)),
        dewpoint=int(get_val("dewpoint", 0)),
        pressure=round(get_val("barometricPressure") / 3386.39, 2),
        wind_speed=round(wind_kmh / 1.609, 1),
        wind_direction=int(get_val("windDirection", 0)),
        wind_gusts=round(gust_kmh / 1.609, 1),
        weather_code=0, 
        visibility=round(get_val("visibility", 16093.4) / 1609.34, 1), # Native is meters, convert to miles
        uv_index=0.0, # NWS current obs doesn't have UV, default to 0
        source="NWS", # Data Lineage Flag
        icon_url=props.get("icon", "https://api.weather.gov/icons/land/day/skc?size=medium"),
        condition_text=props.get("textDescription", "Unknown")
    )

async def _fetch_open_meteo(client: httpx.AsyncClient, lat: float, lon: float) -> ForRadTelemetry:
    """The Secondary Provider"""
    url = (
        f"http://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
        f"precipitation,rain,showers,snowfall,weather_code,cloud_cover,visibility,uv_index"
        f"pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m"
        f"wind_speed_unit=mph&precipitation_unit=inch"
        f"&timezone=America%2FChicago"
    )
    # FAIL FAST: 3.0 second timeout
    response = await client.get(url, timeout=3.0)
    response.raise_for_status()
    raw_payload = OpenMeteoResponse(**response.json())
    return ForRadTelemetry.from_open_meteo(raw_payload)

async def fetch_and_sanitize_telemetry(lat: float = 33.5207, lon: float = -86.8025, station_id: str = "KBHM") -> ForRadTelemetry:
    """
    The Circuit Breaker / Traffic Cop.
    Attempts NWS first. If it times out or fails, instantly falls back to Open-Meteo.
    """
    async with httpx.AsyncClient() as client:
        try:
            print("📡 Attempting Primary Provider (NWS)...")
            return await _fetch_nws(client, station_id)
        except Exception as e:
            print(f"⚠️ NWS Failed ({type(e).__name__}): {e}. Failing over to Open-Meteo...")
            
            try:
                print("📡 Attempting Secondary Provider (Open-Meteo)...")
                return await _fetch_open_meteo(client, lat, lon)
            except Exception as e2:
                print(f"❌ Both providers failed!")
                # If both fail, we finally raise the error to trigger the 502 Bad Gateway
                raise Exception(f"All telemetry providers offline. Last error: {e2}")