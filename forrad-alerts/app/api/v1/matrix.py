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
        # NOTE: Replace this dictionary with your actual internal telemetry fetch call!
        # Since this route is now INSIDE your alerts API, you can just call your 
        # internal function or database directly instead of doing an HTTP fetch.
        telemetry = await get_current_telemetry() 
        
        raw_text = telemetry.get("conditionText", "Unknown")

        # Apply the dictionary via case-insensitive regex
        for long_phrase, short_phrase in CONDITION_MAP.items():
            raw_text = re.sub(long_phrase, short_phrase, raw_text, flags=re.IGNORECASE)

        # Wind calculation
        wind_speed = round(telemetry.get("windSpeed", 0))
        wind_string = "Calm"
        if wind_speed > 0 and telemetry.get("windDirection") is not None:
            compass_dir = degrees_to_compass(telemetry.get("windDirection"))
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