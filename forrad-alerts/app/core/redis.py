# This file simply acts as a global state holder for our Redis connection.
# It prevents circular imports between main.py and our route files.

redis_client = None