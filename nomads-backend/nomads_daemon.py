from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import pandas as pd
from datetime import datetime
import random

app = Flask(__name__)
CORS(app) # Allow Next.js to communicate with Flask

@app.route('/api/forecast')
def get_forecast():
    """
    Fetches the HRRR temperature forecast for a specific Lat/Lon point via Open-Meteo.
    """
    lat = float(request.args.get('lat', 33.5186))
    lon = float(request.args.get('lon', -86.8104))

    try:
        print(f"Querying Open-Meteo HRRR for Lat: {lat}, Lon: {lon}")
        
        # Using Open-Meteo's HRRR seamless endpoint
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "temperature_2m",
            "temperature_unit": "fahrenheit",
            "models": "gfs_hrrr",
            "forecast_days": 1,
            "timezone": "America/Chicago" # Central time zone for Birmingham, AL
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Extract data arrays from the JSON response
        times_raw = data['hourly']['time']
        temps_f = data['hourly']['temperature_2m']
        
        # Convert ISO8601 strings (e.g., "2026-06-17T14:00") to "02 PM" format
        times_str = pd.to_datetime(times_raw).strftime('%I %p').tolist()

        # Combine into a JSON-friendly array of objects for Recharts
        chart_data = [{"time": t, "temp": round(f, 1)} for t, f in zip(times_str, temps_f)]

        return jsonify({"status": "success", "source": "Open-Meteo HRRR", "data": chart_data})

    except Exception as e:
        print(f"API Unavailable ({e}). Falling back to simulation.")
        
        base_temp = 75.0
        mock_data = []
        for i in range(18):
            # Simulate a diurnal temperature curve (The Inverted V!)
            temp = base_temp + (random.uniform(-1, 1) + (5 if i < 9 else -5))
            time_label = (datetime.now() + pd.Timedelta(hours=i)).strftime('%I %p')
            mock_data.append({"time": time_label, "temp": round(temp, 1)})
            base_temp = temp

        return jsonify({"status": "simulated", "source": "Fallback", "data": mock_data})

if __name__ == '__main__':
    app.run(port=5001, debug=True)