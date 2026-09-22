import React, { createContext, useContext, useEffect, useState } from "react";

import { realtimeClient } from "./client";
import { ConnectionState } from "./types";

type Ctx = {
  client: typeof realtimeClient;
  connectionState: ConnectionState;
};

const RealtimeContext = createContext<Ctx | null>(null);

/** Mount once near the root, after auth is known to be ready. */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    realtimeClient.getState()
  );

  useEffect(() => {
    const off = realtimeClient.onStateChange(setConnectionState);
    realtimeClient.connect();
    return () => {
      off();
      // Do not disconnect on unmount in most apps — this provider usually
      // wraps the whole tree. If you do want teardown on logout, call
      // realtimeClient.disconnect() explicitly from your sign-out handler.
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ client: realtimeClient, connectionState }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): Ctx {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within a RealtimeProvider");
  return ctx;
}