"use client";

import React, { useEffect, useState } from "react";

// This interface perfectly mirrors our backend Pydantic 'ForRadAlert' model.
// This is the power of the architecture: the front and back speak the exact same language.
interface ForRadAlert {
  alert_id: string;
  event_type: string;
  severity_level: string;
  urgency: string;
  active_areas: string[];
  start_time: string;
  end_time: string;
  has_polygon: boolean;
  polygon_coordinates: any[] | null;
}

export default function AlertBanner() {
  const [alerts, setAlerts] = useState<ForRadAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // Hitting our newly minted FastAPI backend!
        const response = await fetch("api/alerts", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch alerts from backend");
        }
        const data = await response.json();
        setAlerts(data);
        setError(null);
      } catch (err: any) {
        console.error("Alert fetch failed:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately on mount
    fetchAlerts();

    // Poll every 2 minutes (120000ms) to sync with our Redis cache TTL!
    const interval = setInterval(fetchAlerts, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-slate-800 text-slate-400 text-center py-2 animate-pulse">
        Scanning for active weather threats...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-red-900/50 text-red-400 text-center py-2">
        ⚠️ Disconnected from Telemetry Server
      </div>
    );
  }

  if (alerts.length === 0) {
    // Return null so the banner completely disappears when the weather is clear
    return null;
  }

  return (
    <div className="w-full flex flex-col space-y-1 p-2">
      {alerts.map((alert) => {
        // Dynamic styling based on severity (Enterprise UI/UX)
        let bgColor = "bg-blue-600"; // Default
        let textColor = "text-white";

        if (
          alert.severity_level === "Severe" ||
          alert.severity_level === "Extreme"
        ) {
          bgColor = "bg-red-600 animate-pulse"; // Flashing red for Tornado/Severe T-Storm
        } else if (alert.severity_level === "Moderate") {
          bgColor = "bg-orange-500"; // Orange for Advisories (like Heat)
        }

        return (
          <div
            key={alert.alert_id}
            className={`w-full ${bgColor} ${textColor} px-4 py-3 rounded shadow-md flex justify-between items-center cursor-pointer hover:opacity-90 transition-opacity`}
            // In Phase 3, an onClick here will update the Global State to center the Leaflet map!
            onClick={() => console.log(`Selected Alert: ${alert.alert_id}`)}
          >
            <div className="flex flex-col">
              <span className="font-bold text-lg uppercase tracking-wider">
                {alert.event_type}
              </span>
              <span className="text-sm opacity-90">
                {alert.active_areas.slice(0, 3).join(", ")}{" "}
                {alert.active_areas.length > 3 &&
                  `+ ${alert.active_areas.length - 3} more`}
              </span>
            </div>
            <div className="text-xs font-mono bg-black/20 px-2 py-1 rounded">
              {alert.urgency}
            </div>
          </div>
        );
      })}
    </div>
  );
}
