import { useEffect, useRef } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import * as Location from "expo-location";

export type LocationDeniedReason =
  | "services_disabled"
  | "permission_denied"
  | "permission_blocked";

export type LocationAccess =
  | { granted: true }
  | { granted: false; reason: LocationDeniedReason; message: string };

type EnsureOptions = {
  prompt?: boolean;
  purpose?: string;
};

export async function ensureLocationAccess(
  options: EnsureOptions = {}
): Promise<LocationAccess> {
  const prompt = options.prompt ?? true;
  const purpose = options.purpose ?? "show your position on the map";

  // ---- 1. Device location switch -----------------------------------------
  let servicesEnabled = await Location.hasServicesEnabledAsync();

  if (!servicesEnabled && prompt && Platform.OS === "android") {
    try {
      // Shows Google's "For better experience, turn on device location" dialog.
      await Location.enableNetworkProviderAsync();
    } catch {
      // The user declined, or Google Play services isn't available.
    }
    servicesEnabled = await Location.hasServicesEnabledAsync();
  }

  if (!servicesEnabled) {
    return {
      granted: false,
      reason: "services_disabled",
      message: `Location is switched off on this device. SafeSync needs your location to ${purpose}. Turn on location (GPS) and try again.`,
    };
  }

  // ---- 2. App permission ---------------------------------------------------
  let permission = await Location.getForegroundPermissionsAsync();

  if (permission.status !== "granted" && prompt && permission.canAskAgain) {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (permission.status === "granted") {
    return { granted: true };
  }

  if (permission.canAskAgain) {
    return {
      granted: false,
      reason: "permission_denied",
      message: `Location permission was denied. SafeSync needs your location to ${purpose}.`,
    };
  }

  return {
    granted: false,
    reason: "permission_blocked",
    message: `Location permission is blocked. SafeSync needs your location to ${purpose}. Allow it in your phone's app settings.`,
  };
}

/** Sends the user to the screen where they can fix the problem. */
export async function openLocationSettings(
  reason: LocationDeniedReason
): Promise<void> {
  try {
    if (reason === "services_disabled" && Platform.OS === "android") {
      await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
      return;
    }
    await Linking.openSettings();
  } catch {
    try {
      await Linking.openSettings();
    } catch {
      // Nothing more we can do.
    }
  }
}

/** "Open settings" dialog, shown when the app can't fix it on its own. */
export function promptLocationSettings(
  access: Extract<LocationAccess, { granted: false }>
): void {
  const title =
    access.reason === "services_disabled"
      ? "Turn on location"
      : "Allow location access";

  Alert.alert(title, access.message, [
    { text: "Not now", style: "cancel" },
    {
      text: "Open settings",
      onPress: () => {
        void openLocationSettings(access.reason);
      },
    },
  ]);
}

/**
 * Runs `callback` each time the app returns to the foreground, e.g. after the
 * user came back from the Settings screen.
 */
export function useOnAppForeground(callback: () => void): void {
  const latest = useRef(callback);
  latest.current = callback;

  useEffect(() => {
    let previous = AppState.currentState;

    const subscription = AppState.addEventListener("change", (next) => {
      if (/inactive|background/.test(previous) && next === "active") {
        latest.current();
      }
      previous = next;
    });

    return () => subscription.remove();
  }, []);
}