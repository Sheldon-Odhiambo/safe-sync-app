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
  Modal,
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

import * as Location from "expo-location";

import { apiFetchLogged as apiFetch } from "@/lib/logged-api";
import { DebugLogButton } from "@/components/debug-log-panel";
import { log } from "@/lib/debug-log";
import {
  ARRIVE_MAX_DISTANCE_METERS,
  fetchTomTomRoute,
  geocodeTomTom,
  haversineMeters,
} from "@/lib/tomtom";
import { FeedbackActions } from "@/components/feedback-actions";
import {
  TomTomMap,
  TomTomMarker,
  TomTomPolyline,
  type TomTomMapHandle,
} from "@/components/tomtom-map";
import { startSirenLoop, stopSiren } from "@/lib/sounds";
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
  route: "/api/v1/drivers/dispatch/route",
  freeVehicle: "/api/v1/drivers/vehicle/free",
};

const DISPATCH_POLL_MS = 4_000;

const LOCATION_HEARTBEAT_MS = 10_000;

const LOCATION_PURPOSE = "share your position with dispatch and show it on the map";

type RouteInfo = {
  distance_meters: number;
  duration_seconds: number;
  polyline: Coordinates[];
};

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
  status: string; // "available" | "busy" | "offline"
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
  expires_at: string | null;
};

type ClientProfile = {
  name: string | null;
  phone: string | null;
};

