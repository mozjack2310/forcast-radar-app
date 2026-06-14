from logger import setup_logger
import requests
import time
import json
import redis
import os
from dotenv import load_dotenv

load_dotenv()

# ALZ024 is the specific NWS zone for Jefferson County, AL
NWS_ALERTS_URL = "https://api.weather.gov/alerts/active?point=33.56,-86.75"

# NWS strictly requires a User-Agent with contact info
HEADERS = {
    "User-Agent": "(ForRad Dashboard, bjgarner@uab.edu)",
    "Accept": "application/geo+json"
}

# Connect to the LXC cache
cache = redis.Redis(
    host=os.getenv('REDIS_IP'),
    port=6379,
    password=os.getenv('REDIS_PASSWORD'),
    decode_responses=True
)

# Initialize the logger with a specific name for this daemon
logger = setup_logger("loggerNwsAlert")

def fetch_alerts():
    logger.info("Polling NWS for active alerts", extra={"context": {"zone": "ALZ024"}})
    
    try:
        response = requests.get(NWS_ALERTS_URL, headers=HEADERS, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        features = data.get("features", [])
        
        if not features:
            logger.info("Clear skies. No active alerts.", extra={"context": {"alert_count": 0}})
            cache.setex("active_alert", 60, "None")
            return None
            
        # If there ARE alerts, let's parse the most severe one
        for alert in features:
            props = alert.get("properties", {})
            event = props.get("event", "Unknown Alert")
            severity = props.get("severity", "Unknown")
            
            # Using logger.warning here so active alerts stand out in your log filters
            logger.warning(
                "Active weather alert detected", 
                extra={"context": {
                    "event": event, 
                    "severity": severity,
                    "action": "cached_to_redis"
                }}
            )
            
            cache.setex("active_alert", 60, event)
            return 
            
    except requests.exceptions.RequestException:
        # exc_info=True automatically captures the traceback and the specific error (e)
        logger.error("Failed to reach NWS API", exc_info=True, extra={"context": {"target_url": NWS_ALERTS_URL}})
        return None
        
    except redis.exceptions.ConnectionError:
        logger.error("Could not connect to Redis cache", exc_info=True, extra={"context": {"redis_host": os.getenv('REDIS_IP')}})
        return None

if __name__ == "__main__":
    logger.info("Starting ForRad Alert Daemon")
    
    try:
        while True:
            fetch_alerts()
            # Sleep for exactly 60 seconds before polling again
            time.sleep(60)
            
    except KeyboardInterrupt:
        logger.info("Daemon gracefully shut down by user", extra={"context": {"exit_reason": "KeyboardInterrupt"}})
