"use client";

import { MapContainer, TileLayer, WMSTileLayer } from "react-leaflet";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

export default function RadarMap() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent SSR execution crashes
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[450px] bg-gray-100 dark:bg-slate-900 rounded-xl flex items-center justify-center border border-gray-200 dark:border-slate-800 animate-pulse">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading Weather Radar Matrix...
        </span>
      </div>
    );
  }

  // Dynamically swap tiles based on the active theme
  const isDark = resolvedTheme === "dark";

  const baseMapUrl = isDark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

  const referenceMapUrl = isDark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

  return (
    <div className="w-full h-[450px] rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
      <MapContainer
        center={[33.5186, -86.8104]} // Centered on Birmingham
        zoom={8}
        style={{ height: "100%", width: "100%" }}
      >
        {/* The Bottom Bun: Base Map (Using key={resolvedTheme} forces Leaflet to redraw immediately) */}
        <TileLayer
          key={`base-${resolvedTheme}`}
          url={baseMapUrl}
          attribution="&copy; Esri, HERE, Garmin, NGA, USGS"
        />

        {/* The Meat: Live NEXRAD Radar (Stays identical, just sits beautifully on either background) */}
        <WMSTileLayer
          key={`radar-${resolvedTheme}`}
          url="https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi"
          layers="nexrad-n0q-900913"
          format="image/png"
          transparent={true}
          opacity={0.65}
          attribution="Weather data &copy; IEM Nexrad"
        />

        {/* The Top Bun: Reference Labels & Highways */}
        <TileLayer
          key={`ref-${resolvedTheme}`}
          url={referenceMapUrl}
          attribution="&copy; Esri, DeLorme, NOAA, Sources: Conaf, Esri"
        />
      </MapContainer>
    </div>
  );
}
