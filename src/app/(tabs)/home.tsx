import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

import { apiFetchLogged as apiFetch } from "@/lib/logged-api";
import { useAuth } from "../../contexts/auth-context";

/* ============================================================
   CONFIG
   ============================================================ */

const API = {
  nearbyUnits: "/api/v1/locations/nearby-units",
};

const SEARCH_RADIUS_METERS = 10_000;
// Re-query units when the client has moved this far since the last query.
const REFETCH_DISTANCE_METERS = 100;
// Re-run reverse geocoding when the client has moved this far.
const GEOCODE_DISTANCE_METERS = 150;
// Responders move, so refresh the list even when the client is still.
const UNITS_POLL_MS = 15_000;

/* ============================================================
   TYPES
   ============================================================ */

type Coordinates = {
  latitude: number;
  longitude: number;
};

type NearbyUnit = {
  vehicle_id: string;
  registration_number: string;
  vehicle_type_code: string; // "AMBULANCE" | "FIRE_ENGINE"
  vehicle_type_name: string;
  station: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  eta_minutes: number | null;
  price_total: number | null;
  currency: string;
};

type NearbyUnitsResponse = {
  units: NearbyUnit[];
};

/* ============================================================
   HELPERS
   ============================================================ */

function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

function distanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatPlace(address: Location.LocationGeocodedAddress): string {
  const parts = [
    address.name ?? address.street,
    address.district ?? address.subregion,
    address.city ?? address.region,
  ].filter((p): p is string => !!p && p.trim().length > 0);

  return Array.from(new Set(parts)).join(", ");
}

