import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,

  Pressable,

  TouchableOpacity,

  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,

  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";

import {
  ArrowLeft,
  Ambulance,
  Flame,
  Car,
  LifeBuoy,
  ShieldAlert,
  CircleAlert,
  Check,
  MapPin,
  Navigation,
  Radio,
  Send,
} from "lucide-react-native";

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  primary: "#DC2626",
  primaryDark: "#B91C1C",
  primaryLight: "#FEF2F2",

  background: "#F8FAFC",
  card: "#FFFFFF",
  white: "#FFFFFF",

  text: "#0F172A",
  muted: "#64748B",

  slate900: "#0F172A",
  slate800: "#1E293B",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate300: "#CBD5E1",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",

  success: "#059669",
  successLight: "#ECFDF5",

  amber: "#D97706",
  amberLight: "#FFFBEB",

  blue: "#2563EB",
  blueLight: "#EFF6FF",
};

/* =========================================================
   EMERGENCY TYPES
========================================================= */


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

  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function EmergencyRequest() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 360;

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


  /* =======================================================
     SIMULATE GPS CAPTURE
  ======================================================= */

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


  /* =======================================================
     GET EMERGENCY ICON
  ======================================================= */

  const getIcon = (
    type: string,
    active: boolean,
    size = 25
  ) => {
    const color = active
      ? COLORS.white
      : COLORS.primary;

    switch (type) {
      case "medical":
        return (
          <Ambulance
            size={size}
            color={color}
            strokeWidth={2.2}
          />
        );

      case "fire":
        return (
          <Flame
            size={size}
            color={color}
            strokeWidth={2.2}
          />
        );

      case "accident":
        return (
          <Car
            size={size}
            color={color}
            strokeWidth={2.2}
          />
        );

      case "rescue":
        return (
          <LifeBuoy
            size={size}
            color={color}
            strokeWidth={2.2}
          />
        );

      case "security":
        return (
          <ShieldAlert
            size={size}
            color={color}
            strokeWidth={2.2}
          />
        );

      default:
        return (
          <CircleAlert
            size={size}
            color={color}
            strokeWidth={2.2}
          />
        );
    }
  };

  /* =======================================================
     DISPATCH ICON
  ======================================================= */

  const getDispatchIcon = () => {
    if (!selected) {
      return (
        <CircleAlert
          size={20}
          color={COLORS.white}
          strokeWidth={2.3}
        />
      );
    }

    if (locating) {
      return null;
    }

    return getIcon(selected, true, 20);
  };

  /* =======================================================
     DISPATCH
  ======================================================= */

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

              pathname: "/track",

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


  /* =======================================================
     RENDER
  ======================================================= */

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


        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              isSmallScreen && styles.backButtonSmall,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <ArrowLeft
              size={20}
              color={COLORS.text}
              strokeWidth={2.2}
            />
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text
              style={[
                styles.headerTitle,
                isSmallScreen && styles.headerTitleSmall,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}

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

              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Pick the closest match to continue.

            >
              Pick the closest match — you can add details next.

            </Text>
          </View>
        </View>


        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            isSmallScreen && styles.scrollContentSmall,
          ]}
        >

          {/* =================================================
              STEP INDICATOR
          ================================================= */}

          <View style={styles.stepRow}>
            <View style={styles.stepActive}>
              <Text style={styles.stepActiveText}>1</Text>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepInactive}>
              <Text style={styles.stepInactiveText}>2</Text>
            </View>

            <View style={styles.stepLabelContainer}>
              <Text
                style={styles.stepLabel}
                numberOfLines={1}
              >
                Emergency details
              </Text>
            </View>
          </View>

          {/* =================================================
              SECTION TITLE
          ================================================= */}

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Select emergency type
            </Text>

            <Text
              style={styles.sectionSubtitle}
              numberOfLines={2}
            >
              Choose the option that best describes the situation.
            </Text>
          </View>

          {/* =================================================
              EMERGENCY TYPES
          ================================================= */}

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

                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.emergencyOption,
                    active && styles.emergencyOptionActive,
                    pressed && styles.emergencyOptionPressed,
                  ]}
                  onPress={() => setSelected(item.id)}
                >

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

                      active && styles.emergencyIconActive,
                      isSmallScreen &&
                        styles.emergencyIconSmall,
                    ]}
                  >
                    {getIcon(
                      item.id,
                      active,
                      isSmallScreen ? 22 : 24
                    )}

                      active &&
                        styles.emergencyIconActive,
                    ]}
                  >
                    {getIcon(item.icon)}

                  </View>

                  {/* TEXT */}


                  <View style={styles.emergencyTextContainer}>
                    <Text
                      style={[
                        styles.emergencyTitle,
                        isSmallScreen &&
                          styles.emergencyTitleSmall,
                        active &&
                          styles.emergencyTitleActive,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}

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

                      <Check
                        size={14}
                        color={COLORS.primary}
                        strokeWidth={3}
                      />
                    </View>
                  )}
                </Pressable>

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


          {/* =================================================
              DETAILS
          ================================================= */}

          {/* LOCATION + NOTES */}


          {selected && (
            <View style={styles.detailsCard}>


              {/* DETAILS HEADER */}

              <View style={styles.detailsHeader}>
                <View style={styles.detailsHeaderText}>
                  <Text
                    style={styles.detailsTitle}
                    numberOfLines={1}
                  >
                    Emergency details
                  </Text>

                  <Text
                    style={styles.detailsSubtitle}
                    numberOfLines={2}
                  >
                    Your location will be included with the request.
                  </Text>
                </View>

                <View style={styles.radioBadge}>
                  <Radio
                    size={15}
                    color={COLORS.primary}
                    strokeWidth={2}
                  />
                </View>
              </View>

              {/* =================================================
                  LOCATION
              ================================================= */}

              {/* LOCATION */}


              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  {locating ? (
                    <ActivityIndicator
                      size="small"

                      color={COLORS.primary}
                    />
                  ) : (
                    <MapPin
                      size={19}
                      color={COLORS.primary}
                      strokeWidth={2.2}

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


                <View style={styles.locationTextContainer}>
                  <Text
                    style={styles.locationTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}

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


                  <View style={styles.locationMetaRow}>
                    {!locating && (
                      <Navigation
                        size={11}
                        color={COLORS.success}
                        strokeWidth={2}
                      />
                    )}

                    <Text
                      style={styles.locationSubtitle}
                      numberOfLines={1}
                    >
                      {locating
                        ? "Please hold while we locate you"
                        : "Accuracy 6 m · captured just now"}
                    </Text>
                  </View>

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

                    <Check
                      size={10}
                      color={COLORS.success}
                      strokeWidth={3}
                    />



                    <Text style={styles.locatedText}>
                      Located
                    </Text>
                  </View>
                )}
              </View>


              {/* =================================================
                  NOTES
              ================================================= */}

              <View style={styles.notesHeader}>
                <Text style={styles.notesTitle}>
                  Additional information
                </Text>

                <Text style={styles.optionalText}>
                  OPTIONAL
                </Text>
              </View>

              {/* NOTES */}

              <TextInput
                value={notes}
                onChangeText={setNotes}

                placeholder="Tell the response team anything important..."
                placeholderTextColor={COLORS.slate400}

                placeholder="Optional notes for the crew (symptoms, number of people, access instructions)"
                placeholderTextColor="#94A3B8"

                multiline
                maxLength={500}
                textAlignVertical="top"
                style={styles.notesInput}
              />


              <View style={styles.notesFooter}>
                <Text
                  style={styles.notesHint}
                  numberOfLines={2}
                >
                  Symptoms, number of people, access instructions, etc.
                </Text>


              <View style={styles.characterCount}>

                <Text style={styles.characterCountText}>
                  {notes.length}/500
                </Text>
              </View>


              {/* =================================================
                  WARNING
              ================================================= */}

              <View style={styles.warningBox}>
                <ShieldAlert
                  size={18}
                  color={COLORS.amber}
                  strokeWidth={2}
                />

                <Text style={styles.warningText}>
                  Confirming dispatch will notify the emergency
                  response team and share your live location.

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


          {/* EXTRA SPACE FOR FIXED BUTTON */}

          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* =================================================
            FIXED DISPATCH CONTAINER
        ================================================= */}

        <View style={styles.dispatchContainer}>
          <View style={styles.dispatchInner}>

            {/* STATUS */}

            {selected && (
              <View style={styles.dispatchStatus}>
                <View
                  style={[
                    styles.dispatchStatusDot,
                    located &&
                      styles.dispatchStatusDotReady,
                  ]}
                />

                <Text
                  style={styles.dispatchStatusText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {locating
                    ? "Getting your location..."
                    : located
                    ? "Location ready"
                    : "Preparing emergency request"}
                </Text>
              </View>
            )}

            {/* DISPATCH BUTTON */}

            <Pressable
              disabled={!located}
              onPress={handleDispatch}
              style={({ pressed }) => [
                styles.dispatchButton,
                !located &&
                  styles.dispatchButtonDisabled,
                pressed &&
                  located &&
                  styles.dispatchButtonPressed,
              ]}
            >
              <View style={styles.dispatchIcon}>
                {locating ? (
                  <ActivityIndicator
                    color={COLORS.white}
                    size="small"
                  />
                ) : (
                  getDispatchIcon()
                )}
              </View>

              <View style={styles.dispatchTextContainer}>
                <Text
                  style={[
                    styles.dispatchButtonText,
                    isSmallScreen &&
                      styles.dispatchButtonTextSmall,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {locating
                    ? "LOCATING YOU..."
                    : selectedType
                    ? located
                      ? "CONFIRM & DISPATCH"
                      : "PREPARING REQUEST..."
                    : "SELECT AN EMERGENCY"}
                </Text>

                {selectedType && !locating && (
                  <Text
                    style={styles.dispatchSubtext}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {selectedType.label}
                  </Text>
                )}
              </View>

              {located && (
                <View style={styles.dispatchSendIcon}>
                  <Send
                    size={18}
                    color={COLORS.white}
                    strokeWidth={2.4}
                  />
                </View>
              )}
            </Pressable>
          </View>

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


/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     SCREEN
  ======================================================= */

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,

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

    backgroundColor: COLORS.background,
    overflow: "hidden",
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 14,
    paddingVertical: 10,

    backgroundColor: COLORS.white,

    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },

  backButton: {
    width: 39,
    height: 39,

    flexShrink: 0,

    borderRadius: 11,

    backgroundColor: COLORS.slate100,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  backButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 8,
  },

  backButtonPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],

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

    minWidth: 0,


  },

  headerTitle: {
    fontSize: 17,

    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },

  headerTitleSmall: {
    fontSize: 15,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 10.5,
    color: COLORS.muted,
    fontWeight: "500",
    flexShrink: 1,
  },

  /* =======================================================
     SCROLL
  ======================================================= */

  scrollView: {
    flex: 1,
    width: "100%",
  },

  scrollContent: {
    width: "100%",

    paddingHorizontal: 14,
    paddingTop: 15,

    paddingBottom: 175,
  },

  scrollContentSmall: {
    paddingHorizontal: 11,
    paddingTop: 13,
    paddingBottom: 170,
  },

  /* =======================================================
     STEP
  ======================================================= */

  stepRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",

    marginBottom: 17,
  },

  stepActive: {
    width: 25,
    height: 25,
    borderRadius: 13,

    backgroundColor: COLORS.primary,

    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,
  },

  stepActiveText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "900",
  },

  stepInactive: {
    width: 25,
    height: 25,
    borderRadius: 13,

    backgroundColor: COLORS.slate200,

    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,
  },

  stepInactiveText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  stepLine: {
    width: 25,
    height: 1,

    backgroundColor: COLORS.slate300,

    marginHorizontal: 6,

    flexShrink: 0,
  },

  stepLabelContainer: {
    flex: 1,
    minWidth: 0,
    marginLeft: 7,
  },

  stepLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.muted,
  },

  /* =======================================================
     SECTION
  ======================================================= */

  sectionHeading: {
    width: "100%",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 10.5,
    lineHeight: 15,
    color: COLORS.muted,
  },

  /* =======================================================
     EMERGENCY LIST
  ======================================================= */

  emergencyList: {
    width: "100%",
    gap: 9,
  },

  emergencyOption: {
    width: "100%",
    minHeight: 72,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 11,
    paddingVertical: 9,

    backgroundColor: COLORS.white,

    borderRadius: 15,

    borderWidth: 1.5,
    borderColor: COLORS.slate200,

    overflow: "hidden",
  },

  emergencyOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#FFF7F7",
  },

  emergencyOptionPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },

  emergencyIcon: {
    width: 44,
    height: 44,

    borderRadius: 12,

    backgroundColor: COLORS.primaryLight,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,

    flexShrink: 0,
  },

  emergencyIconSmall: {
    width: 41,
    height: 41,
    borderRadius: 11,
    marginRight: 9,
  },

  emergencyIconActive: {
    backgroundColor: COLORS.primary,

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

    minWidth: 0,
    paddingRight: 5,
  },

  emergencyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  emergencyTitleSmall: {
    fontSize: 13,
  },

  emergencyTitleActive: {
    color: COLORS.primaryDark,
  },

  emergencyHint: {
    marginTop: 3,

    fontSize: 10.5,
    lineHeight: 14,

    color: COLORS.muted,
  },

  checkCircle: {
    width: 24,
    height: 24,

    borderRadius: 12,

    backgroundColor: "#FEE2E2",

    alignItems: "center",
    justifyContent: "center",

    marginLeft: 4,

    flexShrink: 0,
  },

  /* =======================================================
     DETAILS CARD
  ======================================================= */

  detailsCard: {
    width: "100%",

    marginTop: 16,

    padding: 14,

    backgroundColor: COLORS.white,

    borderRadius: 18,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    overflow: "hidden",
  },

  detailsHeader: {
    width: "100%",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 13,
  },

  detailsHeaderText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },

  detailsTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.text,
  },

  detailsSubtitle: {
    marginTop: 3,
    fontSize: 9.5,
    lineHeight: 13,
    color: COLORS.muted,
  },

  radioBadge: {
    width: 33,
    height: 33,

    borderRadius: 10,

    backgroundColor: COLORS.primaryLight,

    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,
  },

  /* =======================================================
     LOCATION
  ======================================================= */

  locationRow: {
    width: "100%",

    flexDirection: "row",
    alignItems: "center",

    padding: 9,

    borderRadius: 13,

    backgroundColor: COLORS.slate100,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    overflow: "hidden",
  },

  locationIcon: {
    width: 36,
    height: 36,

    borderRadius: 10,

    backgroundColor: COLORS.white,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 8,

    flexShrink: 0,

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

    minWidth: 0,
  },

  locationTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: COLORS.text,
  },

  locationMetaRow: {
    flexDirection: "row",
    alignItems: "center",

    marginTop: 3,

    minWidth: 0,
  },

  locationSubtitle: {
    flex: 1,

    fontSize: 9,
    color: COLORS.muted,
    marginLeft: 3,
  },

  locatedBadge: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: COLORS.successLight,

    paddingHorizontal: 6,
    paddingVertical: 5,

    borderRadius: 8,

    marginLeft: 5,

    flexShrink: 0,
  },

  locatedText: {
    fontSize: 8.5,
    fontWeight: "900",
    color: COLORS.success,
    marginLeft: 2,
  },

  /* =======================================================
     NOTES
  ======================================================= */

  notesHeader: {
    width: "100%",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginTop: 14,
    marginBottom: 7,
  },

  notesTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: COLORS.text,
  },

  optionalText: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.slate400,
    letterSpacing: 0.5,
  },

  notesInput: {
    width: "100%",

    minHeight: 90,

    paddingHorizontal: 11,
    paddingTop: 10,
    paddingBottom: 10,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    backgroundColor: COLORS.background,

    color: COLORS.text,

    fontSize: 11.5,
    lineHeight: 17,
  },

  notesFooter: {
    width: "100%",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginTop: 5,
  },

  notesHint: {
    flex: 1,

    fontSize: 8.5,
    lineHeight: 12,

    color: COLORS.slate400,

    paddingRight: 8,
  },

  characterCountText: {
    fontSize: 9,
    color: COLORS.slate400,

    marginLeft: 6,

    flexShrink: 0,
  },

  /* =======================================================
     WARNING
  ======================================================= */

  warningBox: {
    width: "100%",

    flexDirection: "row",
    alignItems: "flex-start",

    marginTop: 12,

    padding: 9,

    borderRadius: 11,

    backgroundColor: COLORS.amberLight,

    borderWidth: 1,
    borderColor: "#FDE68A",

    overflow: "hidden",

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


    marginLeft: 7,

    fontSize: 9.5,
    lineHeight: 14,

    color: "#78350F",
  },

  /* =======================================================
     BOTTOM SPACE
  ======================================================= */

  bottomSpace: {
    height: 75,
  },

  /* =======================================================
     FIXED DISPATCH CONTAINER
  ======================================================= */

  dispatchContainer: {
    position: "absolute",

    left: 0,
    right: 0,
    bottom: 0,

    width: "100%",

    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,

    backgroundColor: "rgba(248,250,252,0.98)",

    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,

    overflow: "hidden",
  },

  dispatchInner: {
    width: "100%",
    alignSelf: "center",

    maxWidth: 600,
  },

  /* =======================================================
     DISPATCH STATUS
  ======================================================= */

  dispatchStatus: {
    width: "100%",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    marginBottom: 5,

    paddingHorizontal: 8,
  },

  dispatchStatusDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    backgroundColor: COLORS.slate400,

    marginRight: 5,

    flexShrink: 0,
  },

  dispatchStatusDotReady: {
    backgroundColor: COLORS.success,
  },

  dispatchStatusText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.muted,

    flexShrink: 1,
  },

  /* =======================================================
     DISPATCH BUTTON
  ======================================================= */

  dispatchButton: {
    width: "100%",

    minHeight: 54,

    borderRadius: 15,

    backgroundColor: COLORS.primary,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 10,

    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,

    elevation: 5,

    overflow: "hidden",
  },

  dispatchButtonDisabled: {
    backgroundColor: COLORS.slate400,


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


  dispatchButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },

  /* =======================================================
     DISPATCH ICON
  ======================================================= */

  dispatchIcon: {
    width: 36,
    height: 36,

    borderRadius: 10,

    backgroundColor: "rgba(255,255,255,0.16)",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 8,

    flexShrink: 0,
  },

  /* =======================================================
     DISPATCH TEXT
  ======================================================= */

  dispatchTextContainer: {
    flex: 1,
    minWidth: 0,

    justifyContent: "center",
  },

  dispatchButtonText: {
    color: COLORS.white,

    fontSize: 12,
    fontWeight: "900",

    letterSpacing: 0.2,

    flexShrink: 1,
  },

  dispatchButtonTextSmall: {
    fontSize: 10.5,
  },

  dispatchSubtext: {
    color: "rgba(255,255,255,0.78)",

    fontSize: 9,

    fontWeight: "600",

    marginTop: 2,

    flexShrink: 1,
  },

  dispatchSendIcon: {
    width: 30,
    height: 30,

    alignItems: "center",
    justifyContent: "center",

    marginLeft: 5,

    flexShrink: 0,
  },
});


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

