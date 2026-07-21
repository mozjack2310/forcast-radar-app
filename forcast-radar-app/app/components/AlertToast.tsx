"use client";

import React, { useEffect, useState } from "react";
import { useWeatherStore } from "../../store/useWeatherStore";

export interface ForRadAlert {
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

export default function AlertToast() {
  const [alerts, setAlerts] = useState<ForRadAlert[]>([]);
  const setSidebarOpen = useWeatherStore((state: any) => state.setSidebarOpen);
  const [activeFilter, setActiveFilter] = useState<
    "All" | "Warnings" | "Statements"
  >("All");
  const [mounted, setMounted] = useState(false); // 1. Add mounted state
  const setActiveAlerts = useWeatherStore(
    (state: any) => state.setActiveAlerts,
  );
  const setSelectedAlert = useWeatherStore(
    (state: any) => state.setSelectedAlert,
  );

  useEffect(() => {
    setMounted(true); // 2. Trigger mount flag on client land

    const fetchAlerts = async () => {
      try {
        const response = await fetch("/api/alerts", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setAlerts(data);
          setActiveAlerts(data);
        }
      } catch (err) {
        console.error("Toast fetch failed:", err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 120000); // Check every 2 mins
    return () => clearInterval(interval);
  }, []);

  // 3. Prevent SSR from rendering the time string entirely
  if (!mounted) return null;
  if (alerts.length === 0) return null;

  // 1. Define a strict hierarchy for the NWS severity levels
  const severityRank: Record<string, number> = {
    Extreme: 1, // Tornadoes
    Severe: 2, // Severe T-Storms
    Moderate: 3, // Flash Floods, etc.
    Minor: 4, // Special Weather Statements
    Unknown: 5,
  };

  // 2. Sort the array so the lowest numbers (highest threats) jump to the top
  const sortedAlerts = [...alerts].sort((a, b) => {
    const rankA = severityRank[a.severity_level] || 99;
    const rankB = severityRank[b.severity_level] || 99;
    return rankA - rankB;
  });

  // Filter the already-sorted array
  const displayAlerts = sortedAlerts.filter((alert) => {
    if (activeFilter === "Warnings")
      return alert.event_type.toLowerCase().includes("warning");
    if (activeFilter === "Statements")
      return alert.event_type.toLowerCase().includes("statement");
    return true; // "All"
  });

  return (
    <div className="fixed top-24 right-6 z-[1500] flex-col gap-3 max-h-[85vh] overflow-y-auto pl-4 pb-4 pr-2 overflow-x-hidden">
      {/* 1. Sticky Filter Chips Header */}
      {/* (Added shrink-0 so a huge list of alerts doesn't accidentally squish the buttons) */}
      <div className="sticky top-0 z-10 flex gap-2 p-1 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/50 shadow-sm shrink-0">
        <button
          onClick={() => setActiveFilter("All")}
          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
            activeFilter === "All"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveFilter("Warnings")}
          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
            activeFilter === "Warnings"
              ? "bg-red-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Warnings
        </button>
        <button
          onClick={() => setActiveFilter("Statements")}
          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
            activeFilter === "Statements"
              ? "bg-orange-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Statements
        </button>
      </div>

      {/* 2. The Map Loop for the Toasts */}
      {displayAlerts.map((alert) => {
        const isSevere =
          alert.severity_level === "Severe" ||
          alert.severity_level === "Extreme";

        return (
          <div
            key={alert.alert_id}
            onClick={() => {
              setSelectedAlert(alert);
              setSidebarOpen(true);
            }}
            className={`pointer-events-auto w-80 rounded-xl shadow-2xl border-l-4 cursor-pointer transform transition-all hover:scale-105 hover:-translate-x-2 overflow-hidden ${
              isSevere
                ? "bg-slate-900 border-red-500"
                : "bg-slate-900 border-orange-500"
            }`}
          >
            {/* Smart Color Header Tab */}
            <div
              className={`px-4 py-1 text-[10px] font-black tracking-widest uppercase text-white ${isSevere ? "bg-red-600" : "bg-orange-500"}`}
            >
              {alert.urgency} Action Required
            </div>

            {/* Toast Body */}
            <div className="p-4">
              <h3 className="text-white font-bold text-sm leading-tight mb-1">
                {alert.event_type}
              </h3>
              <p className="text-slate-400 text-xs truncate">
                {alert.active_areas?.join(", ")}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span>
                  Exp: {new Date(alert.end_time).toLocaleTimeString()}
                </span>
                <span className="ml-auto text-blue-400">
                  Click for details →
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
