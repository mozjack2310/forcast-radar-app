# ForRad: Enterprise Weather & Hardware Telemetry Pipeline

![Architecture: RHEL -> Redis -> Next.js -> CircuitPython](https://img.shields.io/badge/Architecture-Distributed-blue)
![Status: Operational](https://img.shields.io/badge/Status-Operational-brightgreen)

ForRad is a full-stack, highly available weather data pipeline designed to ingest, distill, and serve localized meteorological telemetry. It spans from cloud-based government APIs down to a bare-metal, gamma-corrected Adafruit LED matrix.

Engineered with a Systems Administration mindset, the pipeline prioritizes fault tolerance, automated active caching, and strict decoupling of heavy UI rendering from lightweight IoT hardware payloads.

## 🏗️ The Architecture

The system is broken into three distinct, independently deployable layers:

1. **The RHEL 10 Proxy Engine (The Core)**
   - A Python/Flask daemon runs on a Red Hat Enterprise Linux environment.
   - Performs highly specific spatial queries against the National Weather Service (NWS) API to capture hyper-local severe weather polygons.
   - **Active Caching:** A Linux `cron` job aggressively warms a local Redis database every 10 minutes, ensuring the API never rate-limits and downstream clients never wait for network resolution.

2. **The Next.js Dashboard (The Human UI)**
   - A modern React frontend utilizing Tailwind CSS and server-side cache overriding (`force-dynamic`).
   - Fetches the heavy JSON payload from the RHEL Proxy to render complex weather carousels and Dark Mode radar maps.
   - Features React-native graceful degradation (e.g., passing native `null` state to unmount Severe Weather banners silently when skies are clear).

3. **The Bare-Metal Microservice (The Hardware UI)**
   - An Adafruit MatrixPortal M4 powering a HUB75 RGB Matrix.
   - Runs a CircuitPython infinite loop that completely bypasses local Windows/WSL2 firewalls by routing directly to a distilled `/api/matrix` micro-endpoint on the RHEL server.
   - Consumes an ultra-lean 3-key JSON payload to prevent microcontroller memory overflow.

## ✨ Key Technical Features

- **High Availability API Failover:** The RHEL proxy continuously monitors upstream NWS health. If the government servers drop the connection, the proxy automatically fails over to the **Open-Meteo API** to fetch baseline temperature and condition metrics, guaranteeing the physical hardware never goes dark.
- **Hardware-Aware Distillation:** The RHEL proxy actively intercepts NWS telemetry and processes it through a custom Python dictionary (`condition_map`) to translate verbose meteorological terms into compact abbreviations. A secondary strict 10-character (`64px`) truncation failsafe guarantees dynamic word combinations never horizontally clip off the physical LED matrix.
- **Hardware Failsafes:** The LED matrix gracefully degrades to custom error states (`BOOTING`, `ERR`, `OFFLINE`) with dynamic network sleep-retry intervals if the local proxy drops.
- **Gamma-Corrected Rendering:** Programmatic hexadecimal color scaling prevents "gamma crush" on the physical LEDs, allowing for readable, low-brightness indoor operation.

## 🛠️ Tech Stack

- **OS / Network:** Red Hat Enterprise Linux 10, WSL2, Proxmox
- **Backend:** Python 3, Flask, Redis, systemd, crontab
- **Frontend:** Next.js (React), Tailwind CSS, Leaflet Maps
- **Hardware:** Adafruit MatrixPortal M4, CircuitPython 8+, HUB75 64x32 RGB Matrix

## 🚀 Deployment Operations

Because the architecture is strictly decoupled, the core proxy can run headless, or the entire stack can be brought online simultaneously.

### 1. RHEL Proxy Initialization (Required)

Ensure Redis is active, then initialize the Flask daemon and the cache-warming cron job:

```bash
sudo systemctl enable redis
sudo systemctl start forrad-proxy.service
```

### 2. Next.js Dashboard Deployment (Optional UI)

The web interface acts as a stateless glass pane, rendering the live Redis database instantly upon loading:

```Bash
npm run build
npm run start
```

### 3. Hardware Matrix Deployment (Optional UI)

The MatrixPortal requires a settings.toml file at the root of the CIRCUITPY drive:

```Ini, TOML
CIRCUITPY_WIFI_SSID="Your_Network"
CIRCUITPY_WIFI_PASSWORD="Your_Password"
```

Once powered via USB-C, code.py will automatically execute, authenticate, and begin pulling distilled telemetry directly from the headless proxy.
