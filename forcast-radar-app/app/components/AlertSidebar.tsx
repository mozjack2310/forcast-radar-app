"use client";

import React from "react";
import { useWeatherStore } from "../../store/useWeatherStore";

export default function AlertSidebar() {
  const selectedAlert = useWeatherStore((state: any) => state.selectedAlert);
  const setSelectedAlert = useWeatherStore(
    (state: any) => state.setSelectedAlert,
  );

  // Slide in if there's an alert, hide if null
  const isOpen = selectedAlert !== null;

  return (
    <>
      {/* Dark Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1500] transition-opacity"
          onClick={() => setSelectedAlert(null)}
        />
      )}

      {/* The Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-[2000] transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedAlert && (
          <div className="flex flex-col h-full">
            {/* Dynamic Colored Header */}
            <div
              className={`p-6 text-white flex justify-between items-start ${
                selectedAlert.severity_level === "Severe" ||
                selectedAlert.severity_level === "Extreme"
                  ? "bg-red-600"
                  : "bg-orange-500"
              }`}
            >
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest drop-shadow-md">
                  {selectedAlert.event_type}
                </h2>
                <p className="text-sm font-semibold opacity-90 mt-1 uppercase tracking-wider">
                  {selectedAlert.urgency} Action
                </p>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-2 hover:bg-black/20 rounded-full transition-colors flex-shrink-0"
                title="Close Sidebar"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Warning Details Body */}
            <div className="p-6 flex flex-col gap-6 text-slate-800 dark:text-slate-200">
              {/* Affected Areas */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-700/50 pb-1">
                  Affected Areas
                </h3>
                <p className="font-medium leading-relaxed">
                  {selectedAlert.active_areas?.join(", ")}
                </p>
              </div>

              {/* Timing Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Issued
                  </span>
                  <span className="text-sm font-semibold">
                    {new Date(selectedAlert.start_time).toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Expires
                  </span>
                  <span className="text-sm font-semibold text-red-500">
                    {new Date(selectedAlert.end_time).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Map Centering Notice */}
              <div className="mt-4 p-4 border border-blue-500/30 bg-blue-500/10 rounded-xl flex items-start gap-3">
                <span className="text-xl">🛰️</span>
                <p className="text-sm text-blue-400 font-medium">
                  The radar map has automatically centered on this threat area.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
