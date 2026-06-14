# Start with a lightweight Python 3.12 environment
FROM python:3.12-slim

# Set the working directory inside the container
WORKDIR /app

# Copy your requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all your proxy code into the container
COPY . .

# Expose port 5000 strictly for internal Docker network traffic
EXPOSE 5000

# Start the Gunicorn server using your existing config file
CMD ["gunicorn", "-c", "gunicorn.conf.py", "weather_proxy:app"]