const formatPrice = (value: number | null, currency: string) => {
  if (value == null) return "—";
  const amount = Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency === "KES" ? "KSh" : currency} ${amount}`;
};

const formatEta = (minutes: number | null) =>
  minutes == null ? "—" : `${minutes} min`;

const isAmbulance = (unit: NearbyUnit) =>
  unit.vehicle_type_code === "AMBULANCE";

/* ============================================================
   SCREEN
   ============================================================ */

export default function Home() {
  const mapRef = useRef<MapView | null>(null);
  const { profile } = useAuth();

  const firstName = profile?.first_name?.trim() || "there";

  /* ---------------- location state ---------------- */

  const [currentLocation, setCurrentLocation] =
    useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationRetry, setLocationRetry] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  /* ---------------- backend data ---------------- */

  const [units, setUnits] = useState<NearbyUnit[]>([]);
  const [unitsLoaded, setUnitsLoaded] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const currentRef = useRef<Coordinates | null>(null);
  const lastFetchRef = useRef<Coordinates | null>(null);
  const lastGeocodeRef = useRef<Coordinates | null>(null);
  const hasCenteredRef = useRef(false);

  /* ============================================================
     BACKEND: nearby units (ETA + price computed server-side)
     ============================================================ */

  const loadUnits = useCallback(async (coords: Coordinates) => {
    try {
      const query =
        `latitude=${coords.latitude}&longitude=${coords.longitude}` +
        `&radius_meters=${SEARCH_RADIUS_METERS}`;

      const data = await apiFetch<NearbyUnitsResponse>(
        `${API.nearbyUnits}?${query}`
      );

      setUnits(Array.isArray(data?.units) ? data.units : []);
      setUnitsError(null);
    } catch (err) {
      setUnitsError(errorMessage(err, "Couldn't load nearby responders."));
    } finally {
      setUnitsLoaded(true);
    }
  }, []);

  /* ============================================================
     FRONTEND ONLY: reverse geocoding
     ============================================================ */

  const resolvePlaceName = useCallback(async (coords: Coordinates) => {
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      const first = results[0];

      if (first) {
        const name = formatPlace(first);
        if (name) {
          setPlaceName(name);
          lastGeocodeRef.current = coords;
        }
      }
    } catch {
      // Keep the previous name; it is retried on the next position change.
    }
  }, []);

  /* ============================================================
     A NEW POSITION ARRIVED (first fix, watcher, or manual refresh)
     ============================================================ */

  const applyPosition = useCallback(
    (position: Location.LocationObject) => {
      const coords: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      currentRef.current = coords;
      setCurrentLocation(coords);
      setAccuracy(position.coords.accuracy ?? null);
      setLocationError(null);

      const lastFetch = lastFetchRef.current;
      if (
        !lastFetch ||
        distanceMeters(lastFetch, coords) >= REFETCH_DISTANCE_METERS
      ) {
        lastFetchRef.current = coords;
        loadUnits(coords);
      }

      const lastGeocode = lastGeocodeRef.current;
      if (
        !lastGeocode ||
        distanceMeters(lastGeocode, coords) >= GEOCODE_DISTANCE_METERS
      ) {
        resolvePlaceName(coords);
      }
    },
    [loadUnits, resolvePlaceName]
  );

  /* ============================================================
     LIVE LOCATION: first fix as soon as the screen opens, then
     keep watching so the location changes as the client moves.
     ============================================================ */

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | undefined;

    (async () => {
      try {
        setLocationLoading(true);
        setLocationError(null);

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          throw new Error(
            "Location services are disabled. Please enable GPS/location services on your device."
          );
        }

        const permission =
          await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          throw new Error(
            "Location permission was denied. SafeSync needs your location to find responders near you."
          );
        }

        const first = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (cancelled) return;
        applyPosition(first);

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15_000,
            distanceInterval: 50,
          },
          applyPosition
        );

        if (cancelled) {
          sub.remove();
        } else {
          subscription = sub;
        }
      } catch (err) {
        if (!cancelled) {
          setLocationError(
            errorMessage(err, "Unable to determine your current location.")
          );
        }
      } finally {
        if (!cancelled) setLocationLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [applyPosition, locationRetry]);

  // Keep the unit list fresh while the client is standing still.
  useEffect(() => {
    const timer = setInterval(() => {
      const here = currentRef.current;
      if (here) loadUnits(here);
    }, UNITS_POLL_MS);

    return () => clearInterval(timer);
  }, [loadUnits]);

  // Centre the map on the first fix.
  useEffect(() => {
    if (!mapReady || !currentLocation || hasCenteredRef.current) return;
    hasCenteredRef.current = true;

    mapRef.current?.animateToRegion(
      { ...currentLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 },
      700
    );
  }, [mapReady, currentLocation]);

  /* ============================================================
     MANUAL REFRESH (locate button)
     ============================================================ */

  const refreshLocation = useCallback(async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Force a fresh units query and place-name lookup.
      lastFetchRef.current = null;
      lastGeocodeRef.current = null;
      applyPosition(position);

      mapRef.current?.animateToRegion(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        700
      );
    } catch (err) {
      Alert.alert(
        "Location unavailable",
        errorMessage(err, "Unable to determine your current location.")
      );
    } finally {
      setRefreshing(false);
    }
  }, [applyPosition, refreshing]);

  /* ============================================================
     DERIVED
     ============================================================ */

  const nearestUnit = units[0] ?? null;

  const locationLine = currentLocation
    ? [
        placeName,
        accuracy != null ? `GPS accuracy ${Math.round(accuracy)} m` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Location found"
    : locationLoading
    ? "Locating you…"
    : "Location unavailable";

  const footerSubtitle = locationError
    ? locationError
    : unitsError
    ? unitsError
    : !unitsLoaded
    ? "Looking for responders…"
    : units.length === 0
    ? "No responders are on shift near you right now"
    : "Live responder availability";

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingLine} numberOfLines={1}>
            {getGreeting()}, {firstName}
          </Text>

          <Text style={styles.userLocation}>{locationLine}</Text>
        </View>

        {/* MAP */}
        <View style={styles.mapCard}>
          <View style={styles.mapWrapper}>
            {currentLocation ? (
              <>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  onMapReady={() => setMapReady(true)}
                  initialRegion={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                  }}
                  showsMyLocationButton={false}
                  mapType="standard"
                >
                  <Marker
                    coordinate={currentLocation}
                    title="Your location"
                    description={placeName ?? undefined}
                  >
                    <View style={styles.userMarker}>
                      <View style={styles.userMarkerInner} />
                    </View>
                  </Marker>

                  {units.map((unit) => (
                    <Marker
                      key={unit.vehicle_id}
                      coordinate={{
                        latitude: unit.latitude,
                        longitude: unit.longitude,
                      }}
                      title={`${unit.vehicle_type_name} · ${unit.registration_number}`}
                      description={`${formatEta(unit.eta_minutes)} · ${unit.distance_km.toFixed(1)} km`}
                    >
                      <View style={styles.responderMarker}>
                        {isAmbulance(unit) ? (
                          <FontAwesome5
                            name="ambulance"
                            size={16}
                            color="#FFFFFF"
                          />
                        ) : (
                          <Ionicons name="flame" size={18} color="#FFFFFF" />
                        )}
                      </View>
                    </Marker>
                  ))}
                </MapView>

                <Pressable
                  style={styles.locateButton}
                  onPress={refreshLocation}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <Ionicons name="locate" size={22} color="#0F172A" />
                  )}
                </Pressable>
              </>
            ) : locationLoading ? (
              <View style={styles.mapState}>
                <ActivityIndicator size="large" color="#DC2626" />
                <Text style={styles.mapStateText}>
                  Getting your location…
                </Text>
              </View>
            ) : (
              <View style={styles.mapState}>
                <Ionicons name="location-outline" size={32} color="#DC2626" />
                <Text style={styles.mapStateTitle}>Location unavailable</Text>
                <Text style={styles.mapStateText}>
                  {locationError ?? "Unable to determine your current location."}
                </Text>

                <Pressable
                  style={styles.retryButton}
                  onPress={() => setLocationRetry((n) => n + 1)}
                >
                  <Ionicons name="refresh" size={17} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>Try again</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Map information */}
          <View style={styles.mapFooter}>
            <View style={styles.mapFooterInfo}>
              <Text style={styles.mapFooterTitle}>
                {units.length === 1
                  ? `1 unit available within ${SEARCH_RADIUS_METERS / 1000} km`
                  : `${units.length} units available within ${SEARCH_RADIUS_METERS / 1000} km`}
              </Text>

              <Text style={styles.mapFooterSubtitle}>{footerSubtitle}</Text>
            </View>
          </View>
        </View>

        {/* ETA + PRICE — from the nearest unit, computed by the backend */}
        <View style={styles.etaPriceCard}>
          <View style={styles.etaPriceItem}>
            <Ionicons name="time-outline" size={20} color="#DC2626" />
            <View style={styles.etaPriceTextBox}>
              <Text style={styles.etaPriceLabel}>Estimated arrival</Text>
              <Text style={styles.etaPriceValue}>
                {formatEta(nearestUnit?.eta_minutes ?? null)}
              </Text>
            </View>
          </View>

          <View style={styles.etaPriceDivider} />

          <View style={styles.etaPriceItem}>
            <Ionicons name="cash-outline" size={20} color="#DC2626" />
            <View style={styles.etaPriceTextBox}>
              <Text style={styles.etaPriceLabel}>Estimated cost</Text>
              <Text style={styles.etaPriceValue}>
                {formatPrice(
                  nearestUnit?.price_total ?? null,
                  nearestUnit?.currency ?? "KES"
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* Nearby Responders */}
        <View style={styles.respondersSection}>
          <Text style={styles.sectionTitle}>Nearby Emergency Responders</Text>

          {!unitsLoaded && currentLocation ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color="#DC2626" />
            </View>
          ) : units.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="moon-outline" size={28} color="#64748B" />
              <Text style={styles.emptyText}>
                {unitsError ??
                  "No responders are on shift near your location right now."}
              </Text>
            </View>
          ) : (
            units.map((unit) => (
              <View key={unit.vehicle_id} style={styles.responderCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.iconBadge}>
                      {isAmbulance(unit) ? (
                        <FontAwesome5
                          name="ambulance"
                          size={22}
                          color="#DC2626"
                        />
                      ) : (
                        <Ionicons name="flame" size={24} color="#DC2626" />
                      )}
                    </View>

                    <View style={styles.cardTitleBox}>
                      <Text style={styles.responderTitle} numberOfLines={1}>
                        {unit.vehicle_type_name}
                      </Text>

                      <Text style={styles.responderLocation} numberOfLines={1}>
                        {unit.station}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.availableBadge}>
                    <Text style={styles.availableBadgeText}>Available</Text>
                  </View>
                </View>

                <View style={styles.metricsGrid}>
                  <Stat label="ETA" value={formatEta(unit.eta_minutes)} emphasis />
                  <Stat label="DISTANCE" value={`${unit.distance_km.toFixed(1)} km`} />
                  <Stat
                    label="ESTIMATED COST"
                    value={formatPrice(unit.price_total, unit.currency)}
                  />
                  <Stat label="VEHICLE" value={unit.registration_number} />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Bottom spacing for global emergency button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

/* ========================================= */
/* STAT COMPONENT                            */
/* ========================================= */

function Stat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>

      <Text
        style={[styles.metricValue, emphasis && styles.metricValueEmphasis]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/* ========================================= */
/* STYLES                                    */
/* ========================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 50,
  },

  /* GREETING */

  greetingSection: {
    marginBottom: 18,
  },

  greetingLine: {
    fontSize: 24,
    fontWeight: "800",
    color: "#DC2626",
  },

  userLocation: {
    marginTop: 5,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
  },

  /* MAP */

  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  mapWrapper: {
    height: 230,
    width: "100%",
  },

  map: {
    width: "100%",
    height: "100%",
  },

  mapState: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  mapStateTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  mapStateText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
    textAlign: "center",
  },

  retryButton: {
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

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  locateButton: {
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

  /* USER MARKER */

  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  userMarkerInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },

  /* RESPONDER MARKER */

  responderMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DC2626",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  /* MAP FOOTER */

  mapFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  mapFooterInfo: {
    flex: 1,
  },

  mapFooterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },

  mapFooterSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },

  /* ETA + PRICE (below the map) */

  etaPriceCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  etaPriceItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  etaPriceTextBox: {
    marginLeft: 10,
  },

  etaPriceLabel: {
    fontSize: 11,
    color: "#64748B",
  },

  etaPriceValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  etaPriceDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },

  /* RESPONDERS */

  respondersSection: {
    marginTop: 28,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 24,
    alignItems: "center",
  },

  emptyText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    textAlign: "center",
  },

  responderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 17,
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  cardHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  cardTitleBox: {
    flex: 1,
  },

  responderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  responderLocation: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },

  availableBadge: {
    backgroundColor: "#059669",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },

  availableBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  /* METRICS */

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    marginHorizontal: -4,
  },

  metricBox: {
    width: "50%",
    padding: 4,
  },

  metricLabel: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingTop: 9,
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
  },

  metricValue: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingBottom: 9,
    paddingTop: 3,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  metricValueEmphasis: {
    color: "#DC2626",
  },

  /* SPACE FOR GLOBAL BUTTON */

  bottomSpacing: {
    height: 100,
  },
});