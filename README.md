# ForRad: Enterprise Weather & Hardware Telemetry Pipeline

![Architecture: RHEL -> Redis -> Next.js -> CircuitPython](https://img.shields.io/badge/Architecture-Distributed-blue)
![Status: Operational](https://img.shields.io/badge/Status-Operational-brightgreen)

ForRad is a full-stack, highly available weather data pipeline designed to ingest, distill, and serve localized meteorological telemetry. It spans from cloud-based National Weather Service (NWS) government APIs down to a bare-metal, gamma-corrected Adafruit LED matrix.

Engineered with a Systems Administration mindset, the pipeline prioritizes fault tolerance, automated active caching, and strict decoupling of heavy UI rendering from lightweight IoT hardware payloads.

## 🏗️ The Architecture

The system is broken into three distinct operational layers:

1. **The RHEL 10 Proxy Engine (The Brains)**
   - A Python/Flask daemon runs on a Red Hat Enterprise Linux environment.
   - It performs highly specific spatial queries (`?point=33.56,-86.75`) against the NWS API to capture hyper-local severe weather polygons (avoiding the blind spots of zone-only polling).
   - **Active Caching:** A Linux `cron` job aggressively warms a local Redis database every 10 minutes, ensuring the API never rate-limits and downstream clients never wait for network resolution.

2. **The Next.js Dashboard (The UI)**
   - A modern React frontend utilizing Tailwind CSS.
   - Fetches the heavy JSON payload from the RHEL Proxy to render complex weather carousels and Dark Mode radar maps.
   - Features React-native graceful degradation (e.g., passing native `null` state to unmount Severe Weather banners silently when skies are clear).

3. **The Bare-Metal Microservice (The Hardware)**
   - An Adafruit MatrixPortal M4 powering a HUB75 RGB Matrix.
   - Runs a CircuitPython infinite loop that completely bypasses local Windows/WSL2 firewalls by routing directly to a distilled `/api/matrix` micro-endpoint on the RHEL server.
   - Consumes an ultra-lean 3-key JSON payload to prevent microcontroller memory overflow.

## ✨ Key Technical Features

- **Hardware Failsafes:** The LED matrix gracefully degrades to custom error states (`BOOTING`, `ERR`, `OFFLINE`) with dynamic network sleep-retry intervals if the proxy drops.
- **Gamma-Corrected Rendering:** Programmatic hexadecimal color scaling prevents "gamma crush" on the physical LEDs, allowing for readable, low-brightness indoor operation.
- **Micro-Routing:** The RHEL proxy utilizes a shared Redis cache to serve heavy data weights to web clients and lightweight, Regex-stripped payloads (`{"t": "69", "c": "M. Cldy", "qc": 1}`) to IoT clients simultaneously.

## 🛠️ Tech Stack

- **OS / Network:** Red Hat Enterprise Linux 10, WSL2, Proxmox
- **Backend:** Python 3, Flask, Redis, systemd, crontab
- **Frontend:** Next.js (React), Tailwind CSS, Leaflet Maps
- **Hardware:** Adafruit MatrixPortal M4, CircuitPython 8+, HUB75 64x32 RGB Matrix

## 🚀 Deployment Operations

### 1. RHEL Proxy Setup

Ensure Redis is active, then initialize the Flask daemon:

```bash
sudo systemctl enable redis
sudo systemctl start forrad-proxy.service
```
