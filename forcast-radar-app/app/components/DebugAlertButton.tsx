"use client";

import React from "react";
import { useWeatherStore } from "../../store/useWeatherStore";
import { ForRadAlert } from "../../lib/types";

export const MOCK_SYNTHETIC_TORNADO: ForRadAlert = {
  alert_id: "urn:oid:2.49.0.1.840.0.bhm.tor.20261028.001",
  event_type: "Tornado Warning",
  severity_level: "Extreme",
  urgency: "Immediate",
  headline:
    "Tornado Warning issued October 28 at 12:36 AM CDT until October 28 at 1:21 AM CDT by NWS Birmingham AL",
  description:
    "The National Weather Service in Birmingham has issued a\n\n" +
    "* Tornado Warning for...\n" +
    "  Central Jefferson County in central Alabama...\n" +
    "  Northwestern Shelby County in central Alabama...\n\n" +
    "* Until 121 AM CDT.\n\n" +
    "* At 1236 AM CDT, a confirmed large and extremely dangerous tornado was located\n" +
    "  over downtown Birmingham, moving northeast at 45 mph.\n\n" +
    "  HAZARD...Damaging Tornado and Quarter Size Hail.\n" +
    "  SOURCE...Radar Confirmed.\n" +
    "  IMPACT...You are in a life-threatening situation. Flying debris may be deadly.\n\n" +
    "TORNADO...RADAR CONFIRMED\n" +
    "MAX HAIL SIZE...1.00 IN\n" +
    "WIND THREAT...OBSERVED 70 MPH",
  instruction:
    "TAKE COVER NOW! Move to a basement or an interior room on the lowest floor of a sturdy building. " +
    "Avoid windows. If you are outdoors, in a mobile home, or in a vehicle, move to the closest substantial shelter immediately.",
  active_areas: ["Jefferson, AL", "Shelby, AL", "Tuscaloosa, AL"],
  start_time: new Date().toISOString(),
  end_time: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  has_polygon: false,
  polygon_coordinates: null,
};

export default function DebugAlertButton() {
  const setSelectedAlert = useWeatherStore((state) => state.setSelectedAlert);
  const setSidebarOpen = useWeatherStore((state) => state.setSidebarOpen);
  const setFloatOpen = useWeatherStore((state) => state.setFloatOpen);
  const setActiveAlerts = useWeatherStore((state) => state.setActiveAlerts);

  const handleSpawn = () => {
    setActiveAlerts([MOCK_SYNTHETIC_TORNADO]);
    setSelectedAlert(MOCK_SYNTHETIC_TORNADO);
    setSidebarOpen(true);
    setFloatOpen(true);
  };

  return (
    <button
      onClick={handleSpawn}
      className="fixed bottom-4 right-4 z-[5000] px-3 py-1.5 bg-red-600/90 hover:bg-red-700 text-white text-xs font-mono font-bold rounded-lg shadow-xl border border-red-500 backdrop-blur-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
    >
      <span>🚨</span>
      <span>Spawn Fake Alert</span>
    </button>
  );
}
