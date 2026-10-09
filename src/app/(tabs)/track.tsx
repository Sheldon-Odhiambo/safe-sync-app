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

// ============================================================
// TYPES
// ============================================================

type Coordinates = { latitude: number; longitude: number };

type PricingTier = {
  from_km: number;
  to_km: number;
  km: number;
  rate_per_km: number;
  amount: number;
};

type Pricing = {
  distance_km: number;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  currency: string;
  breakdown: PricingTier[];
};

type Tracking = {
  incident_id: string;
  public_id: string;
  status: string;
  emergency_type: string;
  emergency_type_name: string;
  description: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  responder: {
    name: string;
    role: string | null;
    phone: string | null;
    vehicle_registration: string | null;
    vehicle_type: string | null;
    station: string | null;
  } | null;
  vehicle_location: {
    latitude: number;
    longitude: number;
    recorded_at: string | null;
  } | null;
  eta_minutes: number | null;
  distance_km: number | null;
  eta_is_estimate: boolean;
  pricing: Pricing | null;
  can_cancel: boolean;
};

type RouteInfo = {
  distance_meters: number;
  duration_seconds: number;
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
// HELPERS
// ============================================================

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

const formatMoney = (value: number, currency: string) =>
  `${currency === "KES" ? "KSh" : currency} ${value.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

// ============================================================
// SCREEN
// ============================================================

export default function TrackScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const userMovedMapRef = useRef(false);

  const params = useLocalSearchParams<{ incidentId?: string | string[] }>();
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
  // DERIVED
  // ----------------------------------------------------------

  const status = tracking?.status ?? "created";
  const arrived = ARRIVED_STATUSES.includes(status);
  const terminal = TERMINAL_STATUSES.includes(status);
  const hasResponder = !!tracking?.responder;
  const approaching =
    hasResponder && !arrived && (tracking?.eta_minutes ?? 99) <= 2;

  const stage = arrived ? 3 : approaching ? 2 : hasResponder ? 1 : 0;

  const incLat = tracking?.latitude ?? null;
  const incLng = tracking?.longitude ?? null;
  const vehLat = tracking?.vehicle_location?.latitude ?? null;
  const vehLng = tracking?.vehicle_location?.longitude ?? null;
  const isFire = tracking?.emergency_type === "fire";
  const vehicleIcon = isFire ? "fire-truck" : "ambulance";

  // ----------------------------------------------------------
  // POLL TRACKING
  // ----------------------------------------------------------

  useEffect(() => {
    if (!incidentId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await apiFetch<Tracking>(
          `/api/v1/emergencies/${incidentId}/tracking`
        );
        if (cancelled) return;
        setTracking(data);
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(errorMessage(err, "Couldn't load your emergency."));
        }
      } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
      }
    };

    load();

    if (terminal) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setInterval(load, TRACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [incidentId, terminal, reloadKey]);

  // ----------------------------------------------------------
  // POLL ROUTE (vehicle -> you) while the responder is coming
  // ----------------------------------------------------------

  useEffect(() => {
    if (!incidentId || !hasResponder || arrived || terminal) {
      setRoute(null);
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await apiFetch<RouteInfo | null>(
          `/api/v1/emergencies/${incidentId}/route`
        );
        if (!cancelled) {
          setRoute(data && data.polyline?.length ? data : null);
        }
      } catch {
        // keep the previous line; the next poll retries
      } finally {
        inFlight = false;
      }
    };

    load();
    const timer = setInterval(load, ROUTE_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [incidentId, hasResponder, arrived, terminal]);

  // ----------------------------------------------------------
  // MAP: follow the vehicle as it approaches
  // ----------------------------------------------------------

  const fitMap = useCallback(() => {
    if (!mapReady || !mapRef.current || incLat == null || incLng == null) {
      return;
    }

    const incident = { latitude: incLat, longitude: incLng };

    if (vehLat != null && vehLng != null && !arrived) {
      mapRef.current.fitToCoordinates(
        [{ latitude: vehLat, longitude: vehLng }, incident],
        {
          edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
          animated: true,
        }
      );
      return;
    }

    mapRef.current.animateToRegion(
      { ...incident, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600
    );
  }, [mapReady, incLat, incLng, vehLat, vehLng, arrived]);

  useEffect(() => {
    if (!userMovedMapRef.current) fitMap();
  }, [fitMap]);

  // ----------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------

  const callResponder = async () => {
    const phone = tracking?.responder?.phone;
    if (!phone) return;
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert("Unable to call", "Your device could not open the phone app.");
    }
  };

  const messageResponder = async () => {
    const phone = tracking?.responder?.phone;
    if (!phone) return;
    try {
      await Linking.openURL(`sms:${phone}`);
    } catch {
      Alert.alert("Unable to message", "Your device could not open messaging.");
    }
  };

  const shareStatus = async () => {
    if (!tracking) return;
    try {
      const where =
        `https://www.google.com/maps/search/?api=1&query=` +
        `${tracking.latitude},${tracking.longitude}`;
      const eta =
        tracking.responder && tracking.eta_minutes != null && !arrived
          ? `Responder ETA: ${tracking.eta_minutes} min\n`
          : "";
      await Share.share({
        message:
          `I am being assisted through SafeSync.\n\n` +
          `Emergency: ${tracking.emergency_type_name}\n` +
          `Incident: ${tracking.public_id}\n` +
          eta +
          `Location: ${where}`,
      });
    } catch {
      // user cancelled sharing
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Emergency",
      "Are you sure you want to cancel this emergency request?",
      [
        { text: "Keep Request", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await apiFetch<unknown>(
                `/api/v1/emergencies/${incidentId}/cancel`,
                { method: "POST", body: JSON.stringify({}) }
              );
              router.replace("/home");
            } catch (err) {
              Alert.alert(
                "Couldn't cancel",
                errorMessage(err, "Please try again.")
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleBackToHome = () => router.replace("/home");

  const handleRetry = () => {
    setLoading(true);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  };

  // ----------------------------------------------------------
  // LOADING / ERROR
  // ----------------------------------------------------------

  if (!incidentId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={34} color={COLORS.primary} />
          <Text style={styles.centerTitle}>No emergency to track</Text>
          <Pressable style={styles.locationRetryButton} onPress={handleBackToHome}>
            <Text style={styles.locationRetryText}>Back to home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!tracking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          {loading ? (
            <>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.centerText}>Loading your emergency…</Text>
            </>
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={34} color={COLORS.primary} />
              <Text style={styles.centerTitle}>Couldn't load your emergency</Text>
              <Text style={styles.centerText}>{loadError}</Text>
              <Pressable style={styles.locationRetryButton} onPress={handleRetry}>
                <Ionicons name="refresh" size={17} color={COLORS.white} />
                <Text style={styles.locationRetryText}>Try again</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const responder = tracking.responder;
  const pricing = tracking.pricing;
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
  // RENDER
  // ----------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* STATUS */}
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
              {tracking.emergency_type_name}
            </Text>
            <Text style={styles.statusSubtitle} numberOfLines={1}>
              Incident {tracking.public_id} · {subtitle}
            </Text>
          </View>

          <View style={[styles.liveBadge, (arrived || terminal) && styles.arrivedBadge]}>
            <View style={[styles.liveDot, (arrived || terminal) && styles.arrivedDot]} />
            <Text style={styles.liveBadgeText}>
              {arrived ? "ARRIVED" : terminal ? "ENDED" : "LIVE"}
            </Text>
          </View>
        </View>

        {/* MAP */}
        <View style={styles.mapContainer}>
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
              latitude: tracking.latitude,
              longitude: tracking.longitude,
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

            {/* YOUR LOCATION (where the responder is heading) */}
            <Marker
              coordinate={{ latitude: tracking.latitude, longitude: tracking.longitude }}
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

            {/* RESPONDING VEHICLE (live) */}
            {vehLat != null && vehLng != null && !arrived && responder && (
              <Marker
                coordinate={{ latitude: vehLat, longitude: vehLng }}
                title={responder.name}
                description={responder.vehicle_registration ?? undefined}
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

          <View style={styles.mapStatus}>
            <Ionicons name="navigate" size={14} color={COLORS.primary} />
            <Text style={styles.mapStatusText}>{mapStatusText}</Text>
          </View>

          <Pressable
            style={styles.myLocationButton}
            onPress={() => {
              userMovedMapRef.current = false;
              fitMap();
            }}
          >
            <Ionicons name="locate" size={20} color={COLORS.text} />
          </Pressable>
        </View>

        {/* PRICE */}
        <View style={styles.priceCard}>
          <View style={styles.priceHeader}>
            <View style={styles.actionIcon}>
              <Ionicons name="cash-outline" size={19} color={COLORS.primary} />
            </View>
            <Text style={styles.priceTitle}>Response fare</Text>
          </View>

          {pricing ? (
            <>
              <Text style={styles.priceTotal}>
                {formatMoney(pricing.total, pricing.currency)}
              </Text>
              <Text style={styles.priceNote}>
                {pricing.distance_km.toFixed(2)} km route · includes{" "}
                {Math.round(pricing.vat_rate * 100)}% VAT
              </Text>

              <View style={styles.priceDivider} />

              {pricing.breakdown.map((tier, index) => (
                <View key={index} style={styles.priceRow}>
                  <Text style={styles.priceRowLabel}>
                    {tier.km.toFixed(2)} km × {formatMoney(tier.rate_per_km, pricing.currency)}
                  </Text>
                  <Text style={styles.priceRowValue}>
                    {formatMoney(tier.amount, pricing.currency)}
                  </Text>
                </View>
              ))}

              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>Subtotal</Text>
                <Text style={styles.priceRowValue}>
                  {formatMoney(pricing.subtotal, pricing.currency)}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>VAT</Text>
                <Text style={styles.priceRowValue}>
                  {formatMoney(pricing.vat_amount, pricing.currency)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.priceLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.priceNote}>Calculating your fare…</Text>
            </View>
          )}
        </View>

        {/* DETAILS */}
        <View style={styles.detailsCard}>
          {escalated && (
            <View style={styles.noticeCard}>
              <Ionicons name="alert-circle" size={22} color={COLORS.primary} />
              <Text style={styles.noticeText}>
                No responder could be reached for this emergency. If it is life
                threatening, call your local emergency number now.
              </Text>
            </View>
          )}

          {!responder && !terminal && (
            <View style={styles.searchingCard}>
              <ActivityIndicator size="small" color={COLORS.primary} />
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
                      : tracking.eta_minutes != null
                      ? `${tracking.eta_is_estimate ? "~" : ""}${tracking.eta_minutes} min`
                      : "—"
                  }
                  emphasis
                />
                <Metric
                  label="Distance"
                  value={
                    tracking.distance_km != null
                      ? `${tracking.distance_km.toFixed(1)} km`
                      : "—"
                  }
                />
                <Metric label="Unit" value={responder.vehicle_registration ?? "—"} />
              </View>

              <View style={styles.responderCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(responder.name)}</Text>
                </View>

                <View style={styles.responderInfo}>
                  <Text style={styles.responderName} numberOfLines={1}>
                    {responder.name}
                    {responder.role ? ` · ${responder.role}` : ""}
                  </Text>

                  {!!responder.station && (
                    <Text style={styles.responderStation} numberOfLines={2}>
                      {responder.station}
                    </Text>
                  )}

                  <View style={styles.verifiedRow}>
                    <View style={styles.verifiedDot} />
                    <Text style={styles.verifiedText}>Verified responder</Text>
                  </View>
                </View>

                {!!responder.phone && (
                  <View style={styles.contactButtons}>
                    <Pressable style={styles.callButton} onPress={callResponder}>
                      <Ionicons name="call" size={18} color={COLORS.white} />
                    </Pressable>
                    <Pressable style={styles.messageButton} onPress={messageResponder}>
                      <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}

          {/* INFO */}
          <View style={styles.emergencyInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Emergency</Text>
              <Text style={styles.infoValue}>{tracking.emergency_type_name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Incident ID</Text>
              <Text style={styles.infoValue}>{tracking.public_id}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={[styles.infoValue, styles.locationValue]} numberOfLines={1}>
                {tracking.address ??
                  `${tracking.latitude.toFixed(5)}, ${tracking.longitude.toFixed(5)}`}
              </Text>
            </View>

            {!!tracking.description && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Details</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {tracking.description}
                </Text>
              </View>
            )}
          </View>

          {/* TIMELINE */}
          {!escalated && !cancelled && (
            <View style={styles.timeline}>
              <Text style={styles.timelineHeading}>Response Progress</Text>

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
                          <Ionicons name="checkmark" size={14} color={COLORS.white} />
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
                            <Text style={styles.currentBadgeText}>CURRENT</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.timelineDetail}>{item.detail}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* SHARE */}
          <Pressable style={styles.actionButton} onPress={shareStatus}>
            <View style={styles.actionIcon}>
              <Ionicons name="share-social-outline" size={19} color={COLORS.primary} />
            </View>

            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Share Emergency Status</Text>
              <Text style={styles.actionSubtitle}>
                Send the incident details and your location to someone
              </Text>
            </View>
          </Pressable>
        </View>

        {/* FOOTER ACTION */}
        {terminal || arrived ? (
          <Pressable style={styles.dashboardButton} onPress={handleBackToHome}>
            <Text style={styles.dashboardButtonText}>RETURN TO HOME</Text>
          </Pressable>
        ) : tracking.can_cancel ? (
          <Pressable
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={COLORS.muted} />
            ) : (
              <>
                <Ionicons name="close" size={18} color={COLORS.muted} />
                <Text style={styles.cancelText}>Cancel Request</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

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
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, emphasis && styles.metricValueEmphasis]}>
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

  // ========================================================
  // LOADING / ERROR STATES
  // ========================================================

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
    height: 40,
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

  // ========================================================
  // STATUS CARD
  // ========================================================

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

  // ========================================================
  // MAP
  // ========================================================

  mapContainer: {
    height: 330,
    marginTop: 15,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  map: {
    width: "100%",
    height: "100%",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },

  mapStatusText: {
    marginLeft: 5,
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.text,
  },

  // ========================================================
  // CLIENT (YOUR) LOCATION MARKER
  // ========================================================

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

  // ========================================================
  // RESPONDER MARKER
  // ========================================================

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

  // ========================================================
  // PRICE CARD
  // ========================================================

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
    color: COLORS.muted,
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
    minHeight: 24,
  },

  priceRowLabel: {
    fontSize: 11,
    color: COLORS.muted,
  },

  priceRowValue: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  // ========================================================
  // DETAILS CARD
  // ========================================================

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

  // ========================================================
  // METRICS
  // ========================================================

  metricsRow: {
    flexDirection: "row",
    marginHorizontal: -4,
  },

  metric: {
    flex: 1,
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
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "800",
  },

  metricValueEmphasis: {
    color: COLORS.primary,
    fontSize: 18,
  },

  // ========================================================
  // RESPONDER CARD
  // ========================================================

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
    marginLeft: 11,
    marginRight: 6,
  },

  responderName: {
    fontSize: 13,
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

  // ========================================================
  // EMERGENCY INFORMATION
  // ========================================================

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
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 28,
  },

  infoLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: "600",
  },

  infoValue: {
    flex: 1,
    marginLeft: 15,
    textAlign: "right",
    fontSize: 11,
    color: COLORS.text,
    fontWeight: "800",
  },

  locationValue: {
    color: COLORS.primary,
  },

  // ========================================================
  // TIMELINE
  // ========================================================

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

  // ========================================================
  // ACTION BUTTONS
  // ========================================================

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

  // ========================================================
  // CANCEL
  // ========================================================

  cancelButton: {
    minHeight: 54,
    marginTop: 8,
    marginBottom: 60,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
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