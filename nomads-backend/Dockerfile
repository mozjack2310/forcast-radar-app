# Standardize on the UBI 9 image to match your weather-proxy
FROM registry.access.redhat.com/ubi9/python-312:latest

WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the daemon script
COPY . .

# Expose the new port
EXPOSE 5001

# Command to launch the app
CMD ["python", "nomads_daemon.py"]