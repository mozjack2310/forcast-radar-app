"use client";
import { useState, useEffect } from "react";

export default function DebugConsole() {
  const [debugData, setDebugData] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchDebugData = async () => {
    try {
      const res = await fetch("/api/debug/redis");
      const data = await res.json();
      setDebugData(data);
    } catch (error) {
      console.error("Failed to fetch debug data", error);
    }
  };

  // Fetch immediately on load, then poll every 10 seconds
  useEffect(() => {
    fetchDebugData();
    const interval = setInterval(fetchDebugData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 font-mono text-xs">
      {/* The Toggle Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-900 text-cyan-400 p-2 border-t border-cyan-800 text-left hover:bg-gray-800 transition-colors flex justify-between items-center"
      >
        <span>
          &gt;_ REDIS_CACHE_INTERROGATOR {isOpen ? "[ACTIVE]" : "[STANDBY]"}
        </span>
        <span>{isOpen ? "▼" : "▲"}</span>
      </button>

      {/* The Output Console */}
      {isOpen && (
        <div className="bg-black text-green-400 p-4 h-64 overflow-y-auto border-t border-gray-800 shadow-inner">
          <pre>
            {debugData
              ? JSON.stringify(debugData, null, 2)
              : "Connecting to Redis cache..."}
          </pre>
        </div>
      )}
    </div>
  );
}
