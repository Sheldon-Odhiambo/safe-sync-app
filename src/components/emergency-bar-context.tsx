import React, { createContext, useContext, useMemo, useState } from "react";

// ============================================================
// EMERGENCY BAR CONTEXT
// ------------------------------------------------------------
// The tab layout owns ONE bottom action button that floats above
// every screen. Most screens just want it to say
// "REQUEST EMERGENCY HELP" and push to /emergency.
//
// The emergency screen itself needs that SAME button to instead
// say "CONFIRM EMERGENCY" and run its own validation/dispatch
// logic. Rather than rendering a second button, the emergency
// screen publishes its current button config (label/disabled/
// loading/onPress) into this context, and the layout reads it
// when the active route is the emergency screen.
// ============================================================

export type EmergencyBarConfig = {
  label: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
};

type EmergencyBarContextValue = {
  config: EmergencyBarConfig | null;
  setConfig: (config: EmergencyBarConfig | null) => void;
};

const EmergencyBarContext = createContext<EmergencyBarContextValue | null>(
  null
);

export function EmergencyBarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<EmergencyBarConfig | null>(null);

  const value = useMemo(
    () => ({ config, setConfig }),
    [config]
  );

  return (
    <EmergencyBarContext.Provider value={value}>
      {children}
    </EmergencyBarContext.Provider>
  );
}

// Screens (like the emergency request screen) call this to take
// control of the global bottom button while they're focused.
export function useEmergencyBar() {
  const ctx = useContext(EmergencyBarContext);

  if (!ctx) {
    throw new Error(
      "useEmergencyBar must be used within an EmergencyBarProvider"
    );
  }

  return ctx;
}