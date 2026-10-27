"use client";

import { useEffect } from "react";
import { useWeatherStore } from "../../store/useWeatherStore";

export default function DebuggerDrawer({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDebuggerOpen = useWeatherStore((state: any) => state.isDebuggerOpen);
  const toggleDebugger = useWeatherStore((state: any) => state.toggleDebugger);

  // Global Hotkey Listener (The ` backtick key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keydown if the user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "`") {
        e.preventDefault();
        toggleDebugger();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleDebugger]);

  return (
    <div
      className={`fixed bottom-0 right-0 z-[6000] w-full lg:w-[calc(100%-4rem)] xl:w-[calc(100%-12rem)] bg-slate-950 border-t-2 border-blue-500/50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out flex flex-col ${
        isDebuggerOpen ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ height: "35vh" }} // Takes up the bottom third of the screen when open
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-blue-400">~/forrad-ops</span>
          <span>$</span>
          <span className="text-slate-200">redis_interrogator --watch</span>
        </div>
        <button
          onClick={toggleDebugger}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
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

      {/* Terminal Content (Your existing component goes here) */}
      <div className="flex-1 overflow-hidden relative">{children}</div>
    </div>
  );
}
