import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const emergencyTypes = [
  {
    id: "medical",
    label: "Medical Emergency",
    hint: "Illness, injury or medical assistance",
    icon: "medical",
  },
  {
    id: "fire",
    label: "Fire Emergency",
    hint: "Fire, smoke or burning building",
    icon: "fire",
  },
  {
    id: "accident",
    label: "Road Accident",
    hint: "Vehicle crash or road incident",
    icon: "car",
  },
  {
    id: "rescue",
    label: "Rescue",
    hint: "Person trapped or requiring rescue",
    icon: "lifebuoy",
  },
  {
    id: "security",
    label: "Security Emergency",
    hint: "Threat, danger or security incident",
    icon: "shield-alert",
  },
  {
    id: "other",
    label: "Other Emergency",
    hint: "Something else requiring urgent help",
    icon: "alert-circle",
  },
];

export default function EmergencyRequest() {
  const router = useRouter();

  const [selected, setSelected] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const [notes, setNotes] = useState("");

  const selectedType = emergencyTypes.find(
    (item) => item.id === selected
  );

  // ---------------------------------------------------------
  // Simulate GPS capture
  // ---------------------------------------------------------

  useEffect(() => {
    if (!selected) {
      setLocating(false);
      setLocated(false);
      return;
    }

    setLocating(true);
    setLocated(false);

    const timer = setTimeout(() => {
      setLocating(false);
      setLocated(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [selected]);

  // ---------------------------------------------------------
  // Dispatch emergency
  // ---------------------------------------------------------

  const handleDispatch = () => {
    if (!located || !selectedType) {
      return;
    }

    Alert.alert(
      "Confirm Emergency",
      `You are about to request ${selectedType.label}. Your location will be shared with the emergency response team.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm & Dispatch",
          style: "destructive",
          onPress: () => {
            router.push({
              pathname: "/(tabs)/track",
              params: {
                type: selectedType.label,
                notes: notes,
              },
            });
          },
        },
      ]
    );
  };

  // ---------------------------------------------------------
  // Emergency icons
  // ---------------------------------------------------------

  const getIcon = (icon: string) => {
    switch (icon) {
      case "medical":
        return (
          <Ionicons
            name="medical"
            size={25}
            color={
              selected === "medical"
                ? "#FFFFFF"
                : "#DC2626"
            }
          />
        );

      case "fire":
        return (
          <MaterialCommunityIcons
            name="fire"
            size={27}
            color={
              selected === "fire"
                ? "#FFFFFF"
                : "#DC2626"
            }
          />
        );

      case "car":
        return (
          <Ionicons
            name="car"
            size={25}
            color={
              selected === "accident"
                ? "#FFFFFF"
                : "#DC2626"
            }
          />
        );

      case "lifebuoy":
        return (
          <Ionicons
            name="help-buoy"
            size={26}
            color={
              selected === "rescue"
                ? "#FFFFFF"
                : "#DC2626"
            }
          />
        );

      case "shield-alert":
        return (
          <MaterialCommunityIcons
            name="shield-alert-outline"
            size={27}
            color={
              selected === "security"
                ? "#FFFFFF"
                : "#DC2626"
            }
          />
        );

      default:
        return (
          <Ionicons
            name="alert-circle-outline"
            size={27}
            color={
              selected === "other"
                ? "#FFFFFF"
                : "#DC2626"
            }
          />
        );
    }
  };

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
            <Ionicons
              name="arrow-back"
              size={22}
              color="#0F172A"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
            >
              What is the emergency?
            </Text>

            <Text
              style={styles.headerSubtitle}
              numberOfLines={1}
            >
              Pick the closest match — you can add details next.
            </Text>
          </View>
        </View>

        {/* CONTENT */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* EMERGENCY TYPES */}

          <View style={styles.emergencyList}>
            {emergencyTypes.map((item) => {
              const active = selected === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={[
                    styles.emergencyOption,
                    active &&
                      styles.emergencyOptionActive,
                  ]}
                  onPress={() =>
                    setSelected(item.id)
                  }
                >

                  {/* ICON */}

                  <View
                    style={[
                      styles.emergencyIcon,
                      active &&
                        styles.emergencyIconActive,
                    ]}
                  >
                    {getIcon(item.icon)}
                  </View>

                  {/* TEXT */}

                  <View
                    style={styles.emergencyTextContainer}
                  >
                    <Text
                      style={[
                        styles.emergencyTitle,
                        active &&
                          styles.emergencyTitleActive,
                      ]}
                    >
                      {item.label}
                    </Text>

                    <Text
                      style={styles.emergencyHint}
                      numberOfLines={2}
                    >
                      {item.hint}
                    </Text>
                  </View>

                  {/* CHECK */}

                  {active && (
                    <View style={styles.checkCircle}>
                      <Ionicons
                        name="checkmark"
                        size={17}
                        color="#DC2626"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* LOCATION + NOTES */}

          {selected && (
            <View style={styles.detailsCard}>

              {/* LOCATION */}

              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  {locating ? (
                    <ActivityIndicator
                      size="small"
                      color="#DC2626"
                    />
                  ) : (
                    <Ionicons
                      name="location"
                      size={21}
                      color="#DC2626"
                    />
                  )}
                </View>

                <View
                  style={styles.locationTextContainer}
                >
                  <Text
                    style={styles.locationTitle}
                    numberOfLines={1}
                  >
                    {locating
                      ? "Capturing your GPS location..."
                      : "Wood Avenue, Kilimani, Nairobi"}
                  </Text>

                  <Text
                    style={styles.locationSubtitle}
                  >
                    {locating
                      ? "Please hold"
                      : "Accuracy 6 m · captured just now"}
                  </Text>
                </View>

                {located && (
                  <View style={styles.locatedBadge}>
                    <Text style={styles.locatedText}>
                      Located
                    </Text>
                  </View>
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
                <Text style={styles.characterCountText}>
                  {notes.length}/500
                </Text>
              </View>

              {/* WARNING */}

              <View style={styles.warningBox}>
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={20}
                  color="#D97706"
                />

                <Text style={styles.warningText}>
                  Confirming dispatches a real unit and
                  notifies your emergency contacts with
                  your live location.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* DISPATCH BUTTON */}

        <View style={styles.dispatchContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!located}
            onPress={handleDispatch}
            style={[
              styles.dispatchButton,
              !located &&
                styles.dispatchButtonDisabled,
            ]}
          >
            {locating ? (
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />
            ) : (
              <MaterialCommunityIcons
                name="siren"
                size={24}
                color="#FFFFFF"
              />
            )}

            <Text
              style={styles.dispatchButtonText}
            >
              {locating
                ? "LOCATING YOU..."
                : selectedType
                ? `CONFIRM & DISPATCH · ${selectedType.label.toUpperCase()}`
                : "SELECT AN EMERGENCY"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================

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

  characterCount: {
    alignItems: "flex-end",
    marginTop: 5,
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

  // DISPATCH

  dispatchContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: "rgba(248,250,252,0.97)",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  dispatchButton: {
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    gap: 10,
    shadowColor: "#DC2626",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },

  dispatchButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },

  dispatchButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
    flexShrink: 1,
  },

  bottomSpace: {
    height: 100,
  },
});