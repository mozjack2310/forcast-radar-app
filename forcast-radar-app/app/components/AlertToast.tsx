"use client";

import React, { useEffect, useState } from "react";
import { useWeatherStore } from "../../store/useWeatherStore";
import { useAlertStream } from "../../hooks/useAlertStream";
import { ForRadAlert } from "../../lib/types";

const SEVERITY_RANK: Record<string, number> = {
  Extreme: 1,
  Severe: 2,
  Moderate: 3,
  Minor: 4,
  Unknown: 5,
};

export default function AlertToast() {
  useAlertStream();

  const alerts = useWeatherStore((state) => state.activeAlerts);
  const setSidebarOpen = useWeatherStore((state) => state.setSidebarOpen);
  const setSelectedAlert = useWeatherStore((state) => state.setSelectedAlert);

  const [activeFilter, setActiveFilter] = useState<
    "All" | "Warnings" | "Statements"
  >("All");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || alerts.length === 0) {
    return null;
  }

  const sortedAlerts = [...alerts].sort((a, b) => {
    const rankA = SEVERITY_RANK[a.severity_level] || 99;
    const rankB = SEVERITY_RANK[b.severity_level] || 99;
    return rankA - rankB;
  });

  const displayAlerts = sortedAlerts.filter((alert: ForRadAlert) => {
    if (activeFilter === "Warnings") {
      return alert.event_type.toLowerCase().includes("warning");
    }
    if (activeFilter === "Statements") {
      return (
        alert.event_type.toLowerCase().includes("statement") ||
        alert.event_type.toLowerCase().includes("advisory")
      );
    }
    return true;
  });

  return (
    <div className="fixed top-24 right-6 z-[1500] flex flex-col gap-3 max-h-[85vh] pl-4 pb-4 pr-2 pointer-events-none overflow-x-hidden">
      {/* Sticky Filter Chips Header */}
      <div className="sticky top-0 z-10 flex gap-2 p-1 bg-slate-900/85 backdrop-blur-md rounded-lg border border-slate-700/60 shadow-sm pointer-events-auto shrink-0">
        <button
          onClick={() => setActiveFilter("All")}
          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
            activeFilter === "All"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          All ({sortedAlerts.length})
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

      {/* Scrollable Toast Stack */}
      <div className="flex flex-col gap-3 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar">
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
              className={`pointer-events-auto w-80 rounded-xl shadow-2xl border-l-4 cursor-pointer transform transition-all hover:scale-[1.02] hover:-translate-x-1 overflow-hidden bg-slate-900 ${
                isSevere ? "border-red-500" : "border-orange-500"
              }`}
            >
              <div
                className={`px-4 py-1 text-[10px] font-black tracking-widest uppercase text-white ${
                  isSevere ? "bg-red-600" : "bg-orange-500"
                }`}
              >
                {alert.urgency} Action Required
              </div>

              <div className="p-4">
                <h3 className="text-white font-bold text-sm leading-tight mb-1">
                  {alert.event_type}
                </h3>
                <p className="text-slate-400 text-xs truncate">
                  {alert.active_areas?.join(", ")}
                </p>
                {alert.headline && (
                  <p className="mt-1.5 text-slate-300 text-[11px] line-clamp-2 leading-snug">
                    {alert.headline}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                  <span>
                    Exp: {new Date(alert.end_time).toLocaleTimeString()}
                  </span>
                  <span className="ml-auto text-blue-400 font-semibold">
                    Click for bulletin →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
