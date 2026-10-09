import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import MapView, {
  Marker,
  PROVIDER_GOOGLE,
} from "react-native-maps";

import * as Location from "expo-location";

import { apiFetchLogged as apiFetch } from "@/lib/logged-api";
import { DebugLogButton } from "@/components/debug-log-panel";
import { log } from "@/lib/debug-log";
import {
  ensureLocationAccess,
  promptLocationSettings,
  useOnAppForeground,
  type LocationDeniedReason,
} from "@/lib/location-access";


const API = {
  me: "/api/v1/drivers/me",
  vehicles: "/api/v1/drivers/vehicles",
  checklist: (vehicleId: string) =>
    `/api/v1/drivers/vehicles/${vehicleId}/checklist`,
  shiftStart: "/api/v1/drivers/shift/start",
  shiftEnd: "/api/v1/drivers/shift/end",
  location: "/api/v1/drivers/location",
  dispatch: "/api/v1/drivers/dispatch",
  dispatches: "/api/v1/drivers/dispatches",
  stats: "/api/v1/drivers/stats",
};

const DISPATCH_POLL_MS = 10_000;

const LOCATION_HEARTBEAT_MS = 10_000;

const LOCATION_PURPOSE = "share your position with dispatch and show it on the map";

/* ============================================================
   TYPES
   ============================================================ */

type Profile = {
  id: string;
  user_id: string;
  branch_id: string;
  branch_name: string;
  organization_name: string;
  first_name: string;
  last_name: string;
  responder_type: string;
  badge_number: string | null;
  verification_status: string;
  status: string;
  shift_status: string; // "on_shift" | "off_shift"
  active_vehicle_id: string | null;
  shift_started_at: string | null;
};

type Vehicle = {
  id: string;
  registration_number: string;
  vehicle_type_code: string; // "AMBULANCE" | "FIRE_ENGINE"
  vehicle_type_name: string;
  station: string;
};

type InspectionItem = {
  id: string;
  label: string;
  is_mandatory: boolean;
};

type DispatchStep = {
  id: string;
  label: string;
  done: boolean;
};

type Dispatch = {
  id: string;
  status: string;
  emergency_type: string;
  severity: string;
  caller_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  eta_minutes: number | null;
  notes: string | null;
  completed_steps: number;
  steps: DispatchStep[];
};

