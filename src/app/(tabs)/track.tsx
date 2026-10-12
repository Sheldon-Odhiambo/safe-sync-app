import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetchLogged as apiFetch } from "@/lib/logged-api";
import { playSiren, stopSiren } from "@/lib/siren";

// ============================================================
// TYPES
// ============================================================

type Coordinates = {
  latitude: number;
  longitude: number;
};

type PricingTier = {
  from_km: number | null;
  to_km: number | null;
  km: number | null;
  rate_per_km: number | null;
  amount: number | null;
};

type Pricing = {
  distance_km: number | null;
  subtotal: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  total: number | null;
  currency: string | null;
  breakdown: PricingTier[] | null;
};

type Responder = {
  name: string | null;
  role: string | null;
  phone: string | null;
  vehicle_registration: string | null;
  vehicle_type: string | null;
  station: string | null;
};

type VehicleLocation = {
  latitude: number | null;
  longitude: number | null;
  recorded_at: string | null;
};

type Tracking = {
  incident_id: string;
  public_id: string;
  status: string;
  emergency_type: string;
  emergency_type_name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  responder: Responder | null;
  vehicle_location: VehicleLocation | null;
  eta_minutes: number | null;
  distance_km: number | null;
  eta_is_estimate: boolean;
  pricing: Pricing | null;
  can_cancel: boolean;
};

type RouteInfo = {
  distance_meters: number | null;
  duration_seconds: number | null;
  polyline: Coordinates[];
};

// ============================================================
// CONSTANTS
// ============================================================

const COLORS = {
  primary: "#DC2626",
  primaryDark: "#B91C1C",
  white: "#FFFFFF",
  black: "#111111",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  background: "#F8FAFC",
  secondary: "#F1F5F9",
  success: "#16A34A",
  successLight: "#DCFCE7",
  dangerLight: "#FEF2F2",
  route: "#2563EB",
};

const TRACK_POLL_MS = 4_000;
const ROUTE_POLL_MS = 15_000;

const ARRIVED_STATUSES = ["arrived", "on_scene", "completed"];
const TERMINAL_STATUSES = ["completed", "cancelled", "escalated"];

const TIMELINE = [
  {
    label: "Emergency reported",
    detail: "Your request was received and your exact location was shared.",
  },
  {
    label: "Responder assigned",
    detail: "A responder accepted your emergency and is on the way.",
  },
  {
    label: "Responder approaching",
    detail: "The responder is almost at your location.",
  },
  {
    label: "Responder arrived",
    detail: "The responder has reached your location.",
  },
];

// ============================================================
// SAFE HELPERS
// ============================================================

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

/**
 * Converts an API value to a finite number.
 * Handles null, undefined, empty strings and invalid numeric strings.
 */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const result = typeof value === "number" ? value : Number(value);

  return Number.isFinite(result) ? result : null;
}

/**
 * Formats money without ever calling toLocaleString on null.
 *
 * Missing amounts are displayed as unavailable rather than KES 0.00.
 * This prevents missing backend pricing data from looking like a
 * confirmed zero charge.
 */
function formatMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined = "KES"
): string {
  const amount = toNumber(value);

  if (amount === null) {
    return "—";
  }

  const normalizedCurrency =
    typeof currency === "string" && currency.trim()
      ? currency.trim().toUpperCase()
      : "KES";

  const formatted = amount.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${normalizedCurrency === "KES" ? "KSh" : normalizedCurrency} ${formatted}`;
}

function formatDistance(
  value: number | string | null | undefined,
  decimals = 2
): string {
  const distance = toNumber(value);

  return distance === null ? "—" : distance.toFixed(decimals);
}

function formatEta(value: number | null | undefined, estimated: boolean) {
  const minutes = toNumber(value);

  if (minutes === null || minutes < 0) {
    return "—";
  }

  return `${estimated ? "~" : ""}${Math.round(minutes)} min`;
}

function initials(name: string | null | undefined): string {
  if (!name?.trim()) {
    return "R";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isValidCoordinate(
  latitude: unknown,
  longitude: unknown
): latitude is number {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  return (
    lat !== null &&
    lng !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function getCoordinates(
  latitude: unknown,
  longitude: unknown
): Coordinates | null {
  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
}

function isValidRoute(route: RouteInfo | null): route is RouteInfo {
  return Boolean(
    route &&
      Array.isArray(route.polyline) &&
      route.polyline.length >= 2 &&
      route.polyline.every(
        (point) =>
          isValidCoordinate(point.latitude, point.longitude)
      )
  );
}

function normalizeStatus(status: string | null | undefined): string {
  return (status ?? "created").trim().toLowerCase();
}

function normalizeEmergencyType(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

// ============================================================
// SCREEN
// ============================================================

export default function TrackScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const userMovedMapRef = useRef(false);
  const mountedRef = useRef(true);
  const cancelInProgressRef = useRef(false);
  // null until the first tracking answer, then whether the responder had
  // already arrived. Used to play the arrival siren only on the change.
  const previousArrivedRef = useRef<boolean | null>(null);

  const params = useLocalSearchParams<{
    incidentId?: string | string[];
  }>();

  const incidentId =
    typeof params.incidentId === "string"
      ? params.incidentId
      : params.incidentId?.[0] ?? null;

  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // ----------------------------------------------------------
  // DERIVED STATE
  // ----------------------------------------------------------

  const status = normalizeStatus(tracking?.status);
  const arrived = ARRIVED_STATUSES.includes(status);
  const terminal = TERMINAL_STATUSES.includes(status);

  const responder = tracking?.responder ?? null;
  const hasResponder = responder !== null;

  const etaMinutes = toNumber(tracking?.eta_minutes);

  const approaching =
    hasResponder &&
    !arrived &&
    etaMinutes !== null &&
    etaMinutes >= 0 &&
    etaMinutes <= 2;

  const stage = arrived ? 3 : approaching ? 2 : hasResponder ? 1 : 0;

  const incidentCoordinates = getCoordinates(
    tracking?.latitude,
    tracking?.longitude
  );

  const vehicleCoordinates = getCoordinates(
    tracking?.vehicle_location?.latitude,
    tracking?.vehicle_location?.longitude
  );

  const isFire =
    normalizeEmergencyType(tracking?.emergency_type) === "fire";

  const vehicleIcon = isFire ? "fire-truck" : "ambulance";

  const pricing = tracking?.pricing ?? null;

  const breakdown = Array.isArray(pricing?.breakdown)
    ? pricing.breakdown
    : [];

  const currency =
    typeof pricing?.currency === "string" && pricing.currency.trim()
      ? pricing.currency
      : "KES";

  const escalated = status === "escalated";
  const cancelled = status === "cancelled";

  const mapStatusText = arrived
    ? "Responder arrived"
    : hasResponder
      ? "Responder on the way"
      : escalated
        ? "No responder available"
        : cancelled
          ? "Request cancelled"
          : "Finding the nearest responder…";

  const subtitle = escalated
    ? "no responder available"
    : cancelled
      ? "cancelled"
      : arrived
        ? "response complete"
        : hasResponder
          ? "live tracking"
          : "finding a responder";

  // ----------------------------------------------------------
  // MOUNT CLEANUP
  // ----------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ----------------------------------------------------------
  // ARRIVAL SIREN
  // ----------------------------------------------------------

  // Plays once when the responder arrives while this screen is open. If the
  // screen opens on an emergency that has already arrived, it stays quiet.
  useEffect(() => {
    if (!tracking) return;

    if (previousArrivedRef.current === false && arrived) {
      void playSiren();
    }

    previousArrivedRef.current = arrived;
  }, [tracking, arrived]);

  // Never leave a siren playing after the screen closes.
  useEffect(() => {
    return () => {
      stopSiren();
    };
  }, []);

  // ----------------------------------------------------------
  // POLL TRACKING
  // ----------------------------------------------------------

  useEffect(() => {
    if (!incidentId) {
      setLoading(false);
      setLoadError("No emergency ID was provided.");
      return;
    }

    let cancelledEffect = false;
    let inFlight = false;

    const load = async () => {
      if (inFlight || cancelledEffect) {
        return;
      }

      inFlight = true;

      try {
        const data = await apiFetch<Tracking>(
          `/api/v1/emergencies/${encodeURIComponent(incidentId)}/tracking`
        );

        if (cancelledEffect) {
          return;
        }

        if (!data || typeof data !== "object") {
          throw new Error("The server returned an invalid tracking response.");
        }

        setTracking(data);
        setLoadError(null);
      } catch (error) {
        if (!cancelledEffect) {
          setLoadError(
            errorMessage(error, "Couldn't load your emergency.")
          );
        }
      } finally {
        inFlight = false;

        if (!cancelledEffect) {
          setLoading(false);
        }
      }
    };

    void load();

    // Continue refreshing active emergencies only.
    const timer = setInterval(() => {
      void load();
    }, TRACK_POLL_MS);

    return () => {
      cancelledEffect = true;
      clearInterval(timer);
    };
  }, [incidentId, reloadKey]);

  // ----------------------------------------------------------
  // STOP TRACKING POLLING AFTER A TERMINAL STATUS
  // ----------------------------------------------------------

  useEffect(() => {
    if (!terminal || !incidentId) {
      return;
    }

    // The tracking endpoint has already returned a terminal status.
    // The tracking poll below is stopped by this state guard.
  }, [terminal, incidentId]);

  // ----------------------------------------------------------
  // POLL ROUTE: RESPONDER -> INCIDENT
  // ----------------------------------------------------------

  useEffect(() => {
    if (
      !incidentId ||
      !hasResponder ||
      arrived ||
      terminal
    ) {
      setRoute(null);
      return;
    }

    let cancelledEffect = false;
    let inFlight = false;

    const loadRoute = async () => {
      if (inFlight || cancelledEffect) {
        return;
      }

      inFlight = true;

      try {
        const data = await apiFetch<RouteInfo | null>(
          `/api/v1/emergencies/${encodeURIComponent(incidentId)}/route`
        );

        if (cancelledEffect) {
          return;
        }

        setRoute(isValidRoute(data) ? data : null);
      } catch {
        // Keep the last valid route. The next polling cycle retries.
      } finally {
        inFlight = false;
      }
    };

    void loadRoute();

    const timer = setInterval(() => {
      void loadRoute();
    }, ROUTE_POLL_MS);

    return () => {
      cancelledEffect = true;
      clearInterval(timer);
    };
  }, [incidentId, hasResponder, arrived, terminal]);

  // ----------------------------------------------------------
  // MAP: FIT INCIDENT AND RESPONDER
  // ----------------------------------------------------------

  const fitMap = useCallback(() => {
    if (!mapReady || !mapRef.current || !incidentCoordinates) {
      return;
    }

    if (vehicleCoordinates && !arrived) {
      mapRef.current.fitToCoordinates(
        [vehicleCoordinates, incidentCoordinates],
        {
          edgePadding: {
            top: 75,
            right: 65,
            bottom: 75,
            left: 65,
          },
          animated: true,
        }
      );

      return;
    }

    mapRef.current.animateToRegion(
      {
        ...incidentCoordinates,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      600
    );
  }, [
    mapReady,
    incidentCoordinates?.latitude,
    incidentCoordinates?.longitude,
    vehicleCoordinates?.latitude,
    vehicleCoordinates?.longitude,
    arrived,
  ]);

  useEffect(() => {
    if (!userMovedMapRef.current) {
      fitMap();
    }
  }, [fitMap]);

  // ----------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------

  const callResponder = useCallback(async () => {
    const phone = responder?.phone?.trim();

    if (!phone) {
      Alert.alert("Unavailable", "The responder has no phone number.");
      return;
    }

    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert(
        "Unable to call",
        "Your device could not open the phone app."
      );
    }
  }, [responder?.phone]);

  const messageResponder = useCallback(async () => {
    const phone = responder?.phone?.trim();

    if (!phone) {
      Alert.alert("Unavailable", "The responder has no phone number.");
      return;
    }

    try {
      await Linking.openURL(`sms:${phone}`);
    } catch {
      Alert.alert(
        "Unable to message",
        "Your device could not open messaging."
      );
    }
  }, [responder?.phone]);

  const shareStatus = useCallback(async () => {
    if (!tracking) {
      return;
    }

    try {
      const location = incidentCoordinates
        ? `https://www.google.com/maps/search/?api=1&query=${incidentCoordinates.latitude},${incidentCoordinates.longitude}`
        : "Location coordinates are currently unavailable.";

      const eta =
        hasResponder &&
        etaMinutes !== null &&
        etaMinutes >= 0 &&
        !arrived
          ? `Responder ETA: ${formatEta(etaMinutes, tracking.eta_is_estimate)}\n`
          : "";

      await Share.share({
        message:
          `I am being assisted through SafeSync.\n\n` +
          `Emergency: ${tracking.emergency_type_name || "Emergency"}\n` +
          `Incident: ${tracking.public_id || tracking.incident_id}\n` +
          `Status: ${tracking.status}\n` +
          eta +
          `Location: ${location}`,
      });
    } catch {
      // Sharing may be dismissed by the user.
    }
  }, [
    tracking,
    incidentCoordinates?.latitude,
    incidentCoordinates?.longitude,
    hasResponder,
    etaMinutes,
    arrived,
  ]);

  const handleCancel = useCallback(() => {
    if (!incidentId || cancelInProgressRef.current) {
      return;
    }

    Alert.alert(
      "Cancel Emergency",
      "Are you sure you want to cancel this emergency request?",
      [
        {
          text: "Keep Request",
          style: "cancel",
        },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            if (cancelInProgressRef.current) {
              return;
            }

            cancelInProgressRef.current = true;
            setCancelling(true);

            try {
              await apiFetch<unknown>(
                `/api/v1/emergencies/${encodeURIComponent(incidentId)}/cancel`,
                {
                  method: "POST",
                  body: JSON.stringify({}),
                }
              );

              if (mountedRef.current) {
                router.replace("/home");
              }
            } catch (error) {
              Alert.alert(
                "Couldn't cancel",
                errorMessage(error, "Please try again.")
              );
            } finally {
              cancelInProgressRef.current = false;

              if (mountedRef.current) {
                setCancelling(false);
              }
            }
          },
        },
      ]
    );
  }, [incidentId, router]);

  const handleBackToHome = useCallback(() => {
    router.replace("/home");
  }, [router]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setReloadKey((key) => key + 1);
  }, []);

  // ----------------------------------------------------------
  // MISSING INCIDENT ID
  // ----------------------------------------------------------

  if (!incidentId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color={COLORS.primary}
          />

          <Text style={styles.centerTitle}>
            No emergency to track
          </Text>

          <Text style={styles.centerText}>
            Open tracking from an existing emergency request.
          </Text>

          <Pressable
            style={styles.locationRetryButton}
            onPress={handleBackToHome}
          >
            <Text style={styles.locationRetryText}>
              Back to home
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------------
  // LOADING / ERROR
  // ----------------------------------------------------------

  if (!tracking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          {loading ? (
            <>
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
              />

              <Text style={styles.centerText}>
                Loading your emergency…
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="alert-circle-outline"
                size={36}
                color={COLORS.primary}
              />

              <Text style={styles.centerTitle}>
                Couldn't load your emergency
              </Text>

              <Text style={styles.centerText}>
                {loadError ?? "Please check your connection and try again."}
              </Text>

              <Pressable
                style={styles.locationRetryButton}
                onPress={handleRetry}
              >
                <Ionicons
                  name="refresh"
                  size={17}
                  color={COLORS.white}
                />

                <Text style={styles.locationRetryText}>
                  Try again
                </Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={handleBackToHome}
              >
                <Text style={styles.secondaryButtonText}>
                  Back to home
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* STATUS CARD */}

        <View style={styles.statusCard}>
          <View style={styles.ambulanceCircle}>
            <MaterialCommunityIcons
              name={vehicleIcon}
              size={23}
              color={COLORS.white}
            />
          </View>

          <View style={styles.statusInformation}>
            <Text style={styles.statusTitle} numberOfLines={1}>
              {tracking.emergency_type_name || "Emergency"}
            </Text>

            <Text style={styles.statusSubtitle} numberOfLines={2}>
              Incident {tracking.public_id || tracking.incident_id} · {subtitle}
            </Text>
          </View>

          <View
            style={[
              styles.liveBadge,
              (arrived || terminal) && styles.arrivedBadge,
            ]}
          >
            <View
              style={[
                styles.liveDot,
                (arrived || terminal) && styles.arrivedDot,
              ]}
            />

            <Text
              style={[
                styles.liveBadgeText,
                (arrived || terminal) && styles.endedBadgeText,
              ]}
            >
              {arrived ? "ARRIVED" : terminal ? "ENDED" : "LIVE"}
            </Text>
          </View>
        </View>

        {/* MAP */}

        <View style={styles.mapContainer}>
          {incidentCoordinates ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              onMapReady={() => setMapReady(true)}
              onPanDrag={() => {
                userMovedMapRef.current = true;
              }}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass
              mapType="standard"
              initialRegion={{
                ...incidentCoordinates,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
            >
              {route && !arrived && (
                <Polyline
                  coordinates={route.polyline}
                  strokeColor={COLORS.route}
                  strokeWidth={5}
                />
              )}

              {/* INCIDENT LOCATION */}

              <Marker
                coordinate={incidentCoordinates}
                title="Your location"
                description={tracking.address ?? undefined}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.clientMarkerWrap}>
                  <View style={styles.clientPulse} />

                  <View style={styles.clientOuter}>
                    <View style={styles.clientInner} />
                  </View>
                </View>
              </Marker>

              {/* RESPONDER VEHICLE */}

              {vehicleCoordinates && !arrived && responder && (
                <Marker
                  coordinate={vehicleCoordinates}
                  title={responder.name || "Responder"}
                  description={
                    responder.vehicle_registration ?? undefined
                  }
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.responderMarkerWrap}>
                    <View style={styles.vehiclePulse} />

                    <View style={styles.vehicleCircle}>
                      <MaterialCommunityIcons
                        name={vehicleIcon}
                        size={18}
                        color={COLORS.white}
                      />
                    </View>
                  </View>
                </Marker>
              )}
            </MapView>
          ) : (
            <View style={styles.mapUnavailable}>
              <Ionicons
                name="location-outline"
                size={34}
                color={COLORS.primary}
              />

              <Text style={styles.mapUnavailableTitle}>
                Location unavailable
              </Text>

              <Text style={styles.mapUnavailableText}>
                The server has not provided valid incident coordinates.
              </Text>
            </View>
          )}

          <View style={styles.mapStatus}>
            <Ionicons
              name="navigate"
              size={14}
              color={COLORS.primary}
            />

            <Text style={styles.mapStatusText}>
              {mapStatusText}
            </Text>
          </View>

          {incidentCoordinates && (
            <Pressable
              style={styles.myLocationButton}
              onPress={() => {
                userMovedMapRef.current = false;
                fitMap();
              }}
            >
              <Ionicons
                name="locate"
                size={20}
                color={COLORS.text}
              />
            </Pressable>
          )}
        </View>

        {/* RESPONSE FARE */}

        <View style={styles.priceCard}>
          <View style={styles.priceHeader}>
            <View style={styles.actionIcon}>
              <Ionicons
                name="cash-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.priceTitle}>
              Response fare
            </Text>
          </View>

          {pricing ? (
            <>
              <Text style={styles.priceTotal}>
                {formatMoney(pricing.total, currency)}
              </Text>

              <Text style={styles.priceNote}>
                {formatDistance(pricing.distance_km)} km route
                {" · "}
                {toNumber(pricing.vat_rate) !== null
                  ? `includes ${Math.round(Number(pricing.vat_rate) * 100)}% VAT`
                  : "VAT information unavailable"}
              </Text>

              {!(
                toNumber(pricing.total) !== null &&
                toNumber(pricing.subtotal) !== null &&
                toNumber(pricing.vat_amount) !== null
              ) && (
                <View style={styles.pricingWarning}>
                  <Ionicons
                    name="information-circle-outline"
                    size={17}
                    color={COLORS.primary}
                  />

                  <Text style={styles.pricingWarningText}>
                    Some fare information is unavailable. The final charge
                    must be confirmed by the server.
                  </Text>
                </View>
              )}

              <View style={styles.priceDivider} />

              {breakdown.length > 0 ? (
                breakdown.map((tier, index) => (
                  <View
                    key={`${tier.from_km ?? "from"}-${tier.to_km ?? "to"}-${index}`}
                    style={styles.priceRow}
                  >
                    <Text style={styles.priceRowLabel}>
                      {formatDistance(tier.km)} km ×{" "}
                      {formatMoney(tier.rate_per_km, currency)}
                    </Text>

                    <Text style={styles.priceRowValue}>
                      {formatMoney(tier.amount, currency)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.priceNote}>
                  No fare breakdown is currently available.
                </Text>
              )}

              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>
                  Subtotal
                </Text>

                <Text style={styles.priceRowValue}>
                  {formatMoney(pricing.subtotal, currency)}
                </Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>
                  VAT
                </Text>

                <Text style={styles.priceRowValue}>
                  {formatMoney(pricing.vat_amount, currency)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.priceLoading}>
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
              />

              <Text style={styles.priceNote}>
                Calculating your fare…
              </Text>
            </View>
          )}
        </View>

        {/* DETAILS */}

        <View style={styles.detailsCard}>
          {escalated && (
            <View style={styles.noticeCard}>
              <Ionicons
                name="alert-circle"
                size={22}
                color={COLORS.primary}
              />

              <Text style={styles.noticeText}>
                No responder could be reached for this emergency. If it is
                life threatening, call your local emergency number now.
              </Text>
            </View>
          )}

          {!hasResponder && !terminal && (
            <View style={styles.searchingCard}>
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
              />

              <Text style={styles.searchingText}>
                Contacting the nearest available responders…
              </Text>
            </View>
          )}

          {responder && (
            <>
              <View style={styles.metricsRow}>
                <Metric
                  label="ETA"
                  value={
                    arrived
                      ? "Arrived"
                      : formatEta(
                          tracking.eta_minutes,
                          tracking.eta_is_estimate
                        )
                  }
                  emphasis
                />

                <Metric
                  label="Distance"
                  value={
                    tracking.distance_km != null
                      ? `${formatDistance(tracking.distance_km, 1)} km`
                      : "—"
                  }
                />

                <Metric
                  label="Unit"
                  value={responder.vehicle_registration || "—"}
                />
              </View>

              <View style={styles.responderCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initials(responder.name)}
                  </Text>
                </View>

                <View style={styles.responderInfo}>
                  <Text style={styles.responderName} numberOfLines={2}>
                    {responder.name || "Assigned responder"}
                    {responder.role ? ` · ${responder.role}` : ""}
                  </Text>

                  {!!responder.station && (
                    <Text
                      style={styles.responderStation}
                      numberOfLines={2}
                    >
                      {responder.station}
                    </Text>
                  )}

                  <View style={styles.verifiedRow}>
                    <View style={styles.verifiedDot} />

                    <Text style={styles.verifiedText}>
                      Responder assigned
                    </Text>
                  </View>
                </View>

                {!!responder.phone && (
                  <View style={styles.contactButtons}>
                    <Pressable
                      style={styles.callButton}
                      onPress={callResponder}
                      accessibilityRole="button"
                      accessibilityLabel="Call responder"
                    >
                      <Ionicons
                        name="call"
                        size={18}
                        color={COLORS.white}
                      />
                    </Pressable>

                    <Pressable
                      style={styles.messageButton}
                      onPress={messageResponder}
                      accessibilityRole="button"
                      accessibilityLabel="Message responder"
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={18}
                        color={COLORS.primary}
                      />
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}

          {/* EMERGENCY INFORMATION */}

          <View style={styles.emergencyInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Emergency
              </Text>

              <Text style={styles.infoValue}>
                {tracking.emergency_type_name || "Emergency"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Incident ID
              </Text>

              <Text style={styles.infoValue}>
                {tracking.public_id || tracking.incident_id}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Location
              </Text>

              <Text
                style={[styles.infoValue, styles.locationValue]}
                numberOfLines={2}
              >
                {tracking.address?.trim() ||
                  (incidentCoordinates
                    ? `${incidentCoordinates.latitude.toFixed(5)}, ${incidentCoordinates.longitude.toFixed(5)}`
                    : "Location unavailable")}
              </Text>
            </View>

            {!!tracking.description && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Details
                </Text>

                <Text style={styles.infoValue} numberOfLines={3}>
                  {tracking.description}
                </Text>
              </View>
            )}
          </View>

          {/* RESPONSE TIMELINE */}

          {!escalated && !cancelled && (
            <View style={styles.timeline}>
              <Text style={styles.timelineHeading}>
                Response Progress
              </Text>

              {TIMELINE.map((item, index) => {
                const done = index <= stage;
                const current = index === stage && !arrived;
                const isLast = index === TIMELINE.length - 1;

                return (
                  <View key={item.label} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineCircle,
                          done && styles.timelineCircleDone,
                          current && styles.timelineCircleCurrent,
                        ]}
                      >
                        {done ? (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={COLORS.white}
                          />
                        ) : (
                          <View style={styles.emptyDot} />
                        )}
                      </View>

                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            index < stage && styles.timelineLineDone,
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.timelineContent}>
                      <View style={styles.timelineTitleRow}>
                        <Text
                          style={[
                            styles.timelineTitle,
                            !done && styles.timelineTitleInactive,
                          ]}
                        >
                          {item.label}
                        </Text>

                        {current && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>
                              CURRENT
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.timelineDetail}>
                        {item.detail}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* SHARE STATUS */}

          <Pressable
            style={styles.actionButton}
            onPress={shareStatus}
            accessibilityRole="button"
            accessibilityLabel="Share emergency status"
          >
            <View style={styles.actionIcon}>
              <Ionicons
                name="share-social-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>
                Share Emergency Status
              </Text>

              <Text style={styles.actionSubtitle}>
                Send the incident details and your location to someone
              </Text>
            </View>
          </Pressable>
        </View>

        {/* FOOTER ACTION */}

        {terminal || arrived ? (
          <Pressable
            style={styles.dashboardButton}
            onPress={handleBackToHome}
          >
            <Text style={styles.dashboardButtonText}>
              RETURN TO HOME
            </Text>
          </Pressable>
        ) : tracking.can_cancel ? (
          <Pressable
            style={[
              styles.cancelButton,
              cancelling && styles.disabledButton,
            ]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator
                size="small"
                color={COLORS.muted}
              />
            ) : (
              <>
                <Ionicons
                  name="close"
                  size={18}
                  color={COLORS.muted}
                />

                <Text style={styles.cancelText}>
                  Cancel Request
                </Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// METRIC COMPONENT
// ============================================================

function Metric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.metricValue,
          emphasis && styles.metricValueEmphasis,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 35,
  },

  // Loading and error states
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  centerTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  centerText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
    textAlign: "center",
  },
  locationRetryButton: {
    marginTop: 14,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  locationRetryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 8,
    padding: 10,
  },
  secondaryButtonText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },

  // Status card
  statusCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  ambulanceCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  statusInformation: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  statusSubtitle: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.muted,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },
  arrivedBadge: {
    backgroundColor: COLORS.successLight,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 5,
  },
  arrivedDot: {
    backgroundColor: COLORS.success,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.primary,
  },
  endedBadgeText: {
    color: COLORS.success,
  },

  // Map
  mapContainer: {
    height: 330,
    marginTop: 15,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.secondary,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapUnavailable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    backgroundColor: COLORS.secondary,
  },
  mapUnavailableTitle: {
    marginTop: 9,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },
  mapUnavailableText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    color: COLORS.muted,
  },
  myLocationButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  mapStatus: {
    position: "absolute",
    top: 12,
    left: 12,
    maxWidth: "85%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  mapStatusText: {
    flexShrink: 1,
    marginLeft: 5,
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.text,
  },

  // Client location marker
  clientMarkerWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  clientPulse: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(22,163,74,0.18)",
  },
  clientOuter: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  clientInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.success,
  },

  // Responder marker
  responderMarkerWrap: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  vehiclePulse: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(220,38,38,0.18)",
  },
  vehicleCircle: {
    width: 33,
    height: 33,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Price card
  priceCard: {
    marginTop: 15,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceTitle: {
    marginLeft: 11,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  priceTotal: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.primary,
  },
  priceNote: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.muted,
  },
  pricingWarning: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.dangerLight,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  pricingWarningText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.primaryDark,
  },
  priceLoading: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 28,
    gap: 10,
  },
  priceRowLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.muted,
  },
  priceRowValue: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  // Details
  detailsCard: {
    marginTop: 15,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  searchingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 15,
    backgroundColor: COLORS.secondary,
    marginBottom: 14,
  },
  searchingText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 15,
    backgroundColor: COLORS.dangerLight,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.primaryDark,
  },

  // Metrics
  metricsRow: {
    flexDirection: "row",
    marginHorizontal: -4,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.secondary,
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    marginHorizontal: 4,
  },
  metricLabel: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricValue: {
    marginTop: 5,
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "800",
  },
  metricValueEmphasis: {
    color: COLORS.primary,
    fontSize: 16,
  },

  // Responder card
  responderCard: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 17,
    padding: 13,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },
  responderInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
    marginRight: 6,
  },
  responderName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  responderStation: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.muted,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },
  verifiedText: {
    fontSize: 9,
    color: COLORS.success,
    fontWeight: "700",
  },
  contactButtons: {
    flexDirection: "row",
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 5,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Emergency information
  emergencyInfo: {
    marginTop: 18,
    padding: 13,
    borderRadius: 15,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    minHeight: 30,
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "600",
  },
  infoValue: {
    flex: 1,
    minWidth: 0,
    marginLeft: 15,
    textAlign: "right",
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.text,
    fontWeight: "800",
  },
  locationValue: {
    color: COLORS.primary,
  },

  // Timeline
  timeline: {
    marginTop: 22,
  },
  timelineHeading: {
    marginBottom: 15,
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 68,
  },
  timelineLeft: {
    width: 30,
    alignItems: "center",
  },
  timelineCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineCircleDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineCircleCurrent: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: COLORS.primary,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 14,
  },
  timelineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  timelineTitleInactive: {
    color: COLORS.muted,
  },
  timelineDetail: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.muted,
  },
  currentBadge: {
    marginLeft: 7,
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 7,
    fontWeight: "900",
    color: COLORS.primary,
  },

  // Actions
  actionButton: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginTop: 10,
    backgroundColor: COLORS.white,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },
  actionSubtitle: {
    marginTop: 3,
    fontSize: 9,
    lineHeight: 13,
    color: COLORS.muted,
  },

  // Cancel and home buttons
  cancelButton: {
    minHeight: 54,
    marginTop: 8,
    marginBottom: 60,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
  },
  dashboardButton: {
    minHeight: 54,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
});