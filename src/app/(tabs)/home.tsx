import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import {
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";

/* ============================================================
   TYPES
   ============================================================ */

type Coordinates = {
  latitude: number;
  longitude: number;
};

/* ============================================================
   BACKEND HELPER
   ------------------------------------------------------------
   Every time we get a fresh GPS fix for this client we push
   {latitude, longitude} to the backend so dispatch can route
   the nearest responder. Wire this to the SafeSync realtime
   location channel (the same location-persistence path used
   by the responder app) once the client's WebSocket connection
   is available here — this REST call is a placeholder so the
   UI already has somewhere to send coordinates.
   ============================================================ */

async function reportLocationToBackend(
  coords: Coordinates,
  role: "client" | "responder" = "client"
) {
  try {
    await fetch("https://api.safesync.co.ke/v1/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        latitude: coords.latitude,
        longitude: coords.longitude,
        recorded_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Non-fatal: the map already reflects the location locally.
    // The location-persistence worker will pick up the next
    // successful report.
  }
}

export default function Home() {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);

  const nearbyUnits = [
    {
      id: "ambulance-001",
      name: "Nearest Ambulance",
      kind: "Ambulance",
      station: "Nairobi Hospital Station, Upper Hill",
      status: "Available",
      eta: "5 min",
      distance: "1.5 km",
      price: "KSh 1,800",
      crew: 3,
      vehicle: "KDA 241X",
      latitude: -1.2864,
      longitude: 36.8172,
    },
    {
      id: "fire-001",
      name: "Nearest Fire Engine",
      kind: "Fire Engine",
      station: "Fire Station 4 — Westlands",
      status: "Available",
      eta: "10 min",
      distance: "2.0 km",
      price: "KSh 3,200",
      crew: 6,
      vehicle: "KDB 912F",
      latitude: -1.2676,
      longitude: 36.8108,
    },
  ];

  // Fallback shown until a real GPS fix comes back.
  const fallbackLocation: Coordinates = {
    latitude: -1.2921,
    longitude: 36.8219,
  };

  const [currentLocation, setCurrentLocation] =
    useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(
    null
  );
  const [mapReady, setMapReady] = useState(false);

  /* ============================================================
     GET CURRENT LOCATION — runs automatically as soon as the
     client opens/logs into the app, exactly like the responder
     console does.
     ============================================================ */
  const getCurrentLocation = useCallback(
    async (showMoveAnimation = false) => {
      try {
        setLocationLoading(true);
        setLocationError(null);

        const servicesEnabled =
          await Location.hasServicesEnabledAsync();

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

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const coordinates: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setCurrentLocation(coordinates);

        // Send latitude/longitude to the backend for dispatch.
        reportLocationToBackend(coordinates, "client");

        if (showMoveAnimation && mapReady && mapRef.current) {
          mapRef.current.animateToRegion(
            {
              ...coordinates,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            },
            700
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to determine your current location.";
        setLocationError(message);
      } finally {
        setLocationLoading(false);
      }
    },
    [mapReady]
  );

  useEffect(() => {
    getCurrentLocation();
    // Runs once, on mount — i.e. as soon as the client is on this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapReady && currentLocation) {
      mapRef.current?.animateToRegion(
        {
          ...currentLocation,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        700
      );
    }
  }, [mapReady, currentLocation]);

  const mapCenter = currentLocation ?? fallbackLocation;
  const nearestUnit = nearbyUnits[0];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.userName}>Kevin</Text>

          <Text style={styles.userLocation}>
            {currentLocation
              ? "You are covered · GPS accuracy 6 m"
              : locationLoading
              ? "Locating you…"
              : "You are covered at Kilimani, Nairobi · GPS accuracy 6 m"}
          </Text>
        </View>

        {/* MAP */}
        <View style={styles.mapCard}>
          <View style={styles.mapWrapper}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              onMapReady={() => setMapReady(true)}
              initialRegion={{
                latitude: mapCenter.latitude,
                longitude: mapCenter.longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }}
              showsMyLocationButton
              mapType="standard"
            >
              {/* User's live location */}
              <Marker
                coordinate={mapCenter}
                title="Your location"
                description={
                  currentLocation
                    ? "Live GPS location"
                    : "Kilimani, Nairobi"
                }
              >
                <View style={styles.userMarker}>
                  <View style={styles.userMarkerInner} />
                </View>
              </Marker>

              {/* Responder markers */}
              {nearbyUnits.map((unit) => (
                <Marker
                  key={unit.id}
                  coordinate={{
                    latitude: unit.latitude,
                    longitude: unit.longitude,
                  }}
                  title={unit.name}
                  description={`${unit.eta} · ${unit.distance}`}
                >
                  <View style={styles.responderMarker}>
                    {unit.kind === "Ambulance" ? (
                      <FontAwesome5
                        name="ambulance"
                        size={16}
                        color="#FFFFFF"
                      />
                    ) : (
                      <Ionicons
                        name="flame"
                        size={18}
                        color="#FFFFFF"
                      />
                    )}
                  </View>
                </Marker>
              ))}
            </MapView>

            {locationLoading && !currentLocation && (
              <View style={styles.mapLoadingOverlay}>
                <ActivityIndicator size="small" color="#DC2626" />
                <Text style={styles.mapLoadingOverlayText}>
                  Getting your location…
                </Text>
              </View>
            )}
          </View>

          {/* Map information */}
          <View style={styles.mapFooter}>
            <View style={styles.mapFooterInfo}>
              <Text style={styles.mapFooterTitle}>
                {nearbyUnits.length} units available within 2 km
              </Text>

              <Text style={styles.mapFooterSubtitle}>
                {locationError
                  ? locationError
                  : "Coverage: excellent"}
              </Text>
            </View>

            <View style={styles.protectedBadge}>
              <Text style={styles.protectedText}>Protected</Text>
            </View>
          </View>
        </View>

        {/* ETA + PRICE — shown right below the map */}
        <View style={styles.etaPriceCard}>
          <View style={styles.etaPriceItem}>
            <Ionicons name="time-outline" size={20} color="#DC2626" />
            <View style={styles.etaPriceTextBox}>
              <Text style={styles.etaPriceLabel}>
                Estimated arrival
              </Text>
              <Text style={styles.etaPriceValue}>
                {nearestUnit.eta}
              </Text>
            </View>
          </View>

          <View style={styles.etaPriceDivider} />

          <View style={styles.etaPriceItem}>
            <Ionicons name="cash-outline" size={20} color="#DC2626" />
            <View style={styles.etaPriceTextBox}>
              <Text style={styles.etaPriceLabel}>Estimated cost</Text>
              <Text style={styles.etaPriceValue}>
                {nearestUnit.price}
              </Text>
            </View>
          </View>
        </View>

        {/* Nearby Responders */}
        <View style={styles.respondersSection}>
          <Text style={styles.sectionTitle}>
            Nearby Emergency Responders
          </Text>

          {nearbyUnits.map((unit) => (
            <View key={unit.id} style={styles.responderCard}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.iconBadge}>
                    {unit.kind === "Ambulance" ? (
                      <FontAwesome5
                        name="ambulance"
                        size={22}
                        color="#DC2626"
                      />
                    ) : (
                      <Ionicons
                        name="flame"
                        size={24}
                        color="#DC2626"
                      />
                    )}
                  </View>

                  <View style={styles.cardTitleBox}>
                    <Text
                      style={styles.responderTitle}
                      numberOfLines={1}
                    >
                      {unit.name}
                    </Text>

                    <Text
                      style={styles.responderLocation}
                      numberOfLines={1}
                    >
                      {unit.station}
                    </Text>
                  </View>
                </View>

                {/* Status */}
                <View style={styles.availableBadge}>
                  <Text style={styles.availableBadgeText}>
                    {unit.status}
                  </Text>
                </View>
              </View>

              {/* Statistics */}
              <View style={styles.metricsGrid}>
                <Stat label="ETA" value={unit.eta} emphasis />

                <Stat label="DISTANCE" value={unit.distance} />

                <Stat label="CREW SIZE" value={`${unit.crew}`} />

                <Stat label="VEHICLE" value={unit.vehicle} />
              </View>

              {/* Request */}
              <TouchableOpacity
                style={styles.requestButton}
                activeOpacity={0.8}
                onPress={() => router.push}
              >
                <Text style={styles.requestButtonText}>Request</Text>
              </TouchableOpacity>
            </View>
          ))}
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
        style={[
          styles.metricValue,
          emphasis && styles.metricValueEmphasis,
        ]}
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
    paddingBottom: 120,
  },

  /* GREETING */

  greetingSection: {
    marginBottom: 18,
  },

  userName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
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

  mapLoadingOverlay: {
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  mapLoadingOverlayText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
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

  protectedBadge: {
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },

  protectedText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
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

  /* REQUEST */

  requestButton: {
    marginTop: 14,
    backgroundColor: "#DC2626",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  requestButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* SPACE FOR GLOBAL BUTTON */

  bottomSpacing: {
    height: 100,
  },
});