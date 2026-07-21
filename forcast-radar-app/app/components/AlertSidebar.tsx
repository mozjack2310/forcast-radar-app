"use client";

import React from "react";
import { useWeatherStore } from "@/store/useWeatherStore";

export default function AlertSidebar() {
  const selectedAlert = useWeatherStore((state: any) => state.selectedAlert);
  const isSidebarOpen = useWeatherStore((state: any) => state.isSidebarOpen);
  const setSidebarOpen = useWeatherStore((state: any) => state.setSidebarOpen);

  // If there's no alert to read, don't render the sidebar content
  if (!selectedAlert) return null;

  return (
    <div
      className={`fixed top-0 right-0 h-screen w-[400px] bg-slate-950 border-l border-slate-800 z-[4000] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
        isSidebarOpen ? "translate-x-0" : "translate-x-full"
      }`}
      onPointerDown={(e) => e.stopPropagation()} // Protects against map click-through
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <h2 className="text-sm font-black text-slate-200 uppercase tracking-widest">
          NWS Official Bulletin
        </h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      {/* Sidebar Content (The Massive NWS Text) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="mb-6">
          <h3
            className={`text-xl font-black uppercase mb-2 ${
              selectedAlert.severity_level === "Extreme"
                ? "text-red-500"
                : "text-orange-500"
            }`}
          >
            {selectedAlert.event_type}
          </h3>
          <p className="text-slate-400 text-sm font-mono">
            Issued: {new Date(selectedAlert.start_time).toLocaleString()}
          </p>
          <p className="text-slate-400 text-sm font-mono">
            Expires: {new Date(selectedAlert.end_time).toLocaleString()}
          </p>
        </div>

        {/* The Raw Warning Text */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
            {selectedAlert.description ||
              "Detailed NWS bulletin data will populate here when passed from the FastAPI backend."}
          </p>
        </div>
      </div>
    </div>
  );
}
