from logger import setup_logger
from flask import Flask, jsonify, make_response
from flask_cors import CORS #added CORS library
import requests
import redis
import os
from dotenv import load_dotenv
import json

# Load the secrets from your new .env file
load_dotenv()

app = Flask(__name__)
CORS(app)
@app.after_request
def add_header(response):
    # This prevents Next.js and browsers from aggressively caching ANY route
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    return response
# Force Flask to send raw UTF-8 characters instead of ASCII escape codes
app.json.ensure_ascii = False

# Connect securely to the Debian LXC Cache
cache = redis.Redis(
    host=os.getenv('REDIS_IP'),
    port=6379,
    password=os.getenv('REDIS_PASSWORD'),
    decode_responses=True
)

#Initialization of Logger
logger = setup_logger("loggerWeatherProxy")


# --- WX ALERTS ROUTE  ---

@app.route('/api/alerts', methods=['GET'])
def get_active_alerts():
    try:
        # Reach into the cache
        active_alert = cache.get("active_alert")
        
        # If the key expired (daemon died) or is explicitly "None"
        if active_alert == "None" or active_alert is None:
            return jsonify({"alert": None}), 200
            
        # If there is a live Tornado Warning, Severe Thunderstorm, etc.
        return jsonify({"alert": active_alert}), 200
        
    except redis.exceptions.ConnectionError:
        # Failsafe: If the LXC goes down, the dashboard just shows no alerts 
        # instead of throwing a massive 500 error on the frontend.
        return jsonify({"alert": None, "error": "Cache offline"}), 200


# --- OPEN METEO ROUTE ---


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast?latitude=33.55&longitude=-86.89&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph"

@app.route('/matrix-data', methods=['GET'])
def get_matrix_data():
    # NEW CACHE KEY: This automatically busts the old cache and reflects the new payload!
    cache_key = "open_meteo_bridge_data"

    try:
        # --- 1. THE CACHE CHECK ---
        cached_data = cache.get(cache_key)


        if cached_data:
            logger.info("Open-Meteo Cache HIT", extra={"context": {"endpoint": "/matrix-data", "source": "redis"}})
            
            # Redis stores strings, so we unpack the JSON string back into a Python dictionary
            meteo_dict = json.loads(cached_data)
            
            # This specific route only needs to return the temperature to the client
            payload = {"temperature": meteo_dict["temperature"], "status": "Cache Hit"}
            response = make_response(jsonify(payload))
            response.headers['Connection'] = 'close'
            return response

        # --- 2. THE API FETCH (Cache Miss) ---
        logger.info("Open-Meteo Cache MISS. Fetching live API", extra={"context": {"endpoint": "/matrix-data", "source": "api"}})
        meteo_response = requests.get(OPEN_METEO_URL, timeout=10)

        if meteo_response.status_code != 200:
            payload = {
                "temperature": "ERR",
                "status": f"Upstream API Error: {meteo_response.status_code}"
            }
            response = make_response(jsonify(payload))
            response.headers['Connection'] = 'close'
            return response

        # --- 3. PARSE AND SAVE TO CACHE ---
        meteo_data = meteo_response.json()
        current = meteo_data["current_weather"]

        # Extract our three valuable data points
        current_temp = current["temperature"]
        raw_wind_speed = current["windspeed"]
        raw_wind_dir = current["winddirection"]

        # Package them into a dictionary (The Bridge Payload)
        bridge_data = {
            "temperature": current_temp,
            "wind_speed": raw_wind_speed,
            "wind_dir": raw_wind_dir
        }

        # Save the entire dictionary to Redis as a JSON string for 15 minutes (900 seconds)
        cache.setex(cache_key, 900, json.dumps(bridge_data))

        # Return just the temperature to the client for this specific endpoint
        payload = {
            "temperature": current_temp,
            "status": "Success (Live Fetch)"
        }
        
        response = make_response(jsonify(payload))
        response.headers['Connection'] = 'close'
        return response

    except Exception as e:
        logger.error("Failed to fetch/parse Open-Meteo data", exc_info=True, extra={"context": {"endpoint": "/matrix-data"}})
        # Failsafe error handling so the Matrixboard doesn't crash
        payload = {"temperature": "ERR", "status": f"Proxy Error: {str(e)}"}
        response = make_response(jsonify(payload))
        response.headers['Connection'] = 'close'
        return response

# --- NWS ROUTE ---


# The NWS requires a User-Agent with contact info, otherwise they block the request
NWS_HEADERS = {
    'User-Agent': '(ForRad Dashboard, bjgarner@uab.edu)',
    'Accept': 'application/geo+json'
}

# Replace with your specific BMX gridpoint URL!
NWS_URL = "https://api.weather.gov/stations/KBHM/observations/latest"

