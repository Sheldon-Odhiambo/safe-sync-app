import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  id: number;
  ts: string;
  level: LogLevel;
  tag: string;
  message: string;
  data?: string;
};

const STORAGE_KEY = "safesync:debug-log";
const MAX_ENTRIES = 300;
const SENSITIVE = /token|password|authorization|otp|secret|apikey|api_key/i;

let entries: LogEntry[] = [];
let seq = 0;
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function stringify(data: unknown): string | undefined {
  if (data === undefined) return undefined;
  try {
    if (data instanceof Error) return `${data.name}: ${data.message}`;
    return JSON.stringify(redact(data), null, 2);
  } catch {
    return String(data);
  }
}

function emit() {
  listeners.forEach((l) => l());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
  }, 500);
}

export function dlog(
  level: LogLevel,
  tag: string,
  message: string,
  data?: unknown
) {
  const entry: LogEntry = {
    id: ++seq,
    ts: new Date().toISOString(),
    level,
    tag,
    message,
    data: stringify(data),
  };
  entries = [...entries, entry].slice(-MAX_ENTRIES);

  // Still mirror to the Metro console.
  const line = `[${tag}] ${message}`;
  if (level === "error") console.error(line, data ?? "");
  else if (level === "warn") console.warn(line, data ?? "");
  else console.log(line, data ?? "");

  emit();
}

export const log = {
  info: (tag: string, msg: string, data?: unknown) =>
    dlog("info", tag, msg, data),
  warn: (tag: string, msg: string, data?: unknown) =>
    dlog("warn", tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) =>
    dlog("error", tag, msg, data),
};

/** Restore logs from the previous app run (so a crash/restart doesn't lose them). */
export async function loadPersistedLogs() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const old = JSON.parse(raw) as LogEntry[];
    entries = [...old, ...entries].slice(-MAX_ENTRIES);
    seq = Math.max(seq, ...entries.map((e) => e.id), 0);
    listeners.forEach((l) => l());
  } catch {
    /* ignore */
  }
}

export function clearLogs() {
  entries = [];
  emit();
}

export function exportLogsText(): string {
  return entries
    .map(
      (e) =>
        `${e.ts} ${e.level.toUpperCase()} [${e.tag}] ${e.message}` +
        (e.data ? `\n${e.data}` : "")
    )
    .join("\n\n");
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useLogs(): LogEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => entries,
    () => entries
  );
}