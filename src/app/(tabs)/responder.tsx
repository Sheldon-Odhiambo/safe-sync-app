import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
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

/* ============================================================
   TYPES
   ============================================================ */

type Vehicle = {
  id: string;
  plate: string;
  kind: string;
  station: string;
  inUse?: boolean;
};

type Driver = {
  id: string;
  name: string;
};

type Fleet = {
  company: string;
  vehicles: Vehicle[];
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

/* ============================================================
   MOCK DATA
   Replace these with your backend data later
   ============================================================ */

const ambulanceChecklist = [
  "Engine and fluids checked",
  "Fuel level checked",
  "Tires inspected",
  "Lights and sirens working",
  "First aid kit available",
  "Oxygen cylinder checked",
  "Medical equipment checked",
  "Fire extinguisher available",
  "Communication radio working",
];

const fireChecklist = [
  "Engine and fluids checked",
  "Fuel level checked",
  "Tires inspected",
  "Lights working",
  "Fire hoses checked",
  "Water tank checked",
  "Fire extinguisher checked",
  "Radio communication working",
  "Protective equipment available",
];

const responseActions = [
  "Arrived",
  "Patient Located",
  "Treatment Started",
  "Transport Started",
  "Reached Destination",
  "Incident Completed",
];

const currentDriver: Driver = {
  id: "driver-001",
  name: "Sheldon Ouma",
};

const fleet: Fleet = {
  company: "SafeSync Technologies",
  vehicles: [
    {
      id: "AMB-001",
      plate: "KDA 245A",
      kind: "Ambulance",
      station: "Kilimani Station",
      inUse: false,
    },
    {
      id: "AMB-002",
      plate: "KDB 731B",
      kind: "Ambulance",
      station: "Westlands Station",
      inUse: false,
    },
    {
      id: "FIRE-001",
      plate: "KDC 902C",
      kind: "Fire Engine",
      station: "Industrial Area Station",
      inUse: false,
    },
  ],
};

/*
 * This is currently supplied as an address in the mock emergency.
 *
 * Later, replace this with:
 *
 * const emergencyLocation = {
 *   latitude: incident.latitude,
 *   longitude: incident.longitude,
 * };
 *
 * from your FastAPI emergency response.
 */
const EMERGENCY_ADDRESS =
  "Wood Avenue, Kilimani, Nairobi, Kenya";

/* ============================================================
   BACKEND HELPER
   ------------------------------------------------------------
   Every time we get a fresh GPS fix for this responder we push
   {latitude, longitude} to the backend so dispatch and the
   client-facing map stay in sync. Wire this to the realtime
   location channel served by the location-persistence worker
   once the responder app's WebSocket connection is available
   here — this REST call is a placeholder so the UI already has
   somewhere to send coordinates.
   ============================================================ */

async function reportLocationToBackend(
  coords: Coordinates,
  role: "client" | "responder" = "responder"
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

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function ResponderConsole() {
  const router = useRouter();

  const driver = currentDriver;

  const [online, setOnline] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [accepted, setAccepted] = useState(false);

  const [checklistType, setChecklistType] = useState<
    "ambulance" | "fire"
  >("ambulance");

  /* ============================================================
     LOCATION STATE
     ============================================================ */

  const [currentLocation, setCurrentLocation] =
    useState<Coordinates | null>(null);

  const [emergencyLocation, setEmergencyLocation] =
    useState<Coordinates | null>(null);

  const [locationLoading, setLocationLoading] =
    useState(true);

  const [locationError, setLocationError] =
    useState<string | null>(null);

  const [mapReady, setMapReady] = useState(false);

  /* ============================================================
     MAP REFERENCE
     ============================================================ */

  const mapRef = React.useRef<MapView | null>(null);

  /* ============================================================
     ACTIVE VEHICLE
     ============================================================ */

  const activeVehicle = useMemo(() => {
    return fleet.vehicles.find(
      (vehicle) => vehicle.id === selectedVehicle
    );
  }, [selectedVehicle]);

  const checklist =
    checklistType === "ambulance"
      ? ambulanceChecklist
      : fireChecklist;

  const ready =
    checked.length === checklist.length;

  /* ============================================================
     GET CURRENT LOCATION — runs automatically as soon as the
     responder opens/logs into the console.
     ============================================================ */

  const getCurrentLocation = useCallback(
    async (showAlert = false) => {
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
            "Location permission was denied. SafeSync needs your location to show your position on the responder map."
          );
        }

        const position =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

        const coordinates: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setCurrentLocation(coordinates);

        // Send latitude/longitude to the backend for dispatch.
        reportLocationToBackend(coordinates, "responder");

        /*
         * Move the map to the responder's current position.
         */
        if (mapReady && mapRef.current) {
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
        const message =
          error instanceof Error
            ? error.message
            : "Unable to determine your current location.";

        setLocationError(message);

        if (showAlert) {
          Alert.alert("Location unavailable", message);
        }
      } finally {
        setLocationLoading(false);
      }
    },
    [mapReady]
  );

  /* ============================================================
     GET EMERGENCY LOCATION
     ============================================================ */

  const getEmergencyLocation = useCallback(async () => {
    try {
      const results =
        await Location.geocodeAsync(
          EMERGENCY_ADDRESS
        );

      if (!results.length) {
        return;
      }

      const result = results[0];

      if (
        typeof result.latitude !== "number" ||
        typeof result.longitude !== "number"
      ) {
        return;
      }

      setEmergencyLocation({
        latitude: result.latitude,
        longitude: result.longitude,
      });
    } catch {
      /*
       * Do not block the responder map if address
       * geocoding fails.
       *
       * Once the backend provides coordinates directly,
       * this fallback will no longer be necessary.
       */
    }
  }, []);

  /* ============================================================
     INITIAL LOCATION — fired as soon as this screen mounts,
     i.e. as soon as the responder logs in.
     ============================================================ */

  useEffect(() => {
    getCurrentLocation();
    getEmergencyLocation();
  }, [getCurrentLocation, getEmergencyLocation]);

  /* ============================================================
     FIT MAP TO RESPONDER + EMERGENCY
     ============================================================ */

  useEffect(() => {
    if (
      !mapReady ||
      !mapRef.current ||
      !currentLocation
    ) {
      return;
    }

    if (emergencyLocation) {
      mapRef.current.fitToCoordinates(
        [currentLocation, emergencyLocation],
        {
          edgePadding: {
            top: 60,
            right: 60,
            bottom: 60,
            left: 60,
          },
          animated: true,
        }
      );

      return;
    }

    mapRef.current.animateToRegion(
      {
        ...currentLocation,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      700
    );
  }, [
    mapReady,
    currentLocation,
    emergencyLocation,
  ]);

  /* ============================================================
     CHECKLIST
     ============================================================ */

  const toggleChecklist = (item: string) => {
    setChecked((current) => {
      if (current.includes(item)) {
        return current.filter(
          (value) => value !== item
        );
      }

      return [...current, item];
    });
  };

  /* ============================================================
     ONLINE / OFFLINE
     ============================================================ */

  const handleAvailability = (value: boolean) => {
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

      setOnline(true);

      Alert.alert(
        "You are online",
        "Dispatch can now see your availability."
      );

      return;
    }

    setOnline(false);
    setSelectedVehicle("");
    setChecked([]);

    Alert.alert(
      "Shift ended",
      "The vehicle has been released back to the fleet."
    );
  };

  /* ============================================================
     SIGN OUT
     ============================================================ */

  const handleSignOut = () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            router.replace("/");
          },
        },
      ]
    );
  };

  /* ============================================================
     ACCEPT EMERGENCY
     ============================================================ */

  const handleAccept = () => {
    setAccepted(true);

    Alert.alert(
      "Dispatch accepted",
      "You are now assigned to this emergency."
    );
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline dispatch",
      "Are you sure you want to decline this emergency?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Decline",
          style: "destructive",
        },
      ]
    );
  };

  /* ============================================================
     NOT AUTHENTICATED
     ============================================================ */

  if (!driver) {
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
              Driver sign-in required
            </Text>

            <Text style={styles.authDescription}>
              Use the credentials issued by your company
              super admin to open the responder console.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.primaryButtonText}>
                Go to sign in
              </Text>
            </Pressable>
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
          {/* =====================================================
              HEADER
          ===================================================== */}

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBadge}>
                <MaterialCommunityIcons
                  name="ambulance"
                  size={21}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.headerInfo}>
                <Text
                  style={styles.headerTitle}
                  numberOfLines={1}
                >
                  {activeVehicle
                    ? `Unit ${activeVehicle.plate}`
                    : driver.name}
                </Text>

                <Text
                  style={styles.headerSubtitle}
                  numberOfLines={1}
                >
                  {driver.name} •{" "}
                  {activeVehicle
                    ? activeVehicle.station
                    : fleet.company}
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.logoutButton}
              onPress={handleSignOut}
            >
              <Ionicons
                name="log-out-outline"
                size={21}
                color="#0F172A"
              />
            </Pressable>
          </View>

          {/* =====================================================
              LIVE MAP — moved to the top of the page. Shows the
              responder's current position as soon as the app has
              a GPS fix, plus the emergency location once one is
              assigned.
          ===================================================== */}

          <View style={styles.topMapCard}>
            <View style={styles.topMapWrapper}>
              {locationLoading && !currentLocation ? (
                <View style={styles.mapLoading}>
                  <ActivityIndicator
                    size="large"
                    color="#DC2626"
                  />

                  <Text style={styles.mapLoadingText}>
                    Getting your location...
                  </Text>
                </View>
              ) : locationError && !currentLocation ? (
                <View style={styles.mapError}>
                  <Ionicons
                    name="location-outline"
                    size={32}
                    color="#DC2626"
                  />

                  <Text style={styles.mapErrorTitle}>
                    Location unavailable
                  </Text>

                  <Text style={styles.mapErrorText}>
                    {locationError}
                  </Text>

                  <Pressable
                    style={styles.locationRetryButton}
                    onPress={() => getCurrentLocation(true)}
                  >
                    <Ionicons
                      name="refresh"
                      size={17}
                      color="#FFFFFF"
                    />

                    <Text style={styles.locationRetryText}>
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.googleMap}
                  onMapReady={() => setMapReady(true)}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                  showsCompass={true}
                  showsBuildings={true}
                  showsPointsOfInterest={true}
                  loadingEnabled={true}
                  mapType="standard"
                  initialRegion={{
                    latitude: currentLocation?.latitude ?? -1.2921,
                    longitude: currentLocation?.longitude ?? 36.8219,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  {/* RESPONDER LOCATION */}
                  {currentLocation && (
                    <Marker
                      coordinate={currentLocation}
                      title="Your location"
                      description={
                        activeVehicle
                          ? `Unit ${activeVehicle.plate}`
                          : driver.name
                      }
                      anchor={{ x: 0.5, y: 0.5 }}
                    >
                      <View style={styles.responderMarker}>
                        <MaterialCommunityIcons
                          name="ambulance"
                          size={23}
                          color="#FFFFFF"
                        />
                      </View>
                    </Marker>
                  )}

                  {/* EMERGENCY LOCATION */}
                  {emergencyLocation && (
                    <Marker
                      coordinate={emergencyLocation}
                      title="Emergency location"
                      description={EMERGENCY_ADDRESS}
                    >
                      <View style={styles.emergencyMarker}>
                        <Ionicons
                          name="location"
                          size={34}
                          color="#DC2626"
                        />
                      </View>
                    </Marker>
                  )}
                </MapView>
              )}

              {/* CURRENT LOCATION BUTTON */}
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

              {/* MAP LABEL */}
              {emergencyLocation && (
                <View style={styles.mapOverlayLabel}>
                  <View style={styles.mapOverlayDot} />

                  <Text style={styles.mapOverlayText}>
                    Emergency location
                  </Text>
                </View>
              )}
            </View>

            {accepted && (
              <View style={styles.mapStats}>
                <MapStat value="5 min" label="ETA" />
                <MapStat value="1.5 km" label="Distance" />
                <MapStat value="Light" label="Traffic" />
              </View>
            )}
          </View>

          {/* =====================================================
              VEHICLE + AVAILABILITY
          ===================================================== */}

          <View style={styles.controlCard}>
            <Text style={styles.sectionLabel}>
              RESPONSE VEHICLE
            </Text>

            <View style={styles.vehicleList}>
              {fleet.vehicles.map((vehicle) => {
                const selected =
                  selectedVehicle === vehicle.id;

                return (
                  <Pressable
                    key={vehicle.id}
                    disabled={online}
                    onPress={() =>
                      setSelectedVehicle(vehicle.id)
                    }
                    style={[
                      styles.vehicleOption,
                      selected &&
                        styles.vehicleOptionSelected,
                      online &&
                        styles.vehicleOptionDisabled,
                    ]}
                  >
                    <View
                      style={[
                        styles.vehicleIcon,
                        selected &&
                          styles.vehicleIconSelected,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={
                          vehicle.kind === "Fire Engine"
                            ? "fire-truck"
                            : "ambulance"
                        }
                        size={22}
                        color={
                          selected
                            ? "#FFFFFF"
                            : "#DC2626"
                        }
                      />
                    </View>

                    <View style={styles.vehicleDetails}>
                      <Text
                        style={[
                          styles.vehiclePlate,
                          selected &&
                            styles.vehicleTextSelected,
                        ]}
                      >
                        {vehicle.plate}
                      </Text>

                      <Text
                        style={[
                          styles.vehicleKind,
                          selected &&
                            styles.vehicleTextSelected,
                        ]}
                      >
                        {vehicle.kind} •{" "}
                        {vehicle.station}
                      </Text>
                    </View>

                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#FFFFFF"
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.availabilityRow}>
              <View style={styles.availabilityInfo}>
                <View
                  style={[
                    styles.statusDot,
                    online
                      ? styles.statusOnline
                      : styles.statusOffline,
                  ]}
                />

                <View>
                  <Text style={styles.availabilityTitle}>
                    {online ? "Online" : "Offline"}
                  </Text>

                  <Text style={styles.availabilitySubtitle}>
                    {online
                      ? "Dispatch can see you"
                      : "You are currently unavailable"}
                  </Text>
                </View>
              </View>

              <Switch
                value={online}
                onValueChange={handleAvailability}
                trackColor={{
                  false: "#CBD5E1",
                  true: "#86EFAC",
                }}
                thumbColor={
                  online ? "#16A34A" : "#64748B"
                }
              />
            </View>
          </View>

          {/* =====================================================
              STATISTICS
          ===================================================== */}

          <View style={styles.statsGrid}>
            <Stat
              icon="location-outline"
              label="Current location"
              value={
                currentLocation
                  ? `${currentLocation.latitude.toFixed(
                      5
                    )}, ${currentLocation.longitude.toFixed(
                      5
                    )}`
                  : locationLoading
                  ? "Locating..."
                  : "Location unavailable"
              }
            />

            <Stat
              icon="timer-outline"
              label="Avg response (30d)"
              value="5m 41s"
            />

            <Stat
              icon="checkmark-circle-outline"
              label="Completed (30d)"
              value="112 incidents"
            />
          </View>

          {/* =====================================================
              INCOMING REQUEST
          ===================================================== */}

          <View style={styles.card}>
            <View style={styles.emergencyHeader}>
              <View style={styles.emergencyIcon}>
                <MaterialCommunityIcons
                  name="ambulance"
                  size={23}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.emergencyHeaderText}>
                <Text
                  style={styles.emergencyTitle}
                  numberOfLines={2}
                >
                  INCOMING • Medical Emergency • Severity High
                </Text>

                <Text style={styles.emergencySubtitle}>
                  Caller: Kevin Mensah • 1.5 km • 5 min
                </Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              {/* Emergency details */}

              <View style={styles.detailsGrid}>
                <Cell
                  label="Emergency type"
                  value="Medical"
                />

                <Cell
                  label="Severity"
                  value="High"
                />

                <Cell
                  label="Distance"
                  value="1.5 km"
                />

                <Cell
                  label="Travel time"
                  value="5 min"
                />
              </View>

              {/* Patient notes */}

              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>
                  PATIENT NOTES
                </Text>

                <Text style={styles.notesText}>
                  34y male, chest pain, conscious. Allergy:
                  penicillin. Building entrance on Wood Avenue,
                  Kilimani, apartment 8B.
                </Text>
              </View>

              {!accepted ? (
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.acceptButton}
                    onPress={handleAccept}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text style={styles.acceptButtonText}>
                      Accept
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.declineButton}
                    onPress={handleDecline}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={20}
                      color="#DC2626"
                    />

                    <Text style={styles.declineButtonText}>
                      Decline
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Pressable
                    style={styles.navigateButton}
                    onPress={() =>
                      Alert.alert(
                        "Navigation",
                        "Navigation to the emergency scene will start here."
                      )
                    }
                  >
                    <Ionicons
                      name="navigate"
                      size={21}
                      color="#FFFFFF"
                    />

                    <Text style={styles.navigateText}>
                      Navigate to scene
                    </Text>
                  </Pressable>

                  {/* Response progress */}

                  <View style={styles.responseProgress}>
                    <Text style={styles.responseTitle}>
                      Response status
                    </Text>

                    {responseActions.map(
                      (action, index) => (
                        <View
                          key={action}
                          style={styles.responseItem}
                        >
                          <View
                            style={[
                              styles.responseCircle,
                              index === 0 &&
                                styles.responseCircleActive,
                            ]}
                          >
                            {index === 0 ? (
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color="#FFFFFF"
                              />
                            ) : (
                              <Text
                                style={
                                  styles.responseNumber
                                }
                              >
                                {index + 1}
                              </Text>
                            )}
                          </View>

                          <Text
                            style={[
                              styles.responseText,
                              index === 0 &&
                                styles.responseTextActive,
                            ]}
                          >
                            {action}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                </>
              )}
            </View>
          </View>

          {/* =====================================================
              VEHICLE INSPECTION
          ===================================================== */}

          <View style={styles.card}>
            <View style={styles.checklistHeader}>
              <View style={styles.checklistHeaderText}>
                <Text style={styles.cardTitle}>
                  Vehicle inspection checklist
                </Text>

                <Text style={styles.cardSubtitle}>
                  Shift activation is blocked until every
                  mandatory item is checked.
                </Text>
              </View>

              <View
                style={[
                  styles.progressBadge,
                  ready
                    ? styles.progressReady
                    : styles.progressWarning,
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
                  {checked.length}/{checklist.length}
                </Text>
              </View>
            </View>

            {/* Checklist tabs */}

            <View style={styles.tabContainer}>
              <Pressable
                style={[
                  styles.tab,
                  checklistType === "ambulance" &&
                    styles.tabActive,
                ]}
                onPress={() => {
                  setChecklistType("ambulance");
                  setChecked([]);
                }}
              >
                <MaterialCommunityIcons
                  name="ambulance"
                  size={19}
                  color={
                    checklistType === "ambulance"
                      ? "#FFFFFF"
                      : "#475569"
                  }
                />

                <Text
                  style={[
                    styles.tabText,
                    checklistType === "ambulance" &&
                      styles.tabTextActive,
                  ]}
                >
                  Ambulance
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.tab,
                  checklistType === "fire" &&
                    styles.tabActive,
                ]}
                onPress={() => {
                  setChecklistType("fire");
                  setChecked([]);
                }}
              >
                <MaterialCommunityIcons
                  name="fire-truck"
                  size={19}
                  color={
                    checklistType === "fire"
                      ? "#FFFFFF"
                      : "#475569"
                  }
                />

                <Text
                  style={[
                    styles.tabText,
                    checklistType === "fire" &&
                      styles.tabTextActive,
                  ]}
                >
                  Fire Engine
                </Text>
              </Pressable>
            </View>

            {/* Checklist */}

            <View style={styles.checklist}>
              {checklist.map((item) => {
                const isChecked =
                  checked.includes(item);

                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.checkItem,
                      isChecked &&
                        styles.checkItemChecked,
                    ]}
                    onPress={() =>
                      toggleChecklist(item)
                    }
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isChecked &&
                          styles.checkboxChecked,
                      ]}
                    >
                      {isChecked && (
                        <Ionicons
                          name="checkmark"
                          size={15}
                          color="#FFFFFF"
                        />
                      )}
                    </View>

                    <Text
                      style={[
                        styles.checkText,
                        isChecked &&
                          styles.checkTextChecked,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Inspection status */}

            <View
              style={[
                styles.inspectionStatus,
                ready
                  ? styles.inspectionStatusReady
                  : styles.inspectionStatusWarning,
              ]}
            >
              <Ionicons
                name={
                  ready
                    ? "checkmark-circle"
                    : "warning-outline"
                }
                size={21}
                color={
                  ready ? "#16A34A" : "#D97706"
                }
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
          </View>

          {/* =====================================================
              FOOTER
          ===================================================== */}

          <View style={styles.footer}>
            <View style={styles.footerLogo}>
              <Ionicons
                name="shield-checkmark"
                size={18}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text style={styles.footerTitle}>
                SafeSync
              </Text>

              <Text style={styles.footerText}>
                Emergency response platform
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ============================================================
   STAT COMPONENT
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
        <Ionicons
          name={icon}
          size={22}
          color="#DC2626"
        />
      </View>

      <View style={styles.statTextContainer}>
        <Text style={styles.statLabel}>
          {label}
        </Text>

        <Text
          style={styles.statValue}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   CELL COMPONENT
   ============================================================ */

function Cell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>
        {label}
      </Text>

      <Text
        style={styles.cellValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
   MAP STAT
   ============================================================ */

function MapStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.mapStat}>
      <Text style={styles.mapStatValue}>
        {value}
      </Text>

      <Text style={styles.mapStatLabel}>
        {label}
      </Text>
    </View>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

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