import React, { createContext, useContext, useMemo, useState } from "react";

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