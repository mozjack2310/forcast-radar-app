"use client"; // Must be a client component to hold state

import React, { createContext, useContext, useState } from "react";

// Define the shape of our context
interface UnitContextType {
  system: "imperial" | "metric";
  toggleSystem: () => void;
}

// Create the context
const UnitContext = createContext<UnitContextType | undefined>(undefined);

// Create the Provider wrapper
export function UnitProvider({ children }: { children: React.ReactNode }) {
  const [system, setSystem] = useState<"imperial" | "metric">("imperial");

  const toggleSystem = () => {
    setSystem((prev) => (prev === "imperial" ? "metric" : "imperial"));
  };

  return (
    <UnitContext.Provider value={{ system, toggleSystem }}>
      {children}
    </UnitContext.Provider>
  );
}

// Custom hook so cards can easily grab the state
export function useUnits() {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error("useUnits must be used within a UnitProvider");
  }
  return context;
}