type FeedbackState = {
  incident_id: string;
  other_party_name: string | null;
  can_rate: boolean;
  can_report: boolean;
  my_rating: number | null;
  has_reported: boolean;
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

const isFireEmergency = (type: string) => type.toLowerCase().includes("fire");

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

const initials = (name: string | null) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

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
  // The checklist collapses once every item is marked; this reopens it.
  const [checklistExpanded, setChecklistExpanded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [shiftBusy, setShiftBusy] = useState(false);
  const [dispatchBusy, setDispatchBusy] = useState(false);

  /* ---------------- end-of-emergency state ---------------- */

  // The emergency that was just completed ("Located"). Kept so its details
  // stay on screen until the responder frees the vehicle.
  const [finished, setFinished] = useState<Dispatch | null>(null);
  // True from "Arrived" until the responder taps "Free vehicle". The server
  // keeps the responder 'busy' for exactly this period.
  const [awaitingRelease, setAwaitingRelease] = useState(false);
  const [releaseBusy, setReleaseBusy] = useState(false);
  // Rate / report the client after the emergency (loaded after "Arrived").
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const feedbackDispatchRef = useRef<string | null>(null);

  /* ---------------- client profile ---------------- */

  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [clientProfileOpen, setClientProfileOpen] = useState(false);
  const [clientProfileLoading, setClientProfileLoading] = useState(false);
  const [clientProfileError, setClientProfileError] = useState("");
  const [callBusy, setCallBusy] = useState(false);

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
  const [mapTouching, setMapTouching] = useState(false);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const mapRef = useRef<TomTomMapHandle | null>(null);
  const currentLocationRef = useRef<Coordinates | null>(null);
  const dispatchRef = useRef<Dispatch | null>(null);
  const emergencyLocationRef = useRef<Coordinates | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  // Dispatch ids completed or cancelled on this device. A poll that was
  // already in flight when "Arrived" / "Cancel" was confirmed can return the
  // old assignment; ignore it.
  const completedRef = useRef<Set<string>>(new Set());
  // The client's name and phone for one dispatch, so "Call client" and the
  // profile sheet don't fetch it twice.
  const clientCacheRef = useRef<{
    dispatchId: string;
    profile: ClientProfile;
  } | null>(null);
  const cancelInProgressRef = useRef(false);

  const mapReadyRef = useRef(false);
  const reportBusyRef = useRef(false);
  const settingsPromptedRef = useRef(false);

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

  // Every item (not only the mandatory ones) is marked.
  const allMarked =
    checklistLoaded &&
    checklistItems.length > 0 &&
    (online || checklistItems.every((item) => checkedIds.includes(item.id)));
  const showCollapsedChecklist = allMarked && !checklistExpanded;

  const accepted = !!dispatch && dispatch.status !== "pending";

  // The emergency shown on the map: the live one, or the one just completed.
  const shown = dispatch ?? finished;
  const dispatchLat = shown?.latitude ?? null;
  const dispatchLng = shown?.longitude ?? null;

  // Prefer coordinates from the backend; fall back to geocoding the address.
  const emergencyLocation = useMemo<Coordinates | null>(() => {
    if (dispatchLat != null && dispatchLng != null) {
      return { latitude: dispatchLat, longitude: dispatchLng };
    }
    return geocodedEmergency;
  }, [dispatchLat, dispatchLng, geocodedEmergency]);

  emergencyLocationRef.current = emergencyLocation;

  // An offer waiting for an answer (not yet accepted).
  const incomingId =
    dispatch && dispatch.status === "pending" ? dispatch.id : null;

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

        // Still 'busy' with no live emergency: the driver finished one and
        // has not freed the vehicle yet (e.g. the app was restarted).
        if (!activeDispatch && me.status === "busy") {
          setAwaitingRelease(true);
        }
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

  // Siren on repeat while an offer is waiting for an answer. The cleanup
  // stops it when the offer is accepted, declined, expires or is cancelled
  // (the id changes or disappears), and when the screen closes.
  useEffect(() => {
    if (!incomingId) return;

    void startSirenLoop();

    return () => {
      stopSiren();
    };
  }, [incomingId]);

  // Collapse the checklist as soon as the last item is marked.
  useEffect(() => {
    if (allMarked) setChecklistExpanded(false);
  }, [allMarked]);

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

  // Poll for new / updated dispatches while on shift.
  useEffect(() => {
    if (!online) return;

    const timer = setInterval(async () => {
      try {
        const next = await apiFetch<Dispatch | null>(API.dispatch);

        // A response that raced with "Arrived" / "Cancel": the emergency is
        // already finished on this device, so ignore the stale assignment.
        if (next && completedRef.current.has(next.id)) return;

        const previous = dispatchRef.current;

        if (previous?.status === "pending" && next?.id !== previous.id) {
          Alert.alert(
            "Dispatch no longer available",
            "This emergency expired, was cancelled or was taken by another responder."
          );
        } else if (previous && previous.status !== "pending" && next === null) {
          Alert.alert(
            "Emergency cancelled",
            "The client cancelled this emergency. You are available again."
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

    geocodeTomTom(dispatch.address)
      .then((first) => {
        if (!cancelled && first) {
          setGeocodedEmergency(first);
        }
      })
      .catch(() => {
        /* don't block the map if geocoding fails */
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch?.id, dispatch?.address, dispatchLat, dispatchLng]);

  const hasFix = currentLocation !== null;

  // Seconds left to answer a pending offer.
  useEffect(() => {
    if (!dispatch?.expires_at || accepted) {
      setSecondsLeft(null);
      return;
    }

    const expiresAt = new Date(dispatch.expires_at).getTime();
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [dispatch?.expires_at, accepted]);

  // Directions from this unit to the requester.
  useEffect(() => {
    if (!online || !dispatch?.id) {
      setRoute(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        // This unit -> the emergency: fastest route with live traffic
        // (TomTom). This is the route drawn on the map at the top.
        const from = currentLocationRef.current;
        const to = emergencyLocationRef.current;

        if (!from || !to) return;

        const next = await fetchTomTomRoute(from, to);
        if (!cancelled) setRoute(next && next.polyline.length ? next : null);
      } catch {
        /* keep the previous line */
      }
    };

    load();
    const timer = setInterval(load, 15_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    online,
    dispatch?.id,
    hasFix,
    emergencyLocation?.latitude,
    emergencyLocation?.longitude,
  ]);

  const hasRoute = route !== null;
  const etaMinutes = route
    ? Math.max(1, Math.round(route.duration_seconds / 60))
    : dispatch?.eta_minutes ?? null;
  const distanceKm = route
    ? route.distance_meters / 1000
    : dispatch?.distance_km ?? null;

  useEffect(() => {
    const here = currentLocationRef.current;

    if (!mapReady || !mapRef.current || !here) return;

    if (route && route.polyline.length > 1) {
      mapRef.current.fitToCoordinates(route.polyline, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
      return;
    }

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
  }, [mapReady, hasFix, emergencyLocation, hasRoute]);

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
      setFinished(null);
      setAwaitingRelease(false);
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

    // Silence the siren the moment the responder answers.
    stopSiren();
    setDispatchBusy(true);

    try {
      const updated = await apiFetch<Dispatch>(
        `${API.dispatches}/${dispatch.id}/accept`,
        { method: "POST" }
      );

      setDispatch(updated);
      setFinished(null);
      setAwaitingRelease(false);

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
            stopSiren();
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

  // "Arrived": the responder has reached the client. This ends the emergency
  // (the client is told the responder has arrived) but keeps the responder
  // busy until they free the vehicle below.
  const loadFeedback = useCallback(async (dispatchId: string) => {
    try {
      const state = await apiFetch<FeedbackState>(
        `/api/v1/feedback/by-dispatch/${dispatchId}`
      );
      setFeedback(state);
    } catch {
      setFeedback(null); // rating is optional: never block the console
    }
  }, []);

  // "Arrived": the responder has reached the client. This ends the emergency
  // (the client is told the responder has arrived and the fare is taken from
  // their wallet) but keeps the responder busy until they free the vehicle.
  //
  // Only allowed within 400 m of the client. Checked here with a fresh GPS fix
  // and enforced again by the server.
  const handleArrived = async () => {
    if (!dispatch || dispatchBusy) return;

    if (dispatch.latitude == null || dispatch.longitude == null) {
      Alert.alert("Client location missing", "We can't confirm your distance to the client.");
      return;
    }

    setDispatchBusy(true);

    let here: Coordinates | null = null;
    try {
      const fix = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      here = { latitude: fix.coords.latitude, longitude: fix.coords.longitude };
      currentLocationRef.current = here;
      setCurrentLocation(here);
    } catch {
      here = currentLocationRef.current;
    }

    setDispatchBusy(false);

    if (!here) {
      Alert.alert(
        "Location unavailable",
        "Turn on GPS so we can confirm you are at the client's location."
      );
      return;
    }

    const metres = haversineMeters(here, {
      latitude: dispatch.latitude,
      longitude: dispatch.longitude,
    });

    if (metres > ARRIVE_MAX_DISTANCE_METERS) {
      Alert.alert(
        "You're not there yet",
        `You are about ${Math.round(metres).toLocaleString()} m from the client. ` +
          `Get within ${ARRIVE_MAX_DISTANCE_METERS} m to confirm arrival.`
      );
      return;
    }

    const position = here;

    Alert.alert(
      "Confirm arrival",
      "Confirm that you have reached the client. This ends the emergency, notifies them that you have arrived and charges their wallet.",
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setDispatchBusy(true);

            try {
              const updated = await apiFetch<Dispatch | null>(
                `${API.dispatches}/${dispatch.id}/arrive`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    latitude: position.latitude,
                    longitude: position.longitude,
                  }),
                }
              );

              completedRef.current.add(dispatch.id);
              dispatchRef.current = null;

              setFinished(updated ?? dispatch);
              setDispatch(null);
              setRoute(null);
              setAwaitingRelease(true);
              feedbackDispatchRef.current = dispatch.id;
              setFeedback(null);
              loadFeedback(dispatch.id);
              refreshStats();
            } catch (err) {
              Alert.alert(
                "Couldn't confirm arrival",
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

  // "Cancel Request": same confirm-then-cancel flow as the client's track
  // page. Only available after accepting and before confirming arrival.
  const handleCancelRequest = () => {
    if (!dispatch || !accepted || cancelInProgressRef.current) return;

    const target = dispatch;

    Alert.alert(
      "Cancel Emergency",
      "This cancels the emergency for the client as well, and they will no longer have help on the way. You will become available again. Only do this if you cannot respond.",
      [
        { text: "Keep Request", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            if (cancelInProgressRef.current) return;

            cancelInProgressRef.current = true;
            setDispatchBusy(true);

            try {
              await apiFetch<unknown>(
                `${API.dispatches}/${target.id}/cancel`,
                { method: "POST" }
              );

              // Ignore any poll that was already in flight, and make sure
              // the poll does not announce a cancellation by the client.
              completedRef.current.add(target.id);
              dispatchRef.current = null;

              setDispatch(null);
              setFinished(null);
              setRoute(null);
              setAwaitingRelease(false);
              setProfile((current) =>
                current ? { ...current, status: "available" } : current
              );
              refreshStats();

              Alert.alert(
                "Emergency cancelled",
                "The client has been notified. You are available again."
              );
            } catch (err) {
              Alert.alert(
                "Couldn't cancel",
                errorMessage(err, "Please try again.")
              );
            } finally {
              cancelInProgressRef.current = false;
              setDispatchBusy(false);
            }
          },
        },
      ]
    );
  };

  // "Free vehicle": the responder is back and ready for the next emergency.
  const handleRelease = async () => {
    if (releaseBusy) return;

    setReleaseBusy(true);

    try {
      await apiFetch<unknown>(API.freeVehicle, { method: "POST" });

      setAwaitingRelease(false);
      setFinished(null);
      setProfile((current) =>
        current ? { ...current, status: "available" } : current
      );

      Alert.alert(
        "You are available",
        "Dispatch can now send you the next emergency."
      );
    } catch (err) {
      Alert.alert(
        "Couldn't free your vehicle",
        errorMessage(err, "Please try again.")
      );
    } finally {
      setReleaseBusy(false);
    }
  };

  /* ============================================================
     CLIENT: PROFILE + CALL
     ============================================================ */

  const fetchClientProfile = useCallback(
    async (dispatchId: string): Promise<ClientProfile> => {
      const cached = clientCacheRef.current;
      if (cached && cached.dispatchId === dispatchId) return cached.profile;

      const data = await apiFetch<ClientProfile>(
        `${API.dispatches}/${dispatchId}/client`
      );
      const next: ClientProfile = data ?? { name: null, phone: null };

      clientCacheRef.current = { dispatchId, profile: next };
      return next;
    },
    []
  );

  const dialNumber = async (phone: string) => {
    const number = phone.replace(/\s+/g, "");
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      Alert.alert("Unable to call", "Your device could not open the phone app.");
    }
  };

  // Calls the client straight from the emergency card.
  const handleCallClient = async () => {
    const target = dispatch ?? finished;
    if (!target || callBusy) return;

    setCallBusy(true);

    try {
      const client = await fetchClientProfile(target.id);
      const phone = client.phone?.trim();

      if (!phone) {
        Alert.alert(
          "No phone number",
          "This client has no phone number on file."
        );
        return;
      }

      await dialNumber(phone);
    } catch (err) {
      Alert.alert(
        "Couldn't call client",
        errorMessage(err, "Please try again.")
      );
    } finally {
      setCallBusy(false);
    }
  };

  const openClientProfile = async () => {
    const target = dispatch ?? finished;
    if (!target) return;

    setClientProfileOpen(true);
    setClientProfileLoading(true);
    setClientProfileError("");
    setClientProfile(null);

    try {
      setClientProfile(await fetchClientProfile(target.id));
    } catch (err) {
      setClientProfileError(
        errorMessage(err, "Couldn't load the client's profile.")
      );
    } finally {
      setClientProfileLoading(false);
    }
  };

  const callClient = () => {
    const phone = clientProfile?.phone?.trim();
    if (!phone) return;

    void dialNumber(phone);
  };

  // "Navigate to scene": show the route on the map at the top of this screen
  // (no external app). Scrolls back up and frames you + the emergency.
  const handleNavigate = () => {
    if (!emergencyLocation) {
      Alert.alert(
        "Location unavailable",
        "The emergency location hasn't been resolved yet."
      );
      return;
    }

    scrollRef.current?.scrollTo({ y: 0, animated: true });

    const here = currentLocationRef.current;
    const padding = { top: 60, right: 60, bottom: 60, left: 60 };

    if (route && route.polyline.length > 1) {
      mapRef.current?.fitToCoordinates(route.polyline, {
        edgePadding: padding,
        animated: true,
      });
    } else if (here) {
      mapRef.current?.fitToCoordinates([here, emergencyLocation], {
        edgePadding: padding,
        animated: true,
      });
    } else {
      mapRef.current?.animateToRegion(
        { ...emergencyLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        600
      );
    }
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
          ref={scrollRef}
          scrollEnabled={!mapTouching}
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
                                <TomTomMap
                  ref={mapRef}
                  style={styles.googleMap}
                  showTraffic
                  onMapReady={() => {
                    mapReadyRef.current = true;
                    setMapReady(true);
                  }}
                  onInteractionChange={setMapTouching}
                  initialRegion={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  {route && (
                    <TomTomPolyline
                      id="route"
                      coordinates={route.polyline}
                      color="#2563EB"
                      width={5}
                    />
                  )}
                  <TomTomMarker
                    id="me"
                    kind={isFireEngine(activeVehicle) ? "fire" : "ambulance"}
                    coordinate={currentLocation}
                    title="Your location"
                    description={
                      activeVehicle
                        ? `Unit ${activeVehicle.registration_number}`
                        : driverName
                    }
                  />

                  {emergencyLocation && (
                    <TomTomMarker
                      id="emergency"
                      kind="emergency"
                      coordinate={emergencyLocation}
                      title="Emergency location"
                      description={shown?.address ?? undefined}
                    />
                  )}
                </TomTomMap>
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

            {dispatch && (
              <View style={styles.mapStats}>
                <MapStat
                  value={etaMinutes != null ? `${etaMinutes} min` : "—"}
                  label="ETA"
                />
                <MapStat
                  value={distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—"}
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
                    {!online
                      ? "You are currently unavailable"
                      : awaitingRelease || accepted
                      ? "Busy — not receiving new emergencies"
                      : "Dispatch can see you"}
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

          {/* INCOMING / ACTIVE / LOCATED */}

          {dispatch ? (
            <View style={styles.card}>
              <View style={styles.emergencyHeader}>
                <View style={styles.emergencyIcon}>
                  <MaterialCommunityIcons
                    name={
                      isFireEmergency(dispatch.emergency_type)
                        ? "fire-truck"
                        : "ambulance"
                    }
                    size={23}
                    color="#FFFFFF"
                  />
                </View>

                <View style={styles.emergencyHeaderText}>
                  <Text style={styles.emergencyTitle} numberOfLines={2}>
                    {accepted ? "EN ROUTE" : "INCOMING"} •{" "}
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
                    {!accepted && secondsLeft != null
                      ? ` • ${secondsLeft}s left`
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

                    <View style={styles.contactRow}>
                      <Pressable
                        style={[
                          styles.callActionButton,
                          callBusy && { opacity: 0.6 },
                        ]}
                        onPress={handleCallClient}
                        disabled={callBusy}
                      >
                        {callBusy ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="call" size={19} color="#FFFFFF" />
                            <Text style={styles.callActionText}>
                              Call client
                            </Text>
                          </>
                        )}
                      </Pressable>

                      <Pressable
                        style={styles.profileActionButton}
                        onPress={openClientProfile}
                      >
                        <Ionicons
                          name="person-circle-outline"
                          size={20}
                          color="#0F172A"
                        />
                        <Text style={styles.profileActionText}>
                          Client profile
                        </Text>
                      </Pressable>
                    </View>

                    {(() => {
                      if (
                        !currentLocation ||
                        dispatch?.latitude == null ||
                        dispatch?.longitude == null
                      ) {
                        return null;
                      }
                      const metres = haversineMeters(currentLocation, {
                        latitude: dispatch.latitude,
                        longitude: dispatch.longitude,
                      });
                      return metres > ARRIVE_MAX_DISTANCE_METERS ? (
                        <Text style={{ color: "#B45309", fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 8 }}>
                          {Math.round(metres).toLocaleString()} m away. You can confirm arrival
                          within {ARRIVE_MAX_DISTANCE_METERS} m.
                        </Text>
                      ) : null;
                    })()}

                    <Pressable
                      style={[
                        styles.arrivedButton,
                        dispatchBusy && { opacity: 0.6 },
                      ]}
                      onPress={handleArrived}
                      disabled={dispatchBusy}
                    >
                      {dispatchBusy ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="flag" size={20} color="#FFFFFF" />
                          <Text style={styles.arrivedButtonText}>Arrived</Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      style={[
                        styles.cancelRequestButton,
                        dispatchBusy && { opacity: 0.6 },
                      ]}
                      onPress={handleCancelRequest}
                      disabled={dispatchBusy}
                    >
                      <Ionicons name="close" size={18} color="#DC2626" />
                      <Text style={styles.cancelRequestText}>
                        Cancel Request
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          ) : awaitingRelease ? (
            <View style={styles.card}>
              <View style={styles.locatedHeader}>
                <View style={styles.locatedIcon}>
                  <Ionicons name="checkmark-done" size={24} color="#FFFFFF" />
                </View>

                <View style={styles.emergencyHeaderText}>
                  <Text style={styles.emergencyTitle}>
                    LOCATED • CLIENT FOUND
                  </Text>

                  <Text style={styles.emergencySubtitle}>
                    Emergency completed. The client has been notified.
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                {finished && (
                  <View style={styles.detailsGrid}>
                    <Cell
                      label="Emergency type"
                      value={titleCase(finished.emergency_type)}
                    />
                    <Cell
                      label="Client"
                      value={finished.caller_name ?? "Unknown"}
                    />
                  </View>
                )}

                {finished?.address ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>LOCATION</Text>
                    <Text style={styles.notesText}>{finished.address}</Text>
                  </View>
                ) : null}

                {finished && (
                  <View style={styles.contactRow}>
                    <Pressable
                      style={[
                        styles.callActionButton,
                        callBusy && { opacity: 0.6 },
                      ]}
                      onPress={handleCallClient}
                      disabled={callBusy}
                    >
                      {callBusy ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="call" size={19} color="#FFFFFF" />
                          <Text style={styles.callActionText}>Call client</Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      style={styles.profileActionButton}
                      onPress={openClientProfile}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={20}
                        color="#0F172A"
                      />
                      <Text style={styles.profileActionText}>
                        Client profile
                      </Text>
                    </Pressable>
                  </View>
                )}

                {feedback &&
                (feedback.can_rate ||
                  feedback.can_report ||
                  feedback.my_rating ||
                  feedback.has_reported) ? (
                  <FeedbackActions
                    incidentId={feedback.incident_id}
                    role="responder"
                    otherName={feedback.other_party_name}
                    canRate={feedback.can_rate}
                    canReport={feedback.can_report}
                    myRating={feedback.my_rating}
                    hasReported={feedback.has_reported}
                    onDone={() =>
                      feedbackDispatchRef.current &&
                      loadFeedback(feedbackDispatchRef.current)
                    }
                  />
                ) : null}

                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>NOT AVAILABLE YET</Text>

                  <Text style={styles.notesText}>
                    You won't receive new emergencies until you free your
                    vehicle. Tap the button below once you are ready for the
                    next call.
                  </Text>
                </View>

                <Pressable
                  style={[
                    styles.availableButton,
                    releaseBusy && { opacity: 0.6 },
                  ]}
                  onPress={handleRelease}
                  disabled={releaseBusy}
                >
                  {releaseBusy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name={
                          isFireEngine(activeVehicle)
                            ? "fire-truck"
                            : "ambulance"
                        }
                        size={21}
                        color="#FFFFFF"
                      />
                      <Text style={styles.availableButtonText}>
                        Free vehicle • I'm available
                      </Text>
                    </>
                  )}
                </Pressable>
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

          {/* INSPECTION CHECKLIST */}

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
            ) : showCollapsedChecklist ? (
              <Pressable
                style={styles.inspectionDone}
                disabled={online}
                onPress={() => setChecklistExpanded(true)}
              >
                <Ionicons name="checkmark-circle" size={24} color="#16A34A" />

                <View style={styles.inspectionDoneInfo}>
                  <Text style={styles.inspectionDoneTitle}>
                    All {checklistItems.length} items checked
                  </Text>

                  <Text style={styles.inspectionDoneText}>
                    {online
                      ? "Inspection was completed before your shift."
                      : "Vehicle inspection complete. You can go online."}
                  </Text>
                </View>

                {!online && (
                  <Text style={styles.inspectionDoneLink}>Review</Text>
                )}
              </Pressable>
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

                  {allMarked && !online && (
                    <Pressable
                      hitSlop={10}
                      onPress={() => setChecklistExpanded(false)}
                    >
                      <Text style={styles.inspectionDoneLink}>Hide</Text>
                    </Pressable>
                  )}
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

      {/* CLIENT PROFILE */}

      <Modal
        visible={clientProfileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setClientProfileOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client profile</Text>

              <Pressable
                onPress={() => setClientProfileOpen(false)}
                hitSlop={12}
              >
                <Ionicons name="close" size={22} color="#0F172A" />
              </Pressable>
            </View>

            {clientProfileLoading ? (
              <View style={styles.modalBody}>
                <ActivityIndicator size="large" color="#DC2626" />
              </View>
            ) : clientProfileError ? (
              <View style={styles.modalBody}>
                <Ionicons name="alert-circle-outline" size={30} color="#DC2626" />
                <Text style={styles.clientPhone}>{clientProfileError}</Text>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>
                    {initials(clientProfile?.name ?? null)}
                  </Text>
                </View>

                <Text style={styles.clientName}>
                  {clientProfile?.name ?? "Name unavailable"}
                </Text>

                <Text style={styles.clientPhone}>
                  {clientProfile?.phone ?? "No phone number on file"}
                </Text>

                {clientProfile?.phone ? (
                  <Pressable style={styles.callClientButton} onPress={callClient}>
                    <Ionicons name="call" size={18} color="#FFFFFF" />
                    <Text style={styles.callClientText}>Call client</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    backgroundColor: "#0F172A",
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

  contactRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  callActionButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  callActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  profileActionButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  profileActionText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },

  arrivedButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  arrivedButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  cancelRequestButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFFFFF",
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  cancelRequestText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },

  availableButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  availableButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  /* ==========================================================
     LOCATED
  ========================================================== */

  locatedHeader: {
    minHeight: 75,
    backgroundColor: "#16A34A",
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  locatedIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#15803D",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  /* ==========================================================
     CLIENT PROFILE MODAL
  ========================================================== */

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  modalBody: {
    alignItems: "center",
    paddingVertical: 22,
  },

  clientAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  clientAvatarText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },

  clientName: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  clientPhone: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },

  callClientButton: {
    marginTop: 18,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  callClientText: {
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

  /* Collapsed checklist */

  inspectionDone: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  inspectionDoneInfo: {
    flex: 1,
  },

  inspectionDoneTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },

  inspectionDoneText: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: "#166534",
  },

  inspectionDoneLink: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803D",
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