@app.route('/nws-data', methods=['GET'])
def get_nws_data():
    from flask import request

    cache_key = "nws_current_forecast"
    fresh_key = "nws_cache_fresh"
    last_mod_key = "nws_last_modified"

    # Check if the client sent a "force_refresh=true" query parameter
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    if force_refresh:
        logger.info("Force refresh requested by client. Bypassing cache.", extra={"context": {"endpoint": "/nws-data", "source": "client"}})
    else:
        logger.info("Client request received for NWS data", extra={"context": {"endpoint": "/nws-data", "source": "client"}})
    
    try:
        # --- 1. THE FRESHNESS CHECK ---
        is_fresh = cache.get(fresh_key)
        cached_forecast = cache.get(cache_key)
        
        # If the data is under an hour old and we aren't forcing a refresh, return it instantly
        if is_fresh and cached_forecast and not force_refresh:
            logger.info("NWS Cache HIT! Serving from Redis.", extra={"context": {"endpoint": "/nws-data", "source": "redis"}})
            carousel_payload = json.loads(cached_forecast)
            carousel_payload["status"] = "Cache Hit"

            response = make_response(jsonify(carousel_payload))
            response.headers['Connection'] = 'close'
            return response
         
        # --- 2. THE CONDITIONAL API FETCH (Cache Stale or Miss) ---
        logger.info("NWS Cache STALE or MISS! Checking Weather.gov...", extra={"context": {"endpoint": "/nws-data", "source": "api"}})
        
        headers = NWS_HEADERS.copy()
        last_modified_val = cache.get(last_mod_key)
        
        # Only inject the conditional header if we actually have a saved timestamp and aren't forcing a refresh
        if last_modified_val and not force_refresh:
            headers['If-Modified-Since'] = last_modified_val
        
        nws_response = requests.get(NWS_URL, headers=headers, timeout=10)
        
        # HANDLE 304 NOT MODIFIED: NWS says data hasn't changed
        if nws_response.status_code == 304 and cached_forecast:
            logger.info("NWS returned 304 Not Modified. Extending cache freshness for 1 hour.", extra={"context": {"endpoint": "/nws-data", "source": "api"}})
            
            # Renew the 1-hour freshness window
            cache.setex(fresh_key, 3600, "true")

            # We must re-save the payload to push its expiration back out!
            cache.setex(cache_key, 3600, cached_forecast)
            
            carousel_payload = json.loads(cached_forecast)
            carousel_payload["status"] = "Cache Hit (Verified Fresh via 304)"
            response = make_response(jsonify(carousel_payload))
            response.headers['Connection'] = 'close'
            return response

        # Handle upstream server errors gracefully
        if nws_response.status_code != 200:
            # Failsafe: if NWS is broken but we have an old cached version, use it!
            if cached_forecast:
                logger.warning(f"NWS returned status {nws_response.status_code}. Falling back to stale cache.")
                carousel_payload = json.loads(cached_forecast)
                carousel_payload["status"] = f"Stale Fallback (NWS Error {nws_response.status_code})"
                return make_response(jsonify(carousel_payload))

            payload = {
                "forecast": "ERR",
                "status": f"NWS API Error: {nws_response.status_code}"
            }
            response = make_response(jsonify(payload))
            response.headers['Connection'] = 'close'
            return response
            
        # --- 3. PARSE AND CACHE NEW DATA (Status 200 OK) ---
        nws_data = nws_response.json()
        
        # In the Observations endpoint, data is directly under 'properties'
        current = nws_data.get("properties", {})
        
        # 1. Temperature: Check NWS primary sensor first
        temp_c = current.get("temperature", {}).get("value")
        data_source = "NWS"
        
        if temp_c is not None:
            temp_f = round((temp_c * 9/5) + 32)
            temp_display = str(temp_f)
        else:
            # FALLBACK: NWS sensor failed, reach into Open-Meteo cache
            bridge_json = cache.get("open_meteo_bridge_data")
            if bridge_json:
                bridge_data = json.loads(bridge_json)
                om_temp = bridge_data.get("temperature")
                if om_temp is not None:
                    temp_f = round(om_temp)
                    temp_display = f"{temp_f}*"  # Append asterisk for Matrix board
                    data_source = "OM"
                else:
                    temp_display = "--"
            else:
                temp_display = "--"

        # 2. Condition: The string key is now 'textDescription'
        raw_forecast = current.get("textDescription") or "Unknown"

        # --- Fetch Wind from our Redis Bridge ---
        bridge_json = cache.get("open_meteo_bridge_data")
        
 # --- Fetch Wind from our Redis Bridge ---
        bridge_json = cache.get("open_meteo_bridge_data")
        
        if bridge_json:
            bridge_data = json.loads(bridge_json)
            wind_speed = bridge_data.get("wind_speed")
            wind_dir = bridge_data.get("wind_dir")
            
            if wind_speed is not None:
                wind_speed_mph = round(wind_speed)
                if wind_speed_mph == 0:
                    wind = "Calm"
                elif wind_dir is not None:
                    wind_dir_str = degrees_to_compass(wind_dir)
                    wind = f"{wind_dir_str} {wind_speed_mph} mph"
                else:
                    wind = f"{wind_speed_mph} mph"
            else:
                wind = "-- mph"
                
        else:
            # Failsafe fallback: NWS Observations report wind in km/h
            wind_dir_raw = current.get("windDirection", {}).get("value")
            wind_speed_kmh = current.get("windSpeed", {}).get("value")
            
            if wind_speed_kmh is not None:
                wind_speed_mph = round(wind_speed_kmh * 0.621371)
                if wind_speed_mph == 0:
                    wind = "Calm"
                elif wind_dir_raw is not None:
                    wind_dir_str = degrees_to_compass(wind_dir_raw)
                    wind = f"{wind_dir_str} {wind_speed_mph} mph"
                else:
                    wind = f"{wind_speed_mph} mph"
            else:
                wind = "-- mph"

        # --- Shorten the forecast right after extracting it ---
        shortened_forecast = shorten_forecast(raw_forecast)
        
        # Build the Carousel Book
        carousel_payload = {
            "page_1_overview": {
                "temp": f"{temp_display}F" if temp_display != "--" else "--F",
                "short_desc": shortened_forecast
            },
            "page_2_wind": {
                "label": "WIND",
                "value": wind
            },
            "page_3_ticker": {
                "text": f"Now: {temp_display}F | {raw_forecast} | {wind}"
            },
            "source": data_source,  # <-- NEW: Tag the payload origin
            "status": "Success (Live NWS Fetch)"
        }

        # Extract and save the new Last-Modified header for the next validation check
        new_last_mod = nws_response.headers.get('Last-Modified')
        if new_last_mod:
            cache.set(last_mod_key, new_last_mod)

        # Save the primary payload to Redis with a long 30-minute expiration safety net
        cache.setex(cache_key, 1800, json.dumps(carousel_payload))
        
        # Set the freshness token to lock this data in for 15 minutes, preventing Excessive API calls
        cache.setex(fresh_key, 900, "true")

        response = make_response(jsonify(carousel_payload))
        response.headers['Connection'] = 'close'
        return response

    except Exception as e:
        logger.error(f"NWS API Failed: {e}")
        
        stale_data_string = cache.get(cache_key)
        if stale_data_string:
            logger.warning("Serving stale cache to prevent pipeline crash.")
            stale_payload = json.loads(stale_data_string)
            stale_payload['status'] = "Stale Cache (NWS Offline)"
            stale_payload['stale_fallback'] = True 
            
            response = make_response(jsonify(stale_payload))
            response.headers['Connection'] = 'close'
            return response
        else:
            payload = {"forecast": "ERR", "status": f"Proxy Error: {str(e)}"}
            response = make_response(jsonify(payload))
            response.headers['Connection'] = 'close'
            return response
    
