import json
import math
import re
from app.api.v1.telemetry import get_current_telemetry
from fastapi import APIRouter, Response # Add Response to your fastapi imports

router = APIRouter()

# 1. The Smart Dictionary
CONDITION_MAP = {
    "Partly Cloudy": "P. Cldy",
    "Chance Showers And Thunderstorms": "Chc TStorm",
    "Mostly Cloudy": "M. Cldy",
    "Rain and Snow": "Rain/Snw",
    "Thunderstorms": "T-Storms",
    "Slight Chance": "Sl Chc",
    "Areas Of": "",
    "Partly Sunny": "P. Snny",
    "Light": "Lgt",
    "Chance": "Chc",
    "Slight": "Slgt",
    "Heavy": "Hvy",
    "Patchy": "Ptchy",
    "Showers": "Shwrs",
    "Drizzle": "Drzzl",
    "Flurries": "Flur",
    "Sunny": "Sun",
    "Clear": "Clr",
    "Breezy": "Brzy",
    "Freezing": "Frz"
}

def degrees_to_compass(d: float) -> str:
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    ix = round(d / 22.5)
    return dirs[ix % 16]

# 2. The Hardware Endpoint (Using @app or @router depending on your setup)
@router.get("", response_model=None) # Adjust decorator to match your FastAPI setup
async def get_matrix_payload():
    try:
        # 1. Fetch the data (Could be a Dict, could be a Pydantic Model)
        raw_data = await get_current_telemetry()
        
        # 2. Safely normalize it to a dictionary!
        if isinstance(raw_data, dict):
            telemetry = raw_data           # It was a cache hit, already a dict!
        else:
            telemetry = raw_data.model_dump() # It was a cache miss, convert the object!

        # 3. Use the safe parsing we discussed to handle both snake_case and camelCase
        raw_text = telemetry.get("condition_text", telemetry.get("conditionText", "Unknown"))
        
        wind_speed_raw = telemetry.get("wind_speed", telemetry.get("windSpeed", 0))
        if not wind_speed_raw:
            wind_speed_raw = 0
            
        wind_speed = round(float(wind_speed_raw), 0)
        wind_string = "Calm"

        wind_dir = telemetry.get("wind_direction", telemetry.get("windDirection"))
        if wind_speed > 0 and wind_dir is not None:
            compass_dir = degrees_to_compass(float(wind_dir))
            wind_string = f"{compass_dir} {wind_speed} mph"

        # Build the tiny payload
        payload = {
            "t": round((telemetry.get("temperature", 0) * 9) / 5 + 32),
            "c": raw_text,
            "qc": 1,
            "wnd": wind_string
        }

        # Return a native, un-chunked, bare-metal Response
        return Response(
            content=json.dumps(payload),
            media_type="application/json",
            headers={"Connection": "close"}
        )

    except Exception as e:
        print(f"Matrix Bridge Error: {e}")
        return Response(
            content=json.dumps({"err": "Offline"}),
            status_code=500,
            media_type="application/json",
            headers={"Connection": "close"}
        )