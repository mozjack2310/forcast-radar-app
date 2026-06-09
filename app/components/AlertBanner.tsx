"use client";

import { useState, useEffect } from "react";

export default function AlertBanner() {
  // State to hold the current active alert message; Renamed from "alert" to "activeAlert" for clarity
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    // Define the polling function
    const fetchAlerts = async () => {
      try {
        // Point this to your actual RHEL Flask API endpoint
        const response = await fetch("http://192.168.50.101:5000/api/alerts", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();

        // Assuming your Python daemon sends { "active": "Tornado Warning" }
        if (data.alert) {
          setAlertMessage(data.alert);
        } else {
          setAlertMessage(null); // Clear it if the alert expires
        }
      } catch (error) {
        // Fail silently so the UI doesn't crash if the RHEL VM is rebooting
        console.error("Failed to ping alert daemon");
      }
    };

    // Run it immediately on first load
    fetchAlerts();

    // Set up the interval to poll every 15 seconds (15000 ms)
    const intervalId = setInterval(fetchAlerts, 15000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  // If there is no active alert in the state, render absolutely nothing
  if (!alertMessage) return null;

  // If an alert exists, render the warning banner
  return (
    <div className="w-full bg-red-600 text-white font-bold text-center py-3 px-4 shadow-lg flex items-center justify-center space-x-2 animate-slide-down">
      <svg
        className="w-6 h-6 animate-pulse"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>NWS ALERT: {alertMessage}</span>
    </div>
  );
}