@app.route('/api/matrix')
def matrix_endpoint():
    # 1. Ask Redis for the EXACT key you used on line 216
    cached_string = cache.get("nws_current_forecast")
    
    # Failsafe: If the Matrix asks for data before the main app has cached it
    if not cached_string:
        return {"t": "--", "c": "BOOTING", "qc": 0}

    try:
        # 2. Unpack the Redis string back into a usable Python dictionary
        import json
        data = json.loads(cached_string)

        # 1. Grab temperature string and strip symbols, keeping only numbers
        raw_temp = data.get('page_1_overview', {}).get('temp', '--')
        clean_temp = "".join(filter(str.isdigit, raw_temp)) or "--"
        
        # 2. Shorten condition to 10 chars max to prevent memory overflow
        raw_cond = data.get('page_1_overview', {}).get('short_desc', 'Unknown')
        clean_cond = raw_cond[:10].strip() if raw_cond else "Unknown"
        
        # 3. Health check
        is_stale = data.get('stale_fallback', False)
        qc_status = 0 if is_stale else 1
        
        return jsonify({
            "t": clean_temp,
            "c": clean_cond,
            "qc": qc_status
        })
        
    except Exception as e:
        print(f"Matrix API Error: {e}")
        return {"t": "--", "c": "API ERROR", "qc": 0}

if __name__ == '__main__':
    logger.info("Starting Weather Proxy Server", extra={"context": {"host": "0.0.0.0", "port": 5000}})
    app.run(host='0.0.0.0', port=5000)
