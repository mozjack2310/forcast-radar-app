import { useState, useEffect } from "react";
import { useWeatherStore } from "../../store/useWeatherStore";

export default function FloatingAlertDetails() {
  const setSidebarOpen = useWeatherStore((state: any) => state.setSidebarOpen);
  const selectedAlert = useWeatherStore((state: any) => state.selectedAlert);
  const setSelectedAlert = useWeatherStore(
    (state: any) => state.setSelectedAlert,
  );

  // 1. Drag State
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset the window position every time a NEW alert is selected so it doesn't spawn off-screen
  useEffect(() => {
    if (selectedAlert) {
      setPosition({ x: 40, y: 40 });
    }
  }, [selectedAlert?.alert_id]);

  // If no alert is clicked, render absolutely nothing
  if (!selectedAlert) return null;

  // 2. Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Prevents the map from capturing the pointer/drag
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const isSevere =
    selectedAlert.severity_level === "Severe" ||
    selectedAlert.severity_level === "Extreme";

  return (
    <div
      className="absolute z-[2000] w-80 md:w-96 bg-slate-900/90 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-xl overflow-hidden flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none", // Prevents mobile scrolling while dragging
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* The Drag Handle (Header) */}
      <div
        className={`cursor-grab active:cursor-grabbing p-3 flex justify-between items-center select-none border-b border-slate-800 ${
          isSevere ? "bg-red-600/80" : "bg-orange-600/80"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <h3 className="font-black text-white text-xs md:text-sm tracking-wide uppercase truncate pr-4">
          {selectedAlert.event_type}
        </h3>
        {/* Close Button clears the Zustand state, unmounting the component */}
        <button
          onClick={() => setSelectedAlert(null)}
          className="text-white hover:bg-white/20 rounded-full p-1 transition-colors pointer-events-auto"
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

      {/* The Scrollable Warning Text */}
      <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
        <p className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
          {selectedAlert.urgency} Action Required
        </p>

        {/* If your backend parses the NWS description, it goes here */}
        <p className="text-sm text-slate-200 leading-relaxed mb-4 whitespace-pre-wrap">
          {selectedAlert.description ||
            "Active weather alert for this region. See NWS for full bulletin."}
        </p>

        <div className="text-xs text-slate-400 space-y-1 border-t border-slate-700/50 pt-3">
          <p>
            <span className="font-semibold text-slate-300">Target Areas:</span>{" "}
            {selectedAlert.active_areas?.join(", ")}
          </p>
          <p>
            <span className="font-semibold text-slate-300">Expires:</span>{" "}
            {new Date(selectedAlert.end_time).toLocaleTimeString()}
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-700/50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            📄 Read Full NWS Bulletin ➡️
          </button>
        </div>
      </div>
    </div>
  );
}
