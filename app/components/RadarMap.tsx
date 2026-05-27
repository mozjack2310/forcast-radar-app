"use client";

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, WMSTileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function RadarMap() {
  const position: [number, number] = [33.5186, -86.8104]; // Birmingham, AL

  return (
    <div className="w-full h-[500px] border border-gray-800 rounded-lg overflow-hidden shadow-lg mt-12 relative z-0">
      <MapContainer
        center={position}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        1. The Bottom Bun: Esri Dark Base (includes subtle terrain, water, and
        dark highways)
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
        />
        {/* Your existing base map layer
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        /> */}
        {/* 2. The Meat: Live Radar Overlay (IEM) */}
        <WMSTileLayer
          url="https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi"
          layers="nexrad-n0q-900913"
          format="image/png"
          transparent={true}
          opacity={0.65}
          attribution="Weather data © IEM Nexrad"
        />
        {/* 3. The Top Bun: Esri Dark Reference (City labels, borders, and highway shields) */}
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" />
      </MapContainer>
    </div>
  );
}
