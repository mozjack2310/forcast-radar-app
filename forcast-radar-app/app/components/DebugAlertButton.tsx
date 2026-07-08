"use client";

import React from "react";
import { useWeatherStore } from "../../store/useWeatherStore";

export default function DebugAlertButton() {
  const setSelectedAlert = useWeatherStore(
    (state: any) => state.setSelectedAlert,
  );

  const spawnFakeStorm = () => {
    setSelectedAlert({
      alert_id: "dev-test-001",
      event_type: "Tornado Warning",
      severity_level: "Extreme", // This should trigger your red header!
      urgency: "Immediate",
      active_areas: ["Jefferson, AL", "Shelby, AL", "Tuscaloosa, AL"],
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 45 * 60000).toISOString(), // Expires in 45 mins
      has_polygon: true,
      polygon_coordinates: [],
    });
  };

  return (
    <button
      onClick={spawnFakeStorm}
      className="fixed bottom-6 right-6 z-[9999] bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-xl border-2 border-red-400 transition-colors"
    >
      🚨 Spawn Fake Alert
    </button>
  );
}
