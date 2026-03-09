"use client";

import dynamic from "next/dynamic";
import React from "react";

// We move the dynamic import here, safely inside a Client Component
const DynamicRadarMap = dynamic(() => import("./RadarMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] border border-gray-800 rounded-lg bg-[#0b1014] mt-12 animate-pulse flex items-center justify-center text-[#00c4f5] text-xl font-bold">
      Loading Live Radar Feed...
    </div>
  ),
});

export default function MapWrapper() {
  return <DynamicRadarMap />;
}
