# Use the official Red Hat UBI 10 Python 3.12 image as the base
FROM registry.access.redhat.com/ubi10/python-312:latest


# Set the working directory inside the container
WORKDIR /app

# Install the exact dependencies your script imports
# Using pip directly here saves you from needing a separate requirements.txt file
RUN pip install --no-cache-dir requests redis python-dotenv

# Copy your alert_daemon.py, logger.py, and any .env files into the container
COPY . .

# The -u flag is critical. It forces Python to run "unbuffered", 
# ensuring your custom logger instantly prints to the Docker terminal logs.
CMD ["python", "-u", "alert_daemon.py"]