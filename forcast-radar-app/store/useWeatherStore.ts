import { create } from "zustand";

// Update these fields to match what your Python ForRadAlert model returns
// Based on image_0e4f22.jpg (forrad_schemas.py)
export interface WeatherAlert {
  alert_id: string;
  event_type: string;
  severity_level: string;
  urgency: string;
  active_areas: string[];
  start_time: string; // Pydantic datetime serializes to ISO 8601 string in JSON
  end_time: string; // Pydantic datetime serializes to ISO 8601 string in JSON
  has_polygon: boolean;
  // Leaflet usually expects [lat, lng], the Python model has Optional[List[Any]]
  polygon_coordinates?: any[] | null;
}

interface WeatherState {
  // Unit State
  unit: "imperial" | "metric";
  toggleUnit: () => void;

  // Map Alert State
  selectedAlert: WeatherAlert | null;
  setSelectedAlert: (alert: WeatherAlert | null) => void;

  // Add these two new lines!
  activeAlerts: any[];
  setActiveAlerts: (alerts: any[]) => void;

  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;

  isDebuggerOpen: boolean;
  toggleDebugger: () => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  unit: "imperial",
  toggleUnit: () =>
    set((state) => ({
      unit: state.unit === "imperial" ? "metric" : "imperial",
    })),

  selectedAlert: null,
  setSelectedAlert: (alert) => set({ selectedAlert: alert }),

  activeAlerts: [],
  setActiveAlerts: (alerts: any[]) => set({ activeAlerts: alerts }),

  isSidebarOpen: false,
  setSidebarOpen: (isOpen: boolean) => set({ isSidebarOpen: isOpen }),

  isDebuggerOpen: false,
  toggleDebugger: () =>
    set((state) => ({ isDebuggerOpen: !state.isDebuggerOpen })),
}));
