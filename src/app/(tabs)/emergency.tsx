import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useEmergencyBar } from "../../components/emergency-bar-context";
import { apiFetchLogged as apiFetch } from "@/lib/logged-api";
import {
  ensureLocationAccess,
  promptLocationSettings,
} from "@/lib/location-access";

type Coordinates = { latitude: number; longitude: number };

type EmergencyOption = {
  id: string;
  label: string;
  hint: string;
  icon: "medical" | "fire" | "car";
  // What the backend dispatches (emergency.emergency_types.code).
  dispatchType: "ambulance" | "fire";
};

type CreatedEmergency = { id: string };

const emergencyTypes: EmergencyOption[] = [
  {
    id: "medical",
    label: "Medical Emergency",
    hint: "Illness, injury or medical assistance",
    icon: "medical",
    dispatchType: "ambulance",
  },
  {
    id: "fire",
    label: "Fire Emergency",
    hint: "Fire, smoke or burning building",
    icon: "fire",
    dispatchType: "fire",
  },
  {
    id: "accident",
    label: "Road Accident",
    hint: "Vehicle crash or road incident",
    icon: "car",
    dispatchType: "ambulance",
  },
];

function formatPlace(address: Location.LocationGeocodedAddress): string {
  const parts = [
    address.name ?? address.street,
    address.district ?? address.subregion,
    address.city ?? address.region,
  ].filter((p): p is string => !!p && p.trim().length > 0);

  return Array.from(new Set(parts)).join(", ");
}

