"use client";

import { useEffect, useRef } from "react";
import { useWeatherStore } from "../store/useWeatherStore";
import { ForRadAlert } from "../lib/types";

export function useAlertStream() {
  const setActiveAlerts = useWeatherStore((state) => state.setActiveAlerts);
  const setAlertStreamConnected = useWeatherStore(
    (state) => state.setAlertStreamConnected
  );
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (eventSourceRef.current) {
      return;
    }

    const sseUrl = "/api/alerts/stream";
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setAlertStreamConnected(true);
    };

    const handlePayload = (event: MessageEvent) => {
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (Array.isArray(parsed)) {
          setActiveAlerts(parsed as ForRadAlert[]);
        }
      } catch (err) {
        console.error("[SSE ERROR]: Failed to parse alert stream payload", err);
      }
    };

    eventSource.addEventListener("initial_state", handlePayload);
    eventSource.addEventListener("alert_update", handlePayload);

    eventSource.onerror = () => {
      setAlertStreamConnected(false);
      if (eventSource.readyState === EventSource.CLOSED) {
        console.warn("[SSE WARN]: Connection closed by server. Reconnecting...");
      }
    };

    return () => {
      setAlertStreamConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [setActiveAlerts, setAlertStreamConnected]);
}
