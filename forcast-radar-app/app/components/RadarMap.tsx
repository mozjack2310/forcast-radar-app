"use client";

import { useTheme } from "next-themes";
import React, {
  useEffect,
  useState,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  useMapEvents,
  useMap,
  Polygon,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useWeatherStore, WeatherAlert } from "../../store/useWeatherStore";

// ... your imports end on line 29 ...

// 0. File-Level Utility: Smart Coordinate Flipper (Handles 2D, 3D, and 4D GeoJSON)
const flipCoordinates = (coords: any[]): any[] => {
  // If the first element is a number, we've hit the bottom [lon, lat] pair. Flip it!
  if (typeof coords[0] === "number") {
    return [coords[1], coords[0]];
  }
  // If the first element is an array, we are still navigating layers. Dive deeper!
  if (Array.isArray(coords[0])) {
    return coords.map((c: any) => flipCoordinates(c));
  }
  return coords;
};

// 1. Helper Component: Handles Map Clicks
function MapInteractionHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number, x: number, y: number) => void;
}) {
  const map = useMapEvents({
    click(e: any) {
      const point = map.latLngToContainerPoint(e.latlng);
      onMapClick(e.latlng.lat, e.latlng.lng, point.x, point.y);
    },
  });
  return null;
}

// 2. Helper Component: Pans and zooms map to the active alert area
function MapAlertController() {
  const map = useMap();
  const selectedAlert = useWeatherStore((state: any) => state.selectedAlert);

  useEffect(() => {
    if (
      selectedAlert &&
      selectedAlert.has_polygon &&
      selectedAlert.polygon_coordinates &&
      selectedAlert.polygon_coordinates.length > 0
    ) {
      try {
        const leafletCoords = flipCoordinates(
          selectedAlert.polygon_coordinates,
        );
        const bounds = L.latLngBounds(leafletCoords as any);

        if (bounds.isValid()) {
          map.flyToBounds(bounds, {
            padding: [50, 50],
            duration: 1.5,
          });
        }
      } catch (err) {
        console.error("Could not fly to alert bounds:", err);
      }
    }
  }, [selectedAlert, map]);

  return null;
}

