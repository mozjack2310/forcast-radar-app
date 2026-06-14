"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Wait until mounted on client to render to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-24 h-10"></div>; // Placeholder while loading
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      className="px-4 py-2 rounded-md bg-gray-200 dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors font-medium border border-gray-300 dark:border-slate-700 shadow-sm text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
    >
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