type Stats = {
  avg_response_seconds: number | null;
  completed_30d: number;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

/* HELPERS */

const isFireEngine = (vehicle?: Vehicle) =>
  vehicle?.vehicle_type_code === "FIRE_ENGINE";

const titleCase = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const formatDuration = (seconds: number | null) => {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function ResponderConsole() {
  const router = useRouter();

  /* ---------------- backend data ---------------- */

  const [profile, setProfile] = useState<Profile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const [checklistItems, setChecklistItems] = useState<InspectionItem[]>([]);
  const [checklistLoaded, setChecklistLoaded] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState("");
  const [checklistReload, setChecklistReload] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [shiftBusy, setShiftBusy] = useState(false);
  const [dispatchBusy, setDispatchBusy] = useState(false);

  /* ---------------- local UI state ---------------- */

  const [online, setOnline] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  /* ---------------- location state ---------------- */

  const [currentLocation, setCurrentLocation] =
    useState<Coordinates | null>(null);
  const [geocodedEmergency, setGeocodedEmergency] =
    useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationReason, setLocationReason] =
    useState<LocationDeniedReason | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const currentLocationRef = useRef<Coordinates | null>(null);
  const dispatchRef = useRef<Dispatch | null>(null);

  // Read from inside callbacks without making them re-create (which used to
  // re-run the first-fix effect every time the map finished loading).
  const mapReadyRef = useRef(false);
  const reportBusyRef = useRef(false);
  const settingsPromptedRef = useRef(false);

  // When location access had failed and is later fixed, bumping this restarts
  // the live position watcher (which only starts when the shift goes online).
  const hadLocationFailureRef = useRef(false);
  const [watchNonce, setWatchNonce] = useState(0);

  /* ============================================================
     DERIVED
     ============================================================ */

  const driverName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : "";

  const activeVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicle),
    [vehicles, selectedVehicle]
  );

  const mandatoryIds = useMemo(
    () => checklistItems.filter((i) => i.is_mandatory).map((i) => i.id),
    [checklistItems]
  );

  // While a shift is running the inspection was already done (and stored
  // server-side) before it started, so it is shown as complete.
  const inspectionPassed =
    checklistLoaded && mandatoryIds.every((id) => checkedIds.includes(id));
  const ready = online || inspectionPassed;
  const checkedCount = online ? checklistItems.length : checkedIds.length;

  const accepted = !!dispatch && dispatch.status !== "pending";
  const completedSteps = dispatch?.completed_steps ?? 0;

  const dispatchLat = dispatch?.latitude ?? null;
  const dispatchLng = dispatch?.longitude ?? null;

  // Prefer coordinates from the backend; fall back to geocoding the address.
  const emergencyLocation = useMemo<Coordinates | null>(() => {
    if (dispatchLat != null && dispatchLng != null) {
      return { latitude: dispatchLat, longitude: dispatchLng };
    }
    return geocodedEmergency;
  }, [dispatchLat, dispatchLng, geocodedEmergency]);

  /* ============================================================
     LOAD BACKEND DATA
     ============================================================ */

  const refreshVehicles = useCallback(async () => {
    try {
      const data = await apiFetch<Vehicle[]>(API.vehicles);
      setVehicles(Array.isArray(data) ? data : []);
    } catch {
      /* keep the previous list */
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const summary = await apiFetch<Stats>(API.stats);
      setStats(summary ?? null);
    } catch {
      /* keep the previous stats */
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      // Dispatch and stats are non-critical: a failure there shouldn't
      // block the console, only profile + vehicles are required.
      const [me, available, activeDispatch, summary] = await Promise.all([
        apiFetch<Profile>(API.me),
        apiFetch<Vehicle[]>(API.vehicles),
        apiFetch<Dispatch | null>(API.dispatch).catch(() => null),
        apiFetch<Stats>(API.stats).catch(() => null),
      ]);

      setProfile(me);
      log.info("responder", "console loaded", {
        name: `${me.first_name} ${me.last_name}`,
        branch: me.branch_name,
        org: me.organization_name,
        shift: me.shift_status,
        vehiclesAvailable: Array.isArray(available) ? available.length : 0,
        hasActiveDispatch: !!activeDispatch,
      });

      setVehicles(Array.isArray(available) ? available : []);
      setDispatch(activeDispatch ?? null);
      setStats(summary ?? null);

      if (me.shift_status === "on_shift") {
        setOnline(true);
        setSelectedVehicle(me.active_vehicle_id ?? "");
      } else {
        setOnline(false);
      }
    } catch (err) {
      setLoadError(errorMessage(err, "Failed to load your responder data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  // Load the inspection checklist for the selected vehicle's type.
  useEffect(() => {
    setCheckedIds([]);
    setChecklistError("");

    if (!selectedVehicle) {
      setChecklistItems([]);
      setChecklistLoaded(false);
      setChecklistLoading(false);
      return;
    }

    let cancelled = false;
    setChecklistLoaded(false);
    setChecklistLoading(true);

    apiFetch<InspectionItem[]>(API.checklist(selectedVehicle))
      .then((items) => {
        if (cancelled) return;
        setChecklistItems(Array.isArray(items) ? items : []);
        setChecklistLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setChecklistItems([]);
        setChecklistError(
          errorMessage(err, "Couldn't load the inspection checklist.")
        );
      })
      .finally(() => {
        if (!cancelled) setChecklistLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVehicle, checklistReload]);

  // Poll for new/updated dispatches while on shift.
  useEffect(() => {
    if (!online) return;

    const timer = setInterval(async () => {
      try {
        const next = await apiFetch<Dispatch | null>(API.dispatch);
        const previous = dispatchRef.current;

        if (previous?.status === "pending" && next?.id !== previous.id) {
          Alert.alert(
            "Dispatch no longer available",
            "This emergency expired or was taken by another responder."
          );
        }

        setDispatch(next ?? null);
      } catch {
        /* transient network error — try again next tick */
      }
    }, DISPATCH_POLL_MS);

    return () => clearInterval(timer);
  }, [online]);

  /* ============================================================
     LOCATION
     ============================================================ */

  // `skipIfBusy` is used by the heartbeat so slow requests never pile up.
  const reportLocation = useCallback(
    async (coords: Coordinates, skipIfBusy = false) => {
      if (skipIfBusy && reportBusyRef.current) return;

      reportBusyRef.current = true;

      try {
        await apiFetch<unknown>(API.location, {
          method: "POST",
          body: JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
          }),
        });
      } catch (err) {
        // Non-fatal: the next heartbeat brings the backend up to date. It is
        // logged so a failing location feed is visible in the debug panel.
        log.warn("responder", "location report failed", {
          message: errorMessage(err, "unknown error"),
        });
      } finally {
        reportBusyRef.current = false;
      }
    },
    []
  );

  // showAlert: the responder tapped the locate / enable button themselves.
  // prompt:    false = only check (no system dialogs), used when the app
  //            returns to the foreground.
  const getCurrentLocation = useCallback(
    async (showAlert = false, prompt = true) => {
      try {
        setLocationLoading(true);
        setLocationError(null);

        // Asks to switch location on / grant permission when it isn't.
        const access = await ensureLocationAccess({
          prompt,
          purpose: LOCATION_PURPOSE,
        });

        if (!access.granted) {
          hadLocationFailureRef.current = true;
          setLocationReason(access.reason);
          setLocationError(access.message);

          // Offer the Settings shortcut on the first failure, and whenever
          // the responder explicitly asked for location.
          if (prompt && (showAlert || !settingsPromptedRef.current)) {
            settingsPromptedRef.current = true;
            promptLocationSettings(access);
          }
          return;
        }

        setLocationReason(null);

        if (hadLocationFailureRef.current) {
          hadLocationFailureRef.current = false;
          setWatchNonce((n) => n + 1);
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const coordinates: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        currentLocationRef.current = coordinates;
        setCurrentLocation(coordinates);
        reportLocation(coordinates);

        if (mapReadyRef.current && mapRef.current) {
          mapRef.current.animateToRegion(
            {
              ...coordinates,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            },
            700
          );
        }

        if (showAlert) {
          Alert.alert(
            "Location updated",
            "Your current location has been updated on the map."
          );
        }
      } catch (error) {
        const message = errorMessage(
          error,
          "Unable to determine your current location."
        );

        log.warn("responder", "location unavailable", { message });
        setLocationError(message);

        if (showAlert) {
          Alert.alert("Location unavailable", message);
        }
      } finally {
        setLocationLoading(false);
      }
    },
    // mapReady is read through a ref, so this callback stays stable and the
    // first-fix effect below runs once instead of every time the map loads.
    [reportLocation]
  );

  // First fix as soon as the screen opens (asks for permission if needed).
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Coming back from the Settings screen: pick the position up automatically
  // if the responder switched location on / granted permission there.
  useOnAppForeground(() => {
    if (!currentLocationRef.current) {
      getCurrentLocation(false, false);
    }
  });

  useEffect(() => {
    currentLocationRef.current = currentLocation;
  }, [currentLocation]);

  // Stream position to the backend while on shift (foreground only —
  // background tracking needs expo-task-manager + background permission).
  useEffect(() => {
    if (!online) return;

    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;

    (async () => {
      const access = await ensureLocationAccess({ purpose: LOCATION_PURPOSE });

      if (!access.granted) {
        if (cancelled) return;
        hadLocationFailureRef.current = true;
        setLocationReason(access.reason);
        setLocationError(access.message);
        promptLocationSettings(access);
        return;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10_000,
          // Small on purpose: a 20 m threshold meant a parked unit sent
          // nothing at all. The heartbeat below covers standing still.
          distanceInterval: 5,
        },
        (position) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          currentLocationRef.current = coords;
          setCurrentLocation(coords);
          reportLocation(coords);
        }
      );

      if (cancelled) {
        sub.remove();
      } else {
        subscription = sub;
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [online, reportLocation, watchNonce]);

  // Heartbeat: while on shift, re-send the latest position every few seconds
  // whether or not the phone moved. This keeps `last_location_at` fresh so
  // clients keep seeing the unit. The first beat fires immediately, which
  // also makes a freshly started shift dispatchable right away.
  useEffect(() => {
    if (!online) return;

    const beat = () => {
      const here = currentLocationRef.current;
      if (here) reportLocation(here, true);
    };

    beat();
    const timer = setInterval(beat, LOCATION_HEARTBEAT_MS);

    return () => clearInterval(timer);
  }, [online, reportLocation]);

  // Geocode the dispatch address only if the backend sent no coordinates.
  useEffect(() => {
    setGeocodedEmergency(null);

    if (!dispatch?.address || (dispatchLat != null && dispatchLng != null)) {
      return;
    }

    let cancelled = false;

    Location.geocodeAsync(dispatch.address)
      .then((results) => {
        const first = results[0];
        if (!cancelled && first) {
          setGeocodedEmergency({
            latitude: first.latitude,
            longitude: first.longitude,
          });
        }
      })
      .catch(() => {
        /* don't block the map if geocoding fails */
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch?.id, dispatch?.address, dispatchLat, dispatchLng]);

  // Fit the map when we first get a fix or the emergency changes —
  // not on every live position update, so the responder can still pan.
  const hasFix = currentLocation !== null;

  useEffect(() => {
    const here = currentLocationRef.current;

    if (!mapReady || !mapRef.current || !here) return;

    if (emergencyLocation) {
      mapRef.current.fitToCoordinates([here, emergencyLocation], {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
      return;
    }

    mapRef.current.animateToRegion(
      { ...here, latitudeDelta: 0.008, longitudeDelta: 0.008 },
      700
    );
  }, [mapReady, hasFix, emergencyLocation]);

  /* ============================================================
     CHECKLIST
     ============================================================ */

  const toggleChecklist = (id: string) => {
    setCheckedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  };

  /* ============================================================
     ONLINE / OFFLINE  (starts / ends a shift on the backend)
     ============================================================ */

  const handleAvailability = async (value: boolean) => {
    if (shiftBusy) return;

    if (value) {
      if (!selectedVehicle) {
        Alert.alert(
          "Vehicle required",
          "Please select the vehicle you are driving first."
        );
        return;
      }

      if (!ready) {
        Alert.alert(
          "Inspection incomplete",
          "Complete the vehicle inspection before going online."
        );
        return;
      }

      // Dispatch can only find a unit that reports its position, so going
      // online without location would leave the driver invisible. Ask for
      // location (or send them to Settings) before the shift starts.
      const access = await ensureLocationAccess({ purpose: LOCATION_PURPOSE });

      if (!access.granted) {
        setLocationReason(access.reason);
        setLocationError(access.message);
        promptLocationSettings(access);
        return;
      }

      setLocationReason(null);
      setLocationError(null);

      setShiftBusy(true);

      try {
        await apiFetch<unknown>(API.shiftStart, {
          method: "POST",
          body: JSON.stringify({
            vehicle_id: selectedVehicle,
            checklist_item_ids: checkedIds,
          }),
        });

        setOnline(true);
        setVehicleDropdownOpen(false);

        Alert.alert(
          "You are online",
          "No emergency yet. You'll be alerted here as soon as dispatch assigns you one."
        );
      } catch (err) {
        Alert.alert(
          "Couldn't go online",
          errorMessage(err, "Please try again.")
        );
        // The vehicle may have just been taken by another driver.
        refreshVehicles();
      } finally {
        setShiftBusy(false);
      }

      return;
    }

    if (accepted) {
      Alert.alert(
        "Active dispatch",
        "Finish or hand over your current emergency before ending your shift."
      );
      return;
    }

    setShiftBusy(true);

    try {
      await apiFetch<unknown>(API.shiftEnd, { method: "POST" });

      setOnline(false);
      setSelectedVehicle("");
      setVehicleDropdownOpen(false);
      setCheckedIds([]);
      setDispatch(null);
      refreshVehicles();

      Alert.alert(
        "Shift ended",
        "The vehicle has been released back to the fleet."
      );
    } catch (err) {
      Alert.alert("Couldn't end shift", errorMessage(err, "Please try again."));
    } finally {
      setShiftBusy(false);
    }
  };

  /* ============================================================
     SIGN OUT
     ============================================================ */

  // Signing out while on shift used to leave the shift open on the backend
  // with nothing sending a location, so the unit looked available but was
  // unreachable. The shift is ended first.
  const signOutNow = () => {
    router.replace("/");
  };

  const handleSignOut = () => {
    if (accepted) {
      Alert.alert(
        "Active dispatch",
        "Finish or hand over your current emergency before signing out."
      );
      return;
    }

    Alert.alert(
      "Sign out",
      online
        ? "You are on shift. Signing out will end your shift and release your vehicle."
        : "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            if (!online) {
              signOutNow();
              return;
            }

            setShiftBusy(true);

            try {
              await apiFetch<unknown>(API.shiftEnd, { method: "POST" });
              setOnline(false);
              signOutNow();
            } catch (err) {
              Alert.alert(
                "Couldn't end your shift",
                `${errorMessage(
                  err,
                  "Please check your connection."
                )}\n\nSigning out now would leave your shift open.`,
                [
                  { text: "Stay signed in", style: "cancel" },
                  { text: "Sign out anyway", style: "destructive", onPress: signOutNow },
                ]
              );
            } finally {
              setShiftBusy(false);
            }
          },
        },
      ]
    );
  };

  /* ============================================================
     DISPATCH ACTIONS
     ============================================================ */

  const handleAccept = async () => {
    if (!dispatch || dispatchBusy) return;

    setDispatchBusy(true);

    try {
      const updated = await apiFetch<Dispatch>(
        `${API.dispatches}/${dispatch.id}/accept`,
        { method: "POST" }
      );

      setDispatch(updated);

      Alert.alert(
        "Dispatch accepted",
        "You are now assigned to this emergency."
      );
    } catch (err) {
      Alert.alert(
        "Couldn't accept dispatch",
        errorMessage(err, "It may have been reassigned. Please try again.")
      );
      // Pick up whatever the backend says the current state is.
      apiFetch<Dispatch | null>(API.dispatch)
        .then((next) => setDispatch(next ?? null))
        .catch(() => {});
    } finally {
      setDispatchBusy(false);
    }
  };

  const handleDecline = () => {
    if (!dispatch) return;

    Alert.alert(
      "Decline dispatch",
      "Are you sure you want to decline this emergency?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setDispatchBusy(true);

            try {
              await apiFetch<unknown>(
                `${API.dispatches}/${dispatch.id}/decline`,
                { method: "POST" }
              );
              setDispatch(null);
            } catch (err) {
              Alert.alert(
                "Couldn't decline dispatch",
                errorMessage(err, "Please try again.")
              );
            } finally {
              setDispatchBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleAdvanceStep = async (index: number) => {
    // Only the next outstanding step can be tapped.
    if (!dispatch || dispatchBusy || index !== completedSteps) return;

    const step = dispatch.steps[index];
    if (!step) return;

    setDispatchBusy(true);

    try {
      const updated = await apiFetch<Dispatch | null>(
        `${API.dispatches}/${dispatch.id}/progress`,
        {
          method: "POST",
          body: JSON.stringify({ step_id: step.id }),
        }
      );

      if (!updated || updated.status === "completed") {
        setDispatch(null);
        refreshStats();
      } else {
        setDispatch(updated);
      }
    } catch (err) {
      Alert.alert(
        "Couldn't update status",
        errorMessage(err, "Please try again.")
      );
    } finally {
      setDispatchBusy(false);
    }
  };

  const handleNavigate = () => {
    if (!emergencyLocation) {
      Alert.alert(
        "Location unavailable",
        "The emergency location hasn't been resolved yet."
      );
      return;
    }

    const { latitude, longitude } = emergencyLocation;

    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`
    ).catch(() =>
      Alert.alert("Couldn't open maps", "No maps app is available.")
    );
  };

  /* ============================================================
     LOADING / ERROR / NOT A RESPONDER
     ============================================================ */

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.authDescription}>
            Loading your responder console…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authContainer}>
          <View style={styles.authCard}>
            <View style={styles.authIcon}>
              <MaterialCommunityIcons
                name="ambulance"
                size={34}
                color="#DC2626"
              />
            </View>

            <Text style={styles.authTitle}>
              {loadError ? "Couldn't load your console" : "Driver sign-in required"}
            </Text>

            <Text style={styles.authDescription}>
              {loadError ||
                "Use the credentials issued by your company super admin to open the responder console."}
            </Text>

            {loadError ? (
              <Pressable style={styles.primaryButton} onPress={loadData}>
                <Text style={styles.primaryButtonText}>Retry</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[
                styles.primaryButton,
                loadError ? { backgroundColor: "#0F172A" } : null,
              ]}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.primaryButtonText}>Go to sign in</Text>
            </Pressable>

            {/* Lets you read the log even when the console fails to load. */}
            <View style={{ marginTop: 16 }}>
              <DebugLogButton />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ============================================================
     MAIN SCREEN
     ============================================================ */

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* HEADER */}

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBadge}>
                <MaterialCommunityIcons
                  name={isFireEngine(activeVehicle) ? "fire-truck" : "ambulance"}
                  size={21}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {activeVehicle
                    ? `Unit ${activeVehicle.registration_number}`
                    : driverName}
                </Text>

                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {driverName} •{" "}
                  {activeVehicle
                    ? activeVehicle.station
                    : profile.organization_name}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <DebugLogButton />

              <Pressable style={styles.logoutButton} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={21} color="#0F172A" />
              </Pressable>
            </View>
          </View>

          {/* LIVE MAP */}

          <View style={styles.topMapCard}>
            <View style={styles.topMapWrapper}>
              {locationLoading && !currentLocation ? (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="large" color="#DC2626" />
                  <Text style={styles.mapLoadingText}>
                    Getting your location...
                  </Text>
                </View>
              ) : !currentLocation ? (
                <View style={styles.mapError}>
                  <Ionicons name="location-outline" size={32} color="#DC2626" />

                  <Text style={styles.mapErrorTitle}>Location unavailable</Text>

                  <Text style={styles.mapErrorText}>
                    {locationError ?? "Unable to determine your current location."}
                  </Text>

                  <Pressable
                    style={styles.locationRetryButton}
                    onPress={() => getCurrentLocation(true)}
                  >
                    <Ionicons
                      name={locationReason ? "location" : "refresh"}
                      size={17}
                      color="#FFFFFF"
                    />
                    <Text style={styles.locationRetryText}>
                      {locationReason ? "Enable location" : "Try again"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.googleMap}
                  onMapReady={() => {
                    mapReadyRef.current = true;
                    setMapReady(true);
                  }}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                  showsCompass={true}
                  showsBuildings={true}
                  showsPointsOfInterest={true}
                  loadingEnabled={true}
                  mapType="standard"
                  initialRegion={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={currentLocation}
                    title="Your location"
                    description={
                      activeVehicle
                        ? `Unit ${activeVehicle.registration_number}`
                        : driverName
                    }
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={styles.responderMarker}>
                      <MaterialCommunityIcons
                        name={
                          isFireEngine(activeVehicle)
                            ? "fire-truck"
                            : "ambulance"
                        }
                        size={23}
                        color="#FFFFFF"
                      />
                    </View>
                  </Marker>

                  {emergencyLocation && (
                    <Marker
                      coordinate={emergencyLocation}
                      title="Emergency location"
                      description={dispatch?.address ?? undefined}
                    >
                      <View style={styles.emergencyMarker}>
                        <Ionicons name="location" size={34} color="#DC2626" />
                      </View>
                    </Marker>
                  )}
                </MapView>
              )}

              {currentLocation && (
                <Pressable
                  style={styles.myLocationButton}
                  onPress={() => getCurrentLocation(true)}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <Ionicons name="locate" size={22} color="#0F172A" />
                  )}
                </Pressable>
              )}

              {emergencyLocation && (
                <View style={styles.mapOverlayLabel}>
                  <View style={styles.mapOverlayDot} />
                  <Text style={styles.mapOverlayText}>Emergency location</Text>
                </View>
              )}
            </View>

            {accepted && dispatch && (
              <View style={styles.mapStats}>
                <MapStat
                  value={
                    dispatch.eta_minutes != null
                      ? `${dispatch.eta_minutes} min`
                      : "—"
                  }
                  label="ETA"
                />
                <MapStat
                  value={
                    dispatch.distance_km != null
                      ? `${dispatch.distance_km.toFixed(1)} km`
                      : "—"
                  }
                  label="Distance"
                />
              </View>
            )}
          </View>

          {/* VEHICLE + AVAILABILITY */}

          <View style={styles.controlCard}>
            <Text style={styles.sectionLabel}>RESPONSE VEHICLE</Text>

            <View style={styles.vehicleDropdown}>
              <Pressable
                disabled={online}
                onPress={() => setVehicleDropdownOpen((open) => !open)}
                style={[
                  styles.dropdownTrigger,
                  vehicleDropdownOpen && styles.dropdownTriggerOpen,
                  online && styles.vehicleOptionDisabled,
                ]}
              >
                <View style={styles.vehicleIcon}>
                  <MaterialCommunityIcons
                    name={isFireEngine(activeVehicle) ? "fire-truck" : "ambulance"}
                    size={22}
                    color="#DC2626"
                  />
                </View>

                <View style={styles.vehicleDetails}>
                  <Text style={styles.vehiclePlate}>
                    {activeVehicle
                      ? activeVehicle.registration_number
                      : "Select vehicle"}
                  </Text>

                  <Text style={styles.vehicleKind}>
                    {activeVehicle
                      ? `${activeVehicle.vehicle_type_name} • ${activeVehicle.station}`
                      : vehicles.length === 0
                      ? "No vehicles available at your branch"
                      : "Tap to choose your unit"}
                  </Text>
                </View>

                <Ionicons
                  name={vehicleDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#64748B"
                />
              </Pressable>

              {vehicleDropdownOpen && !online && (
                <View style={styles.dropdownList}>
                  {vehicles.map((vehicle) => {
                    const selected = selectedVehicle === vehicle.id;

                    return (
                      <Pressable
                        key={vehicle.id}
                        onPress={() => {
                          setSelectedVehicle(vehicle.id);
                          setVehicleDropdownOpen(false);
                        }}
                        style={[
                          styles.dropdownItem,
                          selected && styles.dropdownItemSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.vehicleIcon,
                            selected && styles.vehicleIconSelected,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={isFireEngine(vehicle) ? "fire-truck" : "ambulance"}
                            size={22}
                            color={selected ? "#FFFFFF" : "#DC2626"}
                          />
                        </View>

                        <View style={styles.vehicleDetails}>
                          <Text
                            style={[
                              styles.vehiclePlate,
                              selected && styles.vehicleTextSelected,
                            ]}
                          >
                            {vehicle.registration_number}
                          </Text>

                          <Text
                            style={[
                              styles.vehicleKind,
                              selected && styles.vehicleTextSelected,
                            ]}
                          >
                            {vehicle.vehicle_type_name} • {vehicle.station}
                          </Text>
                        </View>

                        {selected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color="#FFFFFF"
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.availabilityRow}>
              <View style={styles.availabilityInfo}>
                <View
                  style={[
                    styles.statusDot,
                    online ? styles.statusOnline : styles.statusOffline,
                  ]}
                />

                <View>
                  <Text style={styles.availabilityTitle}>
                    {online ? "On-Shift" : "Off-Shift"}
                  </Text>

                  <Text style={styles.availabilitySubtitle}>
                    {online
                      ? "Dispatch can see you"
                      : "You are currently unavailable"}
                  </Text>
                </View>
              </View>

              {shiftBusy ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Switch
                  value={online}
                  onValueChange={handleAvailability}
                  trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                  thumbColor={online ? "#16A34A" : "#64748B"}
                />
              )}
            </View>
          </View>

          {/* STATISTICS */}

          <View style={styles.statsGrid}>
            <Stat
              icon="location-outline"
              label="Current location"
              value={
                currentLocation
                  ? `${currentLocation.latitude.toFixed(
                      5
                    )}, ${currentLocation.longitude.toFixed(5)}`
                  : locationLoading
                  ? "Locating..."
                  : "Location unavailable"
              }
            />

            <Stat
              icon="timer-outline"
              label="Avg response (30d)"
              value={formatDuration(stats?.avg_response_seconds ?? null)}
            />

            <Stat
              icon="checkmark-circle-outline"
              label="Completed (30d)"
              value={stats ? `${stats.completed_30d} incidents` : "—"}
            />
          </View>

          {/* INCOMING / ACTIVE REQUEST */}

          {dispatch ? (
            <View style={styles.card}>
              <View style={styles.emergencyHeader}>
                <View style={styles.emergencyIcon}>
                  <MaterialCommunityIcons
                    name={
                      dispatch.emergency_type.toLowerCase() === "fire"
                        ? "fire-truck"
                        : "ambulance"
                    }
                    size={23}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.emergencyHeaderText}>
                  <Text style={styles.emergencyTitle} numberOfLines={2}>
                    {accepted ? "ACTIVE" : "INCOMING"} •{" "}
                    {titleCase(dispatch.emergency_type)} Emergency • Severity{" "}
                    {titleCase(dispatch.severity)}
                  </Text>

                  <Text style={styles.emergencySubtitle}>
                    {dispatch.caller_name
                      ? `Caller: ${dispatch.caller_name}`
                      : "Caller unknown"}
                    {dispatch.distance_km != null
                      ? ` • ${dispatch.distance_km.toFixed(1)} km`
                      : ""}
                    {dispatch.eta_minutes != null
                      ? ` • ${dispatch.eta_minutes} min`
                      : ""}
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.detailsGrid}>
                  <Cell
                    label="Emergency type"
                    value={titleCase(dispatch.emergency_type)}
                  />
                  <Cell label="Severity" value={titleCase(dispatch.severity)} />
                  <Cell
                    label="Distance"
                    value={
                      dispatch.distance_km != null
                        ? `${dispatch.distance_km.toFixed(1)} km`
                        : "—"
                    }
                  />
                  <Cell
                    label="Travel time"
                    value={
                      dispatch.eta_minutes != null
                        ? `${dispatch.eta_minutes} min`
                        : "—"
                    }
                  />
                </View>

                {(dispatch.notes || dispatch.address) && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>PATIENT NOTES</Text>

                    <Text style={styles.notesText}>
                      {[dispatch.notes, dispatch.address]
                        .filter(Boolean)
                        .join("\n")}
                    </Text>
                  </View>
                )}

                {!accepted ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[
                        styles.acceptButton,
                        dispatchBusy && { opacity: 0.6 },
                      ]}
                      onPress={handleAccept}
                      disabled={dispatchBusy}
                    >
                      {dispatchBusy ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={20}
                            color="#FFFFFF"
                          />
                          <Text style={styles.acceptButtonText}>Accept</Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      style={[
                        styles.declineButton,
                        dispatchBusy && { opacity: 0.6 },
                      ]}
                      onPress={handleDecline}
                      disabled={dispatchBusy}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={20}
                        color="#DC2626"
                      />
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Pressable
                      style={styles.navigateButton}
                      onPress={handleNavigate}
                    >
                      <Ionicons name="navigate" size={21} color="#FFFFFF" />
                      <Text style={styles.navigateText}>Navigate to scene</Text>
                    </Pressable>

                    <View style={styles.responseProgress}>
                      <Text style={styles.responseTitle}>Response status</Text>

                      {dispatch.steps.map((step, index) => {
                        const done = step.done;
                        const isNext = index === completedSteps;

                        return (
                          <Pressable
                            key={step.id}
                            style={styles.responseItem}
                            onPress={() => handleAdvanceStep(index)}
                            disabled={!isNext || dispatchBusy}
                          >
                            <View
                              style={[
                                styles.responseCircle,
                                done && styles.responseCircleActive,
                              ]}
                            >
                              {done ? (
                                <Ionicons
                                  name="checkmark"
                                  size={14}
                                  color="#FFFFFF"
                                />
                              ) : (
                                <Text style={styles.responseNumber}>
                                  {index + 1}
                                </Text>
                              )}
                            </View>

                            <Text
                              style={[
                                styles.responseText,
                                (done || isNext) && styles.responseTextActive,
                              ]}
                            >
                              {step.label}
                              {isNext ? "  (tap when done)" : ""}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <View style={[styles.notesBox, { alignItems: "center", paddingVertical: 22 }]}>
                  <Ionicons
                    name={online ? "notifications-outline" : "moon-outline"}
                    size={30}
                    color="#64748B"
                  />

                  <Text style={[styles.notesLabel, { marginTop: 10 }]}>
                    {online ? "NO EMERGENCY YET" : "YOU HAVE NOT STARTED YOUR SHIFT "}
                  </Text>

                  <Text style={[styles.notesText, { textAlign: "center" }]}>
                    {online
                      ? "There is no emergency assigned to you right now. You'll be alerted here as soon as dispatch sends one."
                      : "Start shift to receive emergencies."}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* VEHICLE INSPECTION */}

          <View style={styles.card}>
            <View style={styles.checklistHeader}>
              <View style={styles.checklistHeaderText}>
                <Text style={styles.cardTitle}>Vehicle inspection checklist</Text>

                <Text style={styles.cardSubtitle}>
                  Shift activation is blocked until every mandatory item is
                  checked.
                </Text>
              </View>

              {checklistLoaded && (
                <View
                  style={[
                    styles.progressBadge,
                    ready ? styles.progressReady : styles.progressWarning,
                  ]}
                >
                  <Text
                    style={[
                      styles.progressText,
                      ready
                        ? styles.progressTextReady
                        : styles.progressTextWarning,
                    ]}
                  >
                    {checkedCount}/{checklistItems.length}
                  </Text>
                </View>
              )}
            </View>

            {!selectedVehicle ? (
              <View style={[styles.notesBox, { marginHorizontal: 16, marginBottom: 16 }]}>
                <Text style={styles.notesText}>
                  Select your vehicle to load its inspection checklist.
                </Text>
              </View>
            ) : checklistLoading ? (
              <View style={{ padding: 24 }}>
                <ActivityIndicator color="#DC2626" />
              </View>
            ) : checklistError ? (
              <View style={[styles.notesBox, { marginHorizontal: 16, marginBottom: 16 }]}>
                <Text style={styles.notesText}>{checklistError}</Text>

                <Pressable
                  style={styles.locationRetryButton}
                  onPress={() => setChecklistReload((n) => n + 1)}
                >
                  <Ionicons name="refresh" size={17} color="#FFFFFF" />
                  <Text style={styles.locationRetryText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.checklist}>
                  {checklistItems.map((item) => {
                    const isChecked = online || checkedIds.includes(item.id);

                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.checkItem,
                          isChecked && styles.checkItemChecked,
                        ]}
                        disabled={online}
                        onPress={() => toggleChecklist(item.id)}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            isChecked && styles.checkboxChecked,
                          ]}
                        >
                          {isChecked && (
                            <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                          )}
                        </View>

                        <Text
                          style={[
                            styles.checkText,
                            isChecked && styles.checkTextChecked,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View
                  style={[
                    styles.inspectionStatus,
                    ready
                      ? styles.inspectionStatusReady
                      : styles.inspectionStatusWarning,
                  ]}
                >
                  <Ionicons
                    name={ready ? "checkmark-circle" : "warning-outline"}
                    size={21}
                    color={ready ? "#16A34A" : "#D97706"}
                  />

                  <Text
                    style={[
                      styles.inspectionStatusText,
                      ready
                        ? styles.inspectionReadyText
                        : styles.inspectionWarningText,
                    ]}
                  >
                    {ready
                      ? "Vehicle inspection complete. You can go online."
                      : "Complete all inspection items before going online."}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <View style={styles.footerLogo}>
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            </View>

            <View>
              <Text style={styles.footerTitle}>SafeSync</Text>

              <Text style={styles.footerText}>Emergency response platform</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ============================================================
   SMALL COMPONENTS
   ============================================================ */

function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={22} color="#DC2626" />
      </View>

      <View style={styles.statTextContainer}>
        <Text style={styles.statLabel}>{label}</Text>

        <Text style={styles.statValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>

      <Text style={styles.cellValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function MapStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.mapStat}>
      <Text style={styles.mapStatValue}>{value}</Text>

      <Text style={styles.mapStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingBottom: 40,
  },

  /* ==========================================================
     AUTH
  ========================================================== */

  authContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  authCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  authIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  authTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  authDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    minHeight: 72,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  headerInfo: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
  },

  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  /* ==========================================================
     TOP LIVE MAP
  ========================================================== */

  topMapCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  topMapWrapper: {
    height: 260,
    width: "100%",
    position: "relative",
  },

  /* ==========================================================
     CONTROL CARD
  ========================================================== */

  controlCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 1,
    marginBottom: 10,
  },

  vehicleList: {
    gap: 8,
  },

  vehicleOption: {
    minHeight: 66,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  vehicleOptionSelected: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },

  vehicleOptionDisabled: {
    opacity: 0.65,
  },

  /* DROPDOWN */

  vehicleDropdown: {
    // wraps the trigger + the list that expands below it
  },

  dropdownTrigger: {
    minHeight: 66,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  dropdownTriggerOpen: {
    borderColor: "#DC2626",
  },

  dropdownList: {
    marginTop: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  dropdownItem: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  dropdownItemSelected: {
    backgroundColor: "#DC2626",
  },

  vehicleIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  vehicleIconSelected: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  vehicleDetails: {
    flex: 1,
  },

  vehiclePlate: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  vehicleKind: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },

  vehicleTextSelected: {
    color: "#FFFFFF",
  },

  availabilityRow: {
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  availabilityInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 9,
  },

  statusOnline: {
    backgroundColor: "#16A34A",
  },

  statusOffline: {
    backgroundColor: "#94A3B8",
  },

  availabilityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  availabilitySubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
  },

  /* ==========================================================
     STATS
  ========================================================== */

  statsGrid: {
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 10,
  },

  statCard: {
    minHeight: 74,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  statIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  statTextContainer: {
    flex: 1,
  },

  statLabel: {
    fontSize: 11,
    color: "#64748B",
  },

  statValue: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  /* ==========================================================
     CARD
  ========================================================== */

  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  cardContent: {
    padding: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  cardSubtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: "#64748B",
  },

  /* ==========================================================
     EMERGENCY
  ========================================================== */

  emergencyHeader: {
    minHeight: 75,
    backgroundColor: "#DC2626",
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  emergencyIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#B91C1C",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  emergencyHeaderText: {
    flex: 1,
  },

  emergencyTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },

  emergencySubtitle: {
    marginTop: 3,
    color: "#FEE2E2",
    fontSize: 10,
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  cell: {
    width: "48%",
    minHeight: 59,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  cellLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },

  cellValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  notesBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
  },

  notesLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 5,
  },

  notesText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },

  /* ==========================================================
     BUTTONS
  ========================================================== */

  primaryButton: {
    width: "100%",
    height: 52,
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  actionRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
  },

  acceptButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  declineButton: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  declineButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "800",
  },

  navigateButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  navigateText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* ==========================================================
     GOOGLE MAP (top hero map)
  ========================================================== */

  googleMap: {
    flex: 1,
  },

  mapLoading: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  mapLoadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },

  mapError: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  mapErrorTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  mapErrorText: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 17,
    color: "#64748B",
    textAlign: "center",
  },

  locationRetryButton: {
    marginTop: 14,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  locationRetryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  responderMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  emergencyMarker: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  myLocationButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

  mapOverlayLabel: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  mapOverlayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
    marginRight: 6,
  },

  mapOverlayText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#334155",
  },

  mapStats: {
    minHeight: 63,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  mapStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },

  mapStatValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  mapStatLabel: {
    marginTop: 3,
    fontSize: 10,
    color: "#64748B",
  },

  /* ==========================================================
     RESPONSE PROGRESS
  ========================================================== */

  responseProgress: {
    marginTop: 18,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
  },

  responseTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 11,
  },

  responseItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  responseCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  responseCircleActive: {
    backgroundColor: "#16A34A",
  },

  responseNumber: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },

  responseText: {
    fontSize: 12,
    color: "#64748B",
  },

  responseTextActive: {
    color: "#16A34A",
    fontWeight: "800",
  },

  /* ==========================================================
     CHECKLIST
  ========================================================== */

  checklistHeader: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  checklistHeaderText: {
    flex: 1,
    marginRight: 10,
  },

  progressBadge: {
    minWidth: 52,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  progressReady: {
    backgroundColor: "#DCFCE7",
  },

  progressWarning: {
    backgroundColor: "#FEF3C7",
  },

  progressText: {
    fontSize: 11,
    fontWeight: "800",
  },

  progressTextReady: {
    color: "#15803D",
  },

  progressTextWarning: {
    color: "#B45309",
  },

  tabContainer: {
    marginHorizontal: 16,
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 13,
  },

  tab: {
    flex: 1,
    height: 43,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  tabActive: {
    backgroundColor: "#DC2626",
  },

  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },

  tabTextActive: {
    color: "#FFFFFF",
  },

  checklist: {
    padding: 16,
    gap: 8,
  },

  checkItem: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  checkItemChecked: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  checkboxChecked: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },

  checkText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },

  checkTextChecked: {
    color: "#166534",
  },

  inspectionStatus: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  inspectionStatusReady: {
    backgroundColor: "#F0FDF4",
  },

  inspectionStatusWarning: {
    backgroundColor: "#FFFBEB",
  },

  inspectionStatusText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
  },

  inspectionReadyText: {
    color: "#166534",
  },

  inspectionWarningText: {
    color: "#92400E",
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    marginTop: 25,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  footerLogo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  footerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },

  footerText: {
    marginTop: 2,
    fontSize: 10,
    color: "#64748B",
  },
});