# This file simply acts as a global state holder for our Redis connection.
# It prevents circular imports between main.py and our route files.

redis_client = None

# 2. This is the function telemetry.py and alerts.py are trying to import!
def get_redis_client():
    """
    Returns the active Redis client initialized by main.py
    """
    return redis_client