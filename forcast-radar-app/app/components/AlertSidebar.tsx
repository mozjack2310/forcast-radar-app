"use client";

import React from "react";
import { useWeatherStore } from "../../store/useWeatherStore";
import { ForRadAlert } from "../../lib/types";

interface AlertSidebarProps {
  activeAlerts?: ForRadAlert[];
}

const SEVERITY_BADGE_STYLES: Record<string, string> = {
  Extreme: "bg-red-600 text-white border-red-400",
  Severe: "bg-orange-600 text-white border-orange-400",
  Moderate: "bg-amber-500 text-slate-950 border-amber-300",
  Minor: "bg-blue-600 text-white border-blue-400",
};

export default function AlertSidebar({ activeAlerts }: AlertSidebarProps) {
  const selectedAlert = useWeatherStore((state) => state.selectedAlert);
  const isSidebarOpen = useWeatherStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useWeatherStore((state) => state.setSidebarOpen);
  const isAlertStreamConnected = useWeatherStore(
    (state) => state.isAlertStreamConnected
  );

  const severityLevel = selectedAlert?.severity_level || "Unknown";
  const isSevere = severityLevel === "Severe" || severityLevel === "Extreme";
  const badgeClass =
    SEVERITY_BADGE_STYLES[severityLevel] ||
    "bg-slate-700 text-slate-200 border-slate-600";

  return (
    <aside
      aria-hidden={!isSidebarOpen}
      className={`fixed top-0 right-0 h-screen w-[420px] max-w-[92vw] bg-slate-950/95 backdrop-blur-md border-l border-slate-800 z-[4000] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
        isSidebarOpen && selectedAlert ? "translate-x-0" : "translate-x-full"
      }`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isAlertStreamConnected
                ? "bg-emerald-400 animate-pulse"
                : "bg-amber-400"
            }`}
            title={
              isAlertStreamConnected
                ? "Live SSE Stream Active"
                : "Reconnecting to SSE Stream"
            }
          />
          <span className="text-xs font-mono uppercase tracking-widest text-slate-300 font-semibold">
            NWS Official Bulletin
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Close Sidebar"
        >
          ✕
        </button>
      </div>

      {/* Sidebar Body */}
      {selectedAlert ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* Severity & Event Title */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border ${badgeClass}`}
              >
                {selectedAlert.severity_level}
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-slate-800 text-slate-300 border border-slate-700">
                Urgency: {selectedAlert.urgency}
              </span>
            </div>

            <h3
              className={`text-xl font-black uppercase tracking-tight leading-snug ${
                isSevere ? "text-red-500" : "text-orange-400"
              }`}
            >
              {selectedAlert.event_type}
            </h3>

            <div className="mt-2 space-y-1 text-xs font-mono text-slate-400">
              <p>
                Issued:{" "}
                <span className="text-slate-200">
                  {new Date(selectedAlert.start_time).toLocaleString()}
                </span>
              </p>
              <p>
                Expires:{" "}
                <span className="text-slate-200">
                  {new Date(selectedAlert.end_time).toLocaleString()}
                </span>
              </p>
            </div>
          </div>

          {/* Affected Counties / Zones */}
          {selectedAlert.active_areas && selectedAlert.active_areas.length > 0 && (
            <div>
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                Affected Areas ({selectedAlert.active_areas.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedAlert.active_areas.map((area) => (
                  <span
                    key={area}
                    className="px-2 py-0.5 text-xs bg-slate-900 text-slate-300 border border-slate-800 rounded-md"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Optional NWS Headline */}
          {selectedAlert.headline && (
            <div className="bg-slate-900/90 rounded-lg border-l-4 border-blue-500 p-3.5">
              <p className="text-xs font-semibold text-blue-200 leading-relaxed">
                {selectedAlert.headline}
              </p>
            </div>
          )}

          {/* Precautionary / Preparedness Instructions */}
          {selectedAlert.instruction && (
            <div
              className={`rounded-lg border p-4 ${
                isSevere
                  ? "bg-red-950/40 border-red-500/60"
                  : "bg-amber-950/30 border-amber-500/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  ⚠️ Precautionary / Preparedness Actions
                </span>
              </div>
              <p className="text-xs text-slate-100 whitespace-pre-wrap leading-relaxed font-medium">
                {selectedAlert.instruction}
              </p>
            </div>
          )}

          {/* Official NWS Description Text */}
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              Official Bulletin Narrative
            </h4>
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 shadow-inner">
              <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                {selectedAlert.description}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 text-slate-500 text-xs font-mono">
          Select an active alert to inspect the official NWS bulletin.
        </div>
      )}
    </aside>
  );
}
