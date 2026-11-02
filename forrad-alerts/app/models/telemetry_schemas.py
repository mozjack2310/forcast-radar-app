
def _nws_c_to_f(val):
    if val is None:
        return None
    try:
        return round((float(val) * 9.0 / 5.0) + 32.0, 1)
    except (TypeError, ValueError):
        return None

def _nws_wind_to_mph(prop):
    if not isinstance(prop, dict):
        return 0.0
    val = prop.get("value")
    if val is None:
        return 0.0
    unit = str(prop.get("unitCode", "")).lower()
    try:
        v = float(val)
        if "km_h" in unit or "km/h" in unit:
            return round(v * 0.621371, 1)
        if "m_s" in unit or "m/s" in unit:
            return round(v * 2.23694, 1)
        if "kn" in unit or "kt" in unit:
            return round(v * 1.15078, 1)
        return round(v, 1)
    except (TypeError, ValueError):
        return 0.0

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import List, Dict, Any, Optional

# ==========================================
# PHASE 1A: RAW INGESTION MODELS (Open-Meteo Schema)
# ==========================================

class OpenMeteoCurrent(BaseModel):
    """The raw current conditions from Open-Meteo."""
    time: str
    temperature_2m: float
    relative_humidity_2m: int
    dewpoint: Optional[float] = None
    apparent_temperature: float
    precipitation: float
    rain: float
    showers: float
    snowfall: float
    weather_code: int
    cloud_cover: int
    pressure_msl: float
    surface_pressure: float
    wind_speed_10m: float
    wind_direction_10m: int
    wind_gusts_10m: float
    wind_direction_10m: int
    wind_gusts_10m: float
    visibility: Optional[float] = None
    uv_index: int


class OpenMeteoResponse(BaseModel):
    """The root JSON response from the Open-Meteo API."""
    latitude: float
    longitude: float
    timezone: str
    current: OpenMeteoCurrent
    # We can add 'hourly' or 'daily' models here later if needed for graphs


# ==========================================
# PHASE 1B: SANITIZED MODELS (ForRad Schema)
# ==========================================

class ForRadTelemetry(BaseModel):
    model_config = ConfigDict(extra='ignore', alias_generator=to_camel, populate_by_name=True)
    """The lean, sanitized model sent to the Next.js UI and MatrixPortal."""
    timestamp: str
    temperature: float = Field(description="Actual temperature")
    feels_like: float = Field(description="Apparent temperature / Heat Index / Wind Chill")
    humidity: int = Field(description="Relative humidity percentage")
    dewpoint: Optional[float] = Field(default=None, description="Dewpoint temperature")
    pressure: float = Field(description="Pressure in inches of mercury (inHg)")
    wind_speed: float = Field(description="Wind speed in mph")
    wind_direction: int = Field(description="Wind direction in degrees")
    wind_gusts: Optional[float] = Field(default=0.0, description="Wind gusts in mph")
    weather_code: int = Field(description="WMO Weather interpretation code (0-99)")
    visibility: float = Field(default=10.0, description="Visibility in miles") 
    uv_index: float = Field(default=0.0, description="UV Index (0-11+)")
    icon_url: Optional[str] = Field(default=None, description="URL to the weather icon")
    condition_text: Optional[str] = Field(default=None, description="Text description of the weather conditions")
    source: str = Field(default="NWS", description="The API provider for this payload")  # NEW: Data Lineage Flag

    # NEW: Data Lineage Flag
    source: str = Field(default="NWS", description="The API provider for this payload")
    
    @classmethod
    def from_open_meteo(cls, raw_data: OpenMeteoResponse) -> "ForRadTelemetry":
        """Transforms the verbose Open-Meteo response into our UI-ready model."""

        # 2. Safely convert Open-Meteo's meters to miles, or fallback to 10 if missing
        vis_miles = 10.0
        if raw_data.current.visibility is not None:
            vis_miles = round(raw_data.current.visibility / 1609.34, 1)

        return cls(
            timestamp=raw_data.current.time,
            temperature=raw_data.current.temperature_2m,
            feels_like=raw_data.current.apparent_temperature,
            humidity=raw_data.current.relative_humidity_2m,
            dewpoint=raw_data.current.dewpoint,
            pressure=raw_data.current.pressure_msl,
            wind_speed=raw_data.current.wind_speed_10m,
            wind_direction=raw_data.current.wind_direction_10m,
            wind_gusts=raw_data.current.wind_gusts_10m,
            weather_code=raw_data.current.weather_code,
            visibility=vis_miles,
            uv_index=raw_data.current.uv_index,
            source="Open-Meteo" # Data Lineage Flag
        )