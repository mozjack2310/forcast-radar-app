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

def get_weather_code(condition_text: str) -> int:
    """Maps the raw NWS English description to a 0-7 spritesheet index."""
    text = condition_text.lower()
    
    # Check for severe/precipitation first
    if "snow" in text or "ice" in text or "freez" in text or "flur" in text:
        return 8
    # Check for wind/breezy states
    elif "wind" in text or "breez" in text:
        return 7
    elif "thunder" in text or "t-storm" in text or "storm" in text:
        return 6
    elif "rain" in text or "shower" in text or "drizzle" in text:
        return 5
    elif "fog" in text or "haze" in text:
        return 4
    # Check for cloud coverage
    elif "mostly cloudy" in text or "overcast" in text:
        return 3
    elif "cloud" in text: # Catches generic "Cloudy"
        return 3
    elif "partly" in text or "mostly clear" in text:
        return 1
    else:
        # Fallback to Clear / Sunny
        return 0

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
        # 1. Get the raw text from the telemetry dictionary
        raw_text = telemetry.get("condition_text", telemetry.get("conditionText", "Unknown"))

        # 2. Extract the integer code BEFORE we abbreviate or slice the string!
        weather_code = get_weather_code(raw_text)

        # 3. The Smart Abbreviation Loop (Your existing dictionary code)
        for key in sorted(CONDITION_MAP.keys(), key=len, reverse=True):
            raw_text = raw_text.replace(key, CONDITION_MAP[key])

        condition_string = raw_text[:10].strip()

        # ... (Your existing wind speed logic) ...

# 3. The Smart Abbreviation Loop
        for key in sorted(CONDITION_MAP.keys(), key=len, reverse=True):
            raw_text = raw_text.replace(key, CONDITION_MAP[key])

        # Safely slice it so it doesn't crash the matrix
        condition_string = raw_text[:10].strip()

        # ... (Your exact wind speed logic goes here) ...
        wind_speed_raw = telemetry.get("wind_speed", telemetry.get("windSpeed", 0))
        if not wind_speed_raw:
            wind_speed_raw = 0
            
        wind_speed = int(round(float(wind_speed_raw), 0))
        wind_string = "Calm"
        
        wind_dir = telemetry.get("wind_direction", telemetry.get("windDirection"))
        if wind_speed > 0 and wind_dir is not None:
            compass_dir = degrees_to_compass(float(wind_dir))
            wind_string = f"{compass_dir} {wind_speed} mph"

        # 4. The Final Hybrid Payload (Defined ONLY ONCE!)
        payload = {
            "t": telemetry.get("temperature", 0),  # Assuming it's already Fahrenheit
            "c": condition_string,                 # Uses our perfectly sliced abbreviation
            "qc": 1 if telemetry.get("is_cached") else 0, # Dynamic health check
            "wnd": wind_string,                    # Safe to use because it was defined above
            "wc": weather_code                     # The integer for our upcoming Spritesheet!
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