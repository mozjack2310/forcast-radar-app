import { create } from "zustand";
import { ForRadAlert } from "../lib/types";

export interface WeatherState {
  unit: "imperial" | "metric";
  toggleUnit: () => void;

  selectedAlert: ForRadAlert | null;
  setSelectedAlert: (alert: ForRadAlert | null) => void;

  activeAlerts: ForRadAlert[];
  setActiveAlerts: (alerts: ForRadAlert[]) => void;
  setAlerts: (alerts: ForRadAlert[]) => void;

  isAlertStreamConnected: boolean;
  setAlertStreamConnected: (connected: boolean) => void;

  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;

  isFloatOpen: boolean;
  setFloatOpen: (isOpen: boolean) => void;

  isDebuggerOpen: boolean;
  toggleDebugger: () => void;
}

const reconcileSelectedAlert = (
  currentSelected: ForRadAlert | null,
  incomingAlerts: ForRadAlert[]
): ForRadAlert | null => {
  if (incomingAlerts.length === 0) {
    return currentSelected;
  }
  if (!currentSelected) {
    return incomingAlerts[0];
  }
  const exactMatch = incomingAlerts.find(
    (a) => a.alert_id === currentSelected.alert_id
  );
  return exactMatch || incomingAlerts[0];
};

export const useWeatherStore = create<WeatherState>((set) => ({
  unit: "imperial",
  toggleUnit: () =>
    set((state) => ({
      unit: state.unit === "imperial" ? "metric" : "imperial",
    })),

  selectedAlert: null,
  setSelectedAlert: (alert) => set({ selectedAlert: alert }),

  activeAlerts: [],
  setActiveAlerts: (alerts) =>
    set((state) => ({
      activeAlerts: alerts,
      selectedAlert: reconcileSelectedAlert(state.selectedAlert, alerts),
    })),
  setAlerts: (alerts) =>
    set((state) => ({
      activeAlerts: alerts,
      selectedAlert: reconcileSelectedAlert(state.selectedAlert, alerts),
    })),

  isAlertStreamConnected: false,
  setAlertStreamConnected: (connected) =>
    set({ isAlertStreamConnected: connected }),

  isSidebarOpen: false,
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  isFloatOpen: false,
  setFloatOpen: (isOpen) => set({ isFloatOpen: isOpen }),

  isDebuggerOpen: false,
  toggleDebugger: () =>
    set((state) => ({ isDebuggerOpen: !state.isDebuggerOpen })),
}));
