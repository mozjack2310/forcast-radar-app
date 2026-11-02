"use client";

import React, { useEffect, useState } from "react";
import { useWeatherStore } from "../../store/useWeatherStore";

export default function Navbar() {
  const toggleDebugger = useWeatherStore((state) => state.toggleDebugger);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("forrad-theme");
    const root = document.documentElement;
    if (savedTheme === "light") {
      root.classList.remove("dark");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const handleToggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      localStorage.setItem("forrad-theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("forrad-theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between transition-colors duration-200">
      <div className="flex items-center gap-6">
        <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
          ForRad <span className="text-cyan-500">Dash</span>
        </span>
        <nav className="hidden sm:flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <a
            href="#radar"
            className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            Live Radar
          </a>
          <a
            href="#forecast"
            className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            7-Day Outlook
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleTheme}
          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          aria-label="Toggle Dark or Light Mode"
        >
          <span>{isDark ? "🌙" : "☀️"}</span>
          <span>{isDark ? "Dark" : "Light"}</span>
        </button>

        <button
          onClick={toggleDebugger}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Toggle Telemetry Debugger"
          aria-label="Toggle Telemetry Debugger"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