// 3. Helper Component: Renders the active threat area
function AllAlertPolygonLayer() {
  const activeAlerts = useWeatherStore((state: any) => state.activeAlerts);
  const selectedAlert = useWeatherStore((state: any) => state.selectedAlert);

  // If the API hasn't loaded or skies are clear, paint nothing.
  if (!activeAlerts || activeAlerts.length === 0) {
    return null;
  }

  return (
    <>
      {activeAlerts.map((alert: any) => {
        // Skip any alerts that don't have geospatial boundaries
        if (
          !alert.has_polygon ||
          !alert.polygon_coordinates ||
          alert.polygon_coordinates.length === 0
        ) {
          return null;
        }

        // Check if this specific polygon is the one the user clicked on
        const isSelected = selectedAlert?.alert_id === alert.alert_id;

        return (
          <Polygon
            key={alert.alert_id}
            positions={flipCoordinates(alert.polygon_coordinates) as any}
            pathOptions={{
              color: alert.severity_level === "Extreme" ? "#ef4444" : "#f97316",
              fillColor:
                alert.severity_level === "Extreme" ? "#ef4444" : "#f97316",
              fillOpacity: 0.3,
              weight: isSelected ? 5 : 2, // Thickens the border if it's the actively selected alert!
            }}
          >
            <Popup className="custom-popup">
              <div className="flex flex-col gap-1 p-1 min-w-[150px]">
                <div
                  className={`font-black text-sm uppercase tracking-wider ${alert.severity_level === "Extreme" ? "text-red-600" : "text-orange-600"}`}
                >
                  ⚠️ {alert.event_type}
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {alert.urgency} Action Required
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-1 border-t border-slate-200 pt-1">
                  Exp: {new Date(alert.end_time).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}

// 4. Main Component: Radar Map with Forecast Panel

// export default function RadarMap() { ...

export default function RadarMap() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);

  // Zustand Global State
  const selectedAlert = useWeatherStore((state: any) => state.selectedAlert);
  const setSelectedAlert = useWeatherStore(
    (state: any) => state.setSelectedAlert,
  );
  const unit = useWeatherStore((state: any) => state.unit);
  const isImp = unit === "imperial";

  // Floating Panel & Point Forecast State
  const [position, setPosition] = useState<{
    x: number;
    y: number;
    lat: number;
    lng: number;
  } | null>(null);
  const [forecastData, setForecastData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Alerts Overlay
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/alerts/active");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } catch (err) {
        console.error("Failed to fetch alerts for map overlay:", err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 120000);
    return () => clearInterval(interval);
  }, []);

  // Point Forecast Logic
  const triggerForecastFetch = (
    lat: number,
    lng: number,
    x: number,
    y: number,
    signal?: AbortSignal,
  ) => {
    setPosition({ x, y, lat, lng });
    setLoading(true);

    fetch(`/api/forecast?lat=${lat}&lon=${lng}`, { signal })
      .then((res) => {
        if (!res.ok)
          throw new Error(`API returned bad status code: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setForecastData(data.data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Failed to fetch forecast:", err);
        setLoading(false);
      });
  };

  const handleMapClick = (lat: number, lng: number, x: number, y: number) => {
    const popupWidth = 320;
    const safeX = Math.max(
      10,
      Math.min(x - popupWidth / 2, window.innerWidth - popupWidth - 40),
    );
    const safeY = Math.max(10, y + 16);
    triggerForecastFetch(lat, lng, safeX, safeY);
  };

  // Dragging Handlers
  const handlePointerDown = (e: ReactPointerEvent) => {
    if (!position) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      isDragging: true,
      startX: e.clientX - position.x,
      startY: e.clientY - position.y,
    });
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (dragState?.isDragging && position) {
      setPosition({
        ...position,
        x: e.clientX - dragState.startX,
        y: e.clientY - dragState.startY,
      });
    }
  };

  const handlePointerUp = (e: ReactPointerEvent) => {
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragState(null);
  };

  // Map Theme URLs
  const isDark = resolvedTheme === "dark";
  const baseMapUrl = isDark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

  const referenceMapUrl = isDark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

  const flipCoordinates = (coords: any[]): any[] => {
    if (!coords || coords.length === 0) return [];
    if (typeof coords[0] === "number") {
      return [coords[1], coords[0]];
    }
    return coords.map(flipCoordinates);
  };

  const getAlertStyle = (eventType: string) => {
    const type = eventType.toLowerCase();
    const isWatch = type.includes("watch");
    const isWarning = type.includes("warning");

    let hexColor = "#FFFF00"; // Default Yellow
    if (type.includes("tornado")) hexColor = "#FF0000";
    else if (type.includes("severe thunderstorm")) hexColor = "#FFA500";
    else if (type.includes("flood")) hexColor = "#00FF00";
    else if (type.includes("heat")) hexColor = "#FF7F00";

    if (isWatch) {
      return {
        color: hexColor,
        fillColor: hexColor,
        fillOpacity: 0.05,
        weight: 3,
        dashArray: "10, 10",
      };
    } else if (isWarning) {
      return {
        color: hexColor,
        fillColor: hexColor,
        fillOpacity: 0.3,
        weight: 2,
        dashArray: "",
      };
    } else {
      return {
        color: hexColor,
        fillColor: hexColor,
        fillOpacity: 0.2,
        weight: 1,
        dashArray: "4",
      };
    }
  };

  if (!mounted) {
    return (
      <div
        className={`isolate w-full h-[450px] ${isDark ? "bg-slate-900 border-slate-800" : "bg-gray-100 border-gray-200"} rounded-xl flex items-center justify-center border `}
      >
        <span
          className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          Loading Weather Radar Matrix...
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative z-0 w-full h-[450px] rounded-xl overflow-hidden border ${isDark ? "border-slate-800" : "border-gray-200"} shadow-sm transition-colors duration-300`}
    >
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

        <MapInteractionHandler onMapClick={handleMapClick} />
        <MapAlertController />

        {/* Render Alert Polygons */}
        <AllAlertPolygonLayer />

        <TileLayer
          key={`ref-${resolvedTheme}`}
          url={referenceMapUrl}
          attribution="&copy; Esri, DeLorme"
        />
      </MapContainer>

      {/* Floating Draggable Forecast Panel */}
      {position && (
        <div
          className={`absolute z-[1000] rounded-xl shadow-2xl w-[320px] flex flex-col ${
            isDark
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-slate-200"
          } border overflow-hidden`}
          style={{ left: position.x, top: position.y }}
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Drag Handle Area */}
          <div
            className={`flex items-center justify-between p-3 border-b cursor-grab active:cursor-grabbing ${
              isDark
                ? "border-slate-800 bg-slate-800/50"
                : "border-slate-100 bg-slate-50"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
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
                onPointerDown={(e) => {
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
                <span className="text-sm font-medium text-blue-500 animate-pulse tracking-wide">
                  Querying Open-Meteo...
                </span>
              </div>
            ) : (
              <div className="h-36 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={
                      forecastData?.map((d) => ({
                        ...d,
                        // DYNAMIC METRIC CONVERSION HERE
                        displayTemp: isImp
                          ? d.temp
                          : Math.round((d.temp - 32) * (5 / 9)),
                      })) || []
                    }
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
                      dataKey="displayTemp"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#ef4444",
                        strokeWidth: 2,
                        stroke: isDark ? "#0f172a" : "#fff",
                      }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name={`Temp (${isImp ? "°F" : "°C"})`}
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
