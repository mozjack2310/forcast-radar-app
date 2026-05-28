"use client";

import { useState } from "react";
// Assuming you are importing your Redis fetcher/state here

export default function DebugConsole({ data }: { data: any }) {
  // 'minimized' (header only), 'normal' (300px), 'expanded' (600px)
  const [size, setSize] = useState<"minimized" | "normal" | "expanded">(
    "normal",
  );

  // Determine the height class based on state
  const heightClass =
    size === "minimized"
      ? "h-10"
      : size === "expanded"
        ? "h-[600px]"
        : "h-[300px]";

  return (
    <div className="fixed bottom-0 left-0 w-full z-40 px-4 pb-0 pointer-events-none">
      <div
        className={`pointer-events-auto max-w-7xl mx-auto w-full flex flex-col bg-gray-50 dark:bg-[#0a0a0a] border-t border-l border-r border-gray-300 dark:border-slate-800 rounded-t-xl shadow-2xl transition-all duration-300 ease-in-out ${heightClass}`}
      >
        {/* Terminal Header & Controls */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-200 dark:bg-slate-900 rounded-t-xl border-b border-gray-300 dark:border-slate-800 select-none">
          <span className="text-xs font-bold font-mono tracking-widest text-gray-600 dark:text-gray-400 uppercase">
            &gt;_ Redis_Cache_Interrogator
          </span>

          {/* Resize Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSize("minimized")}
              className={`p-1 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors ${size === "minimized" ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={size === "minimized"}
              title="Minimize"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button
              onClick={() => setSize("normal")}
              className={`p-1 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors ${size === "normal" ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={size === "normal"}
              title="Normal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
            </button>
            <button
              onClick={() => setSize("expanded")}
              className={`p-1 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors ${size === "expanded" ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={size === "expanded"}
              title="Expand"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Terminal Output Body */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs sm:text-sm">
          <pre className="text-gray-800 dark:text-cyan-400 transition-colors duration-300">
            {/* Replace this with your actual live data object */}
            {JSON.stringify(data || { status: "Awaiting payload..." }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
