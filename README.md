# ForRad: Birmingham Forecast & Radar System
## Engineering Documentation & Systems Overview

> ForRad is an enterprise-grade weather telemetry and visualization system specifically designed to monitor meteorological data for Birmingham, AL (Station KBHM). This document outlines the core infrastructure, networking, and API handling designed to maintain high availability and compliance with external data providers.

---

### 1. Dual-Pipeline Architecture
To serve both physical hardware monitors and web-based users efficiently, ForRad implements a dual-pipeline routing architecture hosted on an internal RHEL Virtual Machine (`192.168.50.101`).

* **Pipeline A (Hardware Telemetry):** Dedicated to an Adafruit microcontroller driving a hardware matrix board. This pipeline bypasses the heavy web frontend and directly queries the Flask proxy at `http://192.168.50.101:5000/api/matrix` to fetch raw weather data. A loop timer smoothly cycles the board through temperature, wind data, and active weather alerts.
* **Pipeline B (Web Clients):** Serves end-users navigating to the interactive UI. Web clients hit the Next.js frontend deployed at `http://192.168.50.101:3000`. This visually displays the Birmingham forecast, radar maps, and active alert banners.

### 2. Docker Compose Networking & Topology
The entire application is containerized and relies on a custom Docker bridge network named `forrad-net` to enable secure, DNS-based inter-container communication without exposing internal services to the broader LAN.

The `docker-compose.yml` orchestrates four primary services:

* **`forrad-redis`:** An Alpine-based Redis 7.4 cache that acts as the high-speed data bridge. It runs internally on port `6379` without requiring password authentication since the `forrad-net` bridge acts as an isolated network layer.
* **`forrad-weather-proxy`:** A Flask-based backend exposed on TCP port `5000` (allowed via the RHEL `firewalld`). It securely connects to the Redis cache and serves raw UTF-8 payloads to both the Next.js app and the Adafruit hardware.
* **`forrad-alerts-daemon`:** A background Python worker that constantly fetches and processes weather alerts independently.
* **`forrad-nextjs-gateway`:** The React/Next.js frontend application serving the client UI on port `3000`.

### 3. API Gateway & NWS Rate Limit Protection
The National Weather Service (NWS) API enforces strict access rules. If a system hammers their endpoints or fails to provide a registered `User-Agent` containing contact information (e.g., `(forcast-radar-app, bjgarner@uab.edu)`), requests will be blocked.

To protect the system from rate limits and NWS IP bans, the Next.js application acts as an API gateway rather than letting clients fetch data directly.

* **Internal Routing:** The Next.js frontend is configured to never communicate directly with NWS. Instead, it queries the internal Flask proxy via the internal Docker network (`NEXT_PUBLIC_API_URL=http://weather-proxy:5000`).
* **Redis Caching Mechanism:** When Next.js requests data, the Flask proxy queries the internal Redis cache for specific keys like `nws_current_forecast` or `active_alert`. Background daemons periodically update this cache, ensuring the data is fresh.
* **Traffic Mitigation:** Because the proxy serves responses directly from Redis memory, thousands of concurrent web clients hitting the Next.js frontend will never trigger additional outbound NWS requests. Furthermore, the Flask proxy appends specific `Cache-Control` headers (`no-store, no-cache, must-revalidate`) to prevent browser-level caching conflicts, ensuring clients always receive the single, synchronized version of truth stored in Redis.

### 4. Future Infrastructure Roadmap (v1.1+)
As the enterprise architecture scales, the following upgrades are planned:

* **Observability & Telemetry:** Configuring SNMP polling on the pfSense router and utilizing Zabbix to monitor Docker containers, with Grafana + Loki for centralized log aggregation.
* **High Availability:** Deploying a second replica of the Flask proxy load-balanced by HAProxy to ensure the Adafruit hardware matrix never drops connection.
* **Cloud Archiving & Security:** Implementing a lightweight cron job to archive historical payloads to an AWS S3 bucket, and setting up a Zero-Trust Cloudflare Tunnel (`cloudflared`) to expose the dashboard externally without opening firewall ports.