export default function EmergencyRequest() {
  const router = useRouter();
  const { setConfig } = useEmergencyBar();

  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedType = emergencyTypes.find((item) => item.id === selected);
  const located = coords !== null;

  // ---------------------------------------------------------
  // Real GPS capture
  // ---------------------------------------------------------

  const captureLocation = useCallback(async () => {
    setLocating(true);
    setLocationError(null);

    try {
      const access = await ensureLocationAccess({
        purpose: "send responders to your exact position",
      });

      if (!access.granted) {
        setLocationError(access.message);
        promptLocationSettings(access);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const here = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setCoords(here);
      setAccuracy(position.coords.accuracy ?? null);

      try {
        const [place] = await Location.reverseGeocodeAsync(here);
        setAddress(place ? formatPlace(place) || null : null);
      } catch {
        setAddress(null); // coordinates are shown instead
      }
    } catch (err) {
      setLocationError(
        err instanceof Error ? err.message : "Unable to determine your location."
      );
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    captureLocation();
  }, [captureLocation]);

  // ---------------------------------------------------------
  // Dispatch emergency
  // ---------------------------------------------------------

  const openActiveEmergency = async (): Promise<boolean> => {
    const active = await apiFetch<CreatedEmergency | null>(
      "/api/v1/emergencies/active"
    ).catch(() => null);

    if (!active?.id) return false;

    Alert.alert(
      "Emergency already in progress",
      "You already have an active emergency. Open it to follow the response.",
      [
        { text: "Close", style: "cancel" },
        {
          text: "Track it",
          onPress: () =>
            router.replace({
              pathname: "/(tabs)/track",
              params: { incidentId: active.id },
            }),
        },
      ]
    );
    return true;
  };

  const sendEmergency = async () => {
    if (!selectedType || !coords || submitting) return;

    setSubmitting(true);

    try {
      // The client may have moved since the screen opened: take a fresh fix.
      let here = coords;
      let here_accuracy = accuracy;
      try {
        const fresh = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        here = {
          latitude: fresh.coords.latitude,
          longitude: fresh.coords.longitude,
        };
        here_accuracy = fresh.coords.accuracy ?? here_accuracy;
      } catch {
        // fall back to the fix we already have
      }

      const extra = notes.trim();
      const created = await apiFetch<CreatedEmergency>("/api/v1/emergencies", {
        method: "POST",
        body: JSON.stringify({
          emergency_type: selectedType.dispatchType,
          location: {
            latitude: here.latitude,
            longitude: here.longitude,
            address,
            accuracy: here_accuracy,
          },
          description: extra
            ? `${selectedType.label} — ${extra}`
            : selectedType.label,
        }),
      });

      router.push({
        pathname: "/(tabs)/track",
        params: { incidentId: created.id },
      });
    } catch (err) {
      if (await openActiveEmergency()) return;

      Alert.alert(
        "Couldn't send emergency",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = () => {
    if (!located || !selectedType || submitting) return;

    Alert.alert(
      "Confirm Emergency",
      `You are about to request ${selectedType.label}. Your location will be shared with the emergency response team.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Dispatch",
          style: "destructive",
          onPress: sendEmergency,
        },
      ]
    );
  };

  useEffect(() => {
    setConfig({
      label: locating
        ? "LOCATING YOU..."
        : submitting
        ? "SENDING..."
        : selectedType
        ? "CONFIRM EMERGENCY"
        : "SELECT AN EMERGENCY",
      disabled: !located || !selectedType || submitting,
      loading: locating || submitting,
      onPress: handleDispatch,
    });

    return () => setConfig(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locating, located, selectedType, notes, coords, address, submitting]);

  // ---------------------------------------------------------
  // Icons
  // ---------------------------------------------------------

  const getIcon = (item: EmergencyOption) => {
    const color = selected === item.id ? "#FFFFFF" : "#DC2626";

    switch (item.icon) {
      case "medical":
        return <Ionicons name="medical" size={25} color={color} />;
      case "fire":
        return <MaterialCommunityIcons name="fire" size={27} color={color} />;
      default:
        return <Ionicons name="car" size={25} color={color} />;
    }
  };

  const locationTitle = locating
    ? "Capturing your GPS location..."
    : locationError
    ? locationError
    : address ??
      (coords
        ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
        : "Location unavailable");

  const locationSubtitle = locating
    ? "Please hold"
    : locationError
    ? "Tap retry to try again"
    : accuracy != null
    ? `Accuracy ${Math.round(accuracy)} m · captured just now`
    : "Captured just now";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              What is the emergency?
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Pick the closest match — you can add details next.
            </Text>
          </View>
        </View>

        {/* CONTENT */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.emergencyList}>
            {emergencyTypes.map((item) => {
              const active = selected === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={[
                    styles.emergencyOption,
                    active && styles.emergencyOptionActive,
                  ]}
                  onPress={() => setSelected(item.id)}
                >
                  <View
                    style={[
                      styles.emergencyIcon,
                      active && styles.emergencyIconActive,
                    ]}
                  >
                    {getIcon(item)}
                  </View>

                  <View style={styles.emergencyTextContainer}>
                    <Text
                      style={[
                        styles.emergencyTitle,
                        active && styles.emergencyTitleActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.emergencyHint} numberOfLines={2}>
                      {item.hint}
                    </Text>
                  </View>

                  {active && (
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={17} color="#DC2626" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {selected && (
            <View style={styles.detailsCard}>
              {/* LOCATION */}
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  {locating ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <Ionicons name="location" size={21} color="#DC2626" />
                  )}
                </View>

                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationTitle} numberOfLines={1}>
                    {locationTitle}
                  </Text>
                  <Text style={styles.locationSubtitle}>{locationSubtitle}</Text>
                </View>

                {located && !locationError && !locating && (
                  <View style={styles.locatedBadge}>
                    <Text style={styles.locatedText}>Located</Text>
                  </View>
                )}

                {!!locationError && !locating && (
                  <TouchableOpacity
                    style={styles.locatedBadge}
                    onPress={captureLocation}
                  >
                    <Text style={styles.locatedText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* NOTES */}
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes for the crew (symptoms, number of people, access instructions)"
                placeholderTextColor="#94A3B8"
                multiline
                maxLength={500}
                textAlignVertical="top"
                style={styles.notesInput}
              />

              <View style={styles.characterCount}>
                <Text style={styles.characterCountText}>{notes.length}/500</Text>
              </View>

              {/* WARNING */}
              <View style={styles.warningBox}>
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={20}
                  color="#D97706"
                />
                <Text style={styles.warningText}>
                  Confirming dispatches a real unit to your exact location.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </SafeAreaView>
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

  // HEADER

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },

  // CONTENT

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  emergencyList: {
    gap: 12,
  },

  // EMERGENCY OPTION

  emergencyOption: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 13,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },

  emergencyOptionActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FFF7F7",
  },

  emergencyIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  emergencyIconActive: {
    backgroundColor: "#DC2626",
  },

  emergencyTextContainer: {
    flex: 1,
    paddingRight: 8,
  },

  emergencyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  emergencyTitleActive: {
    color: "#991B1B",
  },

  emergencyHint: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
  },

  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  // DETAILS

  detailsCard: {
    marginTop: 20,
    padding: 17,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // LOCATION

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  locationTextContainer: {
    flex: 1,
  },

  locationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  locationSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: "#64748B",
  },

  locatedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8,
  },

  locatedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },

  // NOTES

  notesInput: {
    minHeight: 110,
    marginTop: 17,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 19,
  },

  notesInputRequired: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF7F7",
  },

  characterCount: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },

  requiredHint: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },

  characterCountText: {
    fontSize: 10,
    color: "#94A3B8",
  },

  // WARNING

  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFBEB",
  },

  warningText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 11,
    lineHeight: 17,
    color: "#78350F",
  },

  bottomSpace: {
    height: 160,
  },
});