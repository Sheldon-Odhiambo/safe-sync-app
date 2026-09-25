export function wsBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.10:8000";
  return base.replace(/^http/, "ws");
}

export const WS_PATH = "/ws";
export const HEARTBEAT_TIMEOUT_MS = 40_000; 
export const COMMAND_TIMEOUT_MS = 10_000;
export const RECONNECT_BASE_MS = 1_000;
export const RECONNECT_MAX_MS = 30_000;