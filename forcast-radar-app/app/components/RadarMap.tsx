"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, PointerEvent as ReactPointerEvent } from "react";
import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  useMapEvents,
} from "react-leaflet";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "leaflet/dist/leaflet.css";

// 1. Helper Component: Lives INSIDE the MapContainer to access the Leaflet context
function MapInteractionHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number, x: number, y: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      // Convert the Lat/Lng click into X/Y pixel coordinates relative to the map container
      const point = map.latLngToContainerPoint(e.latlng);
      onMapClick(e.latlng.lat, e.latlng.lng, point.x, point.y);
    },
  });
  return null;
}

export default function RadarMap() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // State for the floating panel data
  const [position, setPosition] = useState<{
    x: number;
    y: number;
    lat: number;
    lng: number;
  } | null>(null);
  const [forecastData, setForecastData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  // State for dragging the panel
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
  } | null>(null);

useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

   // 1. The Single Source of Truth for fetching data
  const triggerForecastFetch = (lat: number, lng: number, x: number, y: number, signal?: AbortSignal) => {
    setPosition({ x, y, lat, lng });
    setLoading(true);

    // Dynamic endpoint routing for Production vs WSL
    const baseApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

    fetch(`${baseApiUrl}/api/forecast?lat=${lat}&lon=${lng}`, { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`API returned bad status code: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setForecastData(data.data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // Ignore React unmount aborts
        console.error("Failed to fetch forecast:", err);
        setLoading(false);
      });
  };

  // 2. The Auto-Load (Fires once on startup)
  useEffect(() => {
    const controller = new AbortController();
    const autoX = window.innerWidth / 2;
    
    triggerForecastFetch(33.5186, -86.8104, autoX, 150, controller.signal);

    return () => controller.abort(); // Cleanup function
  }, []);

  // 3. The Click Handler (Fires on user interaction)
  const handleMapClick = (lat: number, lng: number, x: number, y: number) => {
    const popupWidth = 320;
    const safeX = Math.max(10, Math.min(x - popupWidth / 2, window.innerWidth - popupWidth - 40));
    const safeY = Math.max(10, y + 16);
    
    triggerForecastFetch(lat, lng, safeX, safeY);
  };

  // 3. Dragging Logic for the custom panel
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!position) return;
    e.stopPropagation(); // Prevent clicking the map underneath
    e.currentTarget.setPointerCapture(e.pointerId); // Capture pointer for smooth dragging outside element

    setDragState({
      isDragging: true,
      startX: e.clientX - position.x,
      startY: e.clientY - position.y,
    });
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState?.isDragging && position) {
      setPosition({
        ...position,
        x: e.clientX - dragState.startX,
        y: e.clientY - dragState.startY,
      });
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragState(null);
  };

  if (!mounted) {
    return (
      <div className="isolate w-full h-[450px] bg-gray-100 dark:bg-slate-900 rounded-xl flex items-center justify-center border border-gray-200 dark:border-slate-800">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading Weather Radar Matrix...
        </span>
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  const baseMapUrl = isDark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

  const referenceMapUrl = isDark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

  return (
    <div className="relative z-0 w-full h-[450px] rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
      {/* 4. The Leaflet Map Layer Sandwich */}
      <MapContainer
        center={[33.5186, -86.8104]}
        zoom={8}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          key={`base-${resolvedTheme}`}
          url={baseMapUrl}
          attribution="&copy; Esri, HERE, Garmin, NGA, USGS"
        />

        <WMSTileLayer
          key={`radar-${resolvedTheme}`}
          url="https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi"
          layers="nexrad-n0q-900913"
          format="image/png"
          transparent={true}
          opacity={0.65}
          attribution="Weather data &copy; IEM Nexrad"
        />

        {/* Listens for clicks and triggers our React state */}
        <MapInteractionHandler onMapClick={handleMapClick} />

        <TileLayer
          key={`ref-${resolvedTheme}`}
          url={referenceMapUrl}
          attribution="&copy; Esri, DeLorme, NOAA, Sources: Conaf, Esri"
        />
      </MapContainer>

      {/* Floating Dragable Panel (Z-index 1000 ensures it sits above any map) */}
      {position && (
        <div
          className={`absolute z- border rounded-xl shadow-2xl w-[320px] flex flex-col ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
          style={{ left: position.x, top: position.y }}
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Drag Handle Area */}
          <div
            className={`p-3 pb-2 cursor-grab active:cursor-grabbing border-b flex justify-between items-start select-none rounded-t-xl ${isDark ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50/50"}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div>
              <h3
                className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}
              >
                HRRR 18-Hour Forecast
              </h3>
              <span
                className={`block text-xs font-normal mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <span
                className={`text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-semibold border ${isDark ? "border-blue-500/20" : "border-blue-500/30"}`}
              >
                3km Res
              </span>
              <button
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setPosition(null);
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 pt-2 cursor-default">
            {loading ? (
              <div className="flex items-center justify-center h-36">
                <span className="text-xs font-medium text-blue-500 animate-pulse tracking-wide">
                  Querying Open-Meteo...
                </span>
              </div>
            ) : (
              <div className="h-36 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={forecastData || []}
                    margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                  >
                    <XAxis dataKey="time" hide />
                    <YAxis
                      domain={["auto", "auto"]}
                      width={30}
                      tick={{
                        fontSize: 10,
                        fill: isDark ? "#64748b" : "#94a3b8",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        padding: "8px",
                        fontSize: "12px",
                        border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        color: isDark ? "#f8fafc" : "#0f172a",
                        boxShadow:
                          "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                      }}
                      itemStyle={{ color: "#ef4444", fontWeight: "bold" }}
                      labelStyle={{
                        fontWeight: "bold",
                        marginBottom: "4px",
                        color: isDark ? "#94a3b8" : "#64748b",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#ef4444",
                        strokeWidth: 2,
                        stroke: isDark ? "#0f172a" : "#fff",
                      }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name="Temp (°F)"
                      animationDuration={800}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
