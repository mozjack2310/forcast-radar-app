import logging
from typing import Any, Dict, Optional
import httpx
import app.core.redis as core_redis
from app.models.telemetry_schemas import ForRadTelemetry

logger = logging.getLogger("forrad.telemetry_fetcher")

KBHM_URL = "https://api.weather.gov/stations/KBHM/observations/latest"
OM_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=33.5207&longitude=-86.8025"
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
    "surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m"
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"
)
USER_AGENT = "(ForRadWeatherApp/2.0, https://forradwx.app, bjgarner@uab.edu)"
CACHE_KEY = "forrad:telemetry:current"
CACHE_TTL = 60

def _c_to_f(c: Optional[float]) -> Optional[float]:
    return round((float(c) * 9.0 / 5.0) + 32.0, 1) if c is not None else None

def _pa_to_inhg(pa: Optional[float]) -> Optional[float]:
    return round(float(pa) / 3386.389, 2) if pa and pa > 0 else None

def _m_to_mi(m: Optional[float]) -> Optional[float]:
    return round(float(m) / 1609.344, 1) if m and m >= 0 else None

def _wind_mph(speed_prop: Dict[str, Any]) -> float:
    val = speed_prop.get("value") if isinstance(speed_prop, dict) else None
    if val is None:
        return 0.0
    u = str(speed_prop.get("unitCode", "")).lower()
    try:
        v = float(val)
        if "km_h" in u: return round(v * 0.621371, 1)
        if "m_s" in u: return round(v * 2.23694, 1)
        return round(v, 1)
    except (ValueError, TypeError):
        return 0.0

async def _fetch_nws(client: httpx.AsyncClient) -> ForRadTelemetry:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/geo+json"}
    resp = await client.get(KBHM_URL, headers=headers, timeout=5.0)
    resp.raise_for_status()
    props = resp.json().get("properties", {})
    t_val = props.get("temperature", {}).get("value")
    t_qc = str(props.get("temperature", {}).get("qualityControl", "")).strip().upper()
    if t_val is None or t_qc == "Z":
        raise ValueError(f"KBHM degraded: value={t_val}, qc='{t_qc}'")
    
    rh = props.get("relativeHumidity", {}).get("value")
    wdir = props.get("windDirection", {}).get("value")
    
    return ForRadTelemetry(
        timestamp=props.get("timestamp"),
        station_id="KBHM",
        temperature=_c_to_f(t_val),
        feels_like=_c_to_f(t_val),
        humidity=round(float(rh), 1) if rh is not None else None,
        dewpoint=_c_to_f(props.get("dewpoint", {}).get("value")),
        pressure=_pa_to_inhg(props.get("barometricPressure", {}).get("value")),
        wind_speed=_wind_mph(props.get("windSpeed", {})),
        wind_direction=round(float(wdir)) if wdir is not None else None,
        wind_gusts=_wind_mph(props.get("windGust", {})),
        weather_code=0,
        visibility=_m_to_mi(props.get("visibility", {}).get("value")),
        uv_index=0.0,
        icon_url=props.get("icon"),
        condition_text=props.get("textDescription") or "Clear",
        source="NWS LIVE (KBHM)",
    )

async def _fetch_open_meteo(client: httpx.AsyncClient) -> ForRadTelemetry:
    resp = await client.get(OM_URL, headers={"User-Agent": USER_AGENT}, timeout=5.0)
    resp.raise_for_status()
    curr = resp.json().get("current", {})
    p_hpa = curr.get("surface_pressure")
    return ForRadTelemetry(
        timestamp=curr.get("time"),
        station_id="OM-KBHM",
        temperature=round(float(curr.get("temperature_2m")), 1) if curr.get("temperature_2m") is not None else None,
        feels_like=round(float(curr.get("apparent_temperature")), 1) if curr.get("apparent_temperature") is not None else None,
        humidity=round(float(curr.get("relative_humidity_2m")), 1) if curr.get("relative_humidity_2m") is not None else None,
        dewpoint=None,
        pressure=round(float(p_hpa) / 33.86389, 2) if p_hpa is not None else None,
        wind_speed=round(float(curr.get("wind_speed_10m", 0.0)), 1),
        wind_direction=curr.get("wind_direction_10m"),
        wind_gusts=round(float(curr.get("wind_gusts_10m", 0.0)), 1),
        weather_code=curr.get("weather_code", 0),
        visibility=10.0,
        uv_index=0.0,
        icon_url=None,
        condition_text="Conditions Normal",
        source="OPEN-METEO FALLBACK",
    )

async def get_current_telemetry() -> ForRadTelemetry:
    r = core_redis.get_redis_client()
    if r:
        try:
            cached = await r.get(CACHE_KEY)
            if cached:
                s = cached.decode("utf-8") if isinstance(cached, bytes) else cached
                return ForRadTelemetry.model_validate_json(s)
        except Exception as e:
            logger.warning(f"Redis read err: {e}")
    async with httpx.AsyncClient() as c:
        try:
            tel = await _fetch_nws(c)
        except Exception as e:
            logger.warning(f"[Circuit Breaker Tripped] {e}. Using Open-Meteo.")
            tel = await _fetch_open_meteo(c)
    if r:
        try:
            await r.set(CACHE_KEY, tel.model_dump_json(), ex=CACHE_TTL)
        except Exception as e:
            logger.warning(f"Redis write err: {e}")
    return tel


# Contract alias for telemetry router imports
fetch_and_sanitize_telemetry = get_current_telemetry
