# Use the official Red Hat UBI 10 Python 3.12 image as the base
FROM registry.access.redhat.com/ubi9/python-312:latest


# Set the working directory inside the container
WORKDIR /app

# Install the exact dependencies your script imports
### Using pip directly here saves you from needing a separate requirements.txt file
### RUN pip install --no-cache-dir requests redis python-dotenv
# Copy your requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your application files, and any .env files into the container
COPY . .

# Expose the port your FastAPI app will run on
EXPOSE 8000

# The -u flag is critical. It forces Python to run "unbuffered", 
# ensuring your custom logger instantly prints to the Docker terminal logs.
# CMD ["python", "-u", "alert_daemon.py"]  <--- This line is commented out to avoid running the daemon immediately. Instead, we will use uvicorn to run the FastAPI app.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]