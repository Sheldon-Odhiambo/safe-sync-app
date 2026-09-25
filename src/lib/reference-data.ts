import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const CACHE_KEY = "safesync:reference-data:v1";
const TTL_MS = 2 * 24 * 60 * 60 * 1000;

export type ReferenceData = {
  roles: { id: string; name: string; description: string | null }[];
  permissions: { id: string; code: string; description: string | null }[];
  capabilities: { id: string; code: string; name: string }[];
  vehicleTypes: { id: string; code: string; name: string }[];
  emergencyTypes: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    default_priority: number;
  }[];
  fetchedAt: number;
};

async function fetchFromSupabase(): Promise<ReferenceData> {
  const core = supabase.schema("core");
  const emergency = supabase.schema("emergency");

  const [
    { data: roles },
    { data: permissions },
    { data: capabilities },
    { data: vehicleTypes },
    { data: emergencyTypes },
  ] = await Promise.all([
    core.from("roles").select("id, name, description"),
    core.from("permissions").select("id, code, description"),
    core.from("capabilities").select("id, code, name"),
    core.from("vehicle_types").select("id, code, name"),
    emergency
      .from("emergency_types")
      .select("id, code, name, description, default_priority"),
  ]);

  return {
    roles: roles || [],
    permissions: permissions || [],
    capabilities: capabilities || [],
    vehicleTypes: vehicleTypes || [],
    emergencyTypes: emergencyTypes || [],
    fetchedAt: Date.now(),
  };
}

export async function getReferenceData(
  opts: { force?: boolean } = {}
): Promise<ReferenceData> {
  if (!opts.force) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: ReferenceData = JSON.parse(raw);
        if (Date.now() - cached.fetchedAt < TTL_MS) {
          return cached;
        }
      }
    } catch {
      // fall through to a fresh fetch
    }
  }

  const fresh = await fetchFromSupabase();
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
  } catch {
    // caching failed — not fatal, just means we'll refetch next time
  }
  return fresh;
}

/** Synchronous read of whatever's cached, for instant first paint. Returns null if nothing's cached yet. */
export async function peekCachedReferenceData(): Promise<ReferenceData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}