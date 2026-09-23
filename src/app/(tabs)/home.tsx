import React, { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import {
  Ambulance,
  Flame,
  MapPin,
  Navigation,
  Radio,
  ShieldAlert,
  ShieldCheck,
  LocateFixed,
  Clock3,
  UsersRound,
  Truck,
  ChevronRight,
} from "lucide-react-native";

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  primary: "#E11D48",
  primaryDark: "#BE123C",
  primaryLight: "#FFF1F2",

  background: "#F8FAFC",
  card: "#FFFFFF",
  white: "#FFFFFF",

  slate950: "#020617",
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
  amberDark: "#B45309",
  amberLight: "#FFFBEB",

  blue: "#2563EB",
  blueLight: "#EFF6FF",

  mapRoad: "#CBD5E1",
  mapRoadMain: "#94A3B8",
};

/* =========================================================
   TYPES
========================================================= */

interface ResponderUnit {
  id: string;
  name: string;
  station: string;
  kind: "Ambulance" | "Fire Engine" | "Rescue Truck";
  status: "Available" | "En Route" | "Standby";
  eta: string;
  distance: string;
  crew: number;
  vehicle: string;
}

/* =========================================================
   NEARBY UNITS
========================================================= */

const NEARBY_UNITS: ResponderUnit[] = [
  {
    id: "u-1",
    name: "ALS Ambulance Alpha 1",
    station: "Nairobi West Hospital Station",
    kind: "Ambulance",
    status: "Available",
    eta: "3.5 mins",
    distance: "1.4 km",
    crew: 3,
    vehicle: "Toyota Land Cruiser ALS",
  },
  {
    id: "u-2",
    name: "Rapid Fire Engine 04",
    station: "Kilimani Fire Substation",
    kind: "Fire Engine",
    status: "Available",
    eta: "5.2 mins",
    distance: "2.1 km",
    crew: 5,
    vehicle: "Scania Heavy Pumper",
  },
];

/* =========================================================
   HOME SCREEN
========================================================= */

export default function HomeScreen() {
  const router = useRouter();

  const [units] = useState<ResponderUnit[]>(
    NEARBY_UNITS
  );

  /* =======================================================
     UNIT ICON
  ======================================================= */

  const getUnitIcon = (
    kind: ResponderUnit["kind"]
  ) => {
    switch (kind) {
      case "Ambulance":
        return (
          <Ambulance
            size={20}
            color={COLORS.primary}
            strokeWidth={2.2}
          />
        );

      case "Fire Engine":
        return (
          <Flame
            size={20}
            color={COLORS.amber}
            strokeWidth={2.2}
          />
        );

      case "Rescue Truck":
        return (
          <ShieldAlert
            size={20}
            color={COLORS.blue}
            strokeWidth={2.2}
          />
        );

      default:
        return null;
    }
  };

  /* =======================================================
     UNIT COLORS
  ======================================================= */

  const getUnitColors = (
    kind: ResponderUnit["kind"]
  ) => {
    switch (kind) {
      case "Ambulance":
        return {
          background: COLORS.primaryLight,
          border: "#FECDD3",
          icon: COLORS.primary,
        };

      case "Fire Engine":
        return {
          background: COLORS.amberLight,
          border: "#FDE68A",
          icon: COLORS.amber,
        };

      case "Rescue Truck":
        return {
          background: COLORS.blueLight,
          border: "#BFDBFE",
          icon: COLORS.blue,
        };

      default:
        return {
          background: COLORS.slate100,
          border: COLORS.slate200,
          icon: COLORS.slate600,
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingSmall}>
              Welcome back
            </Text>

            <Text style={styles.greetingTitle}>
              Hello, Kevin
            </Text>

            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <MapPin
                  size={12}
                  color={COLORS.primary}
                  strokeWidth={2.5}
                />
              </View>

              <Text style={styles.locationText}>
                Kilimani, Nairobi
              </Text>

              <View style={styles.gpsBadge}>
                <View style={styles.gpsDot} />

                <Text style={styles.gpsText}>
                  GPS 6m
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() =>
              router.push("/(tabs)/profile")
            }
            style={({ pressed }) => [
              styles.profileBadge,
              pressed &&
                styles.profileBadgePressed,
            ]}
          >
            <Text style={styles.profileInitials}>
              KM
            </Text>
          </Pressable>
        </View>

        {/* =====================================================
            LIVE MAP
        ===================================================== */}

        <View style={styles.mapCard}>
          {/* MAP HEADER */}

          <View style={styles.mapTopBar}>
            <View style={styles.mapTitleArea}>
              <View style={styles.liveIcon}>
                <Radio
                  size={17}
                  color={COLORS.white}
                  strokeWidth={2.2}
                />
              </View>

              <View>
                <Text style={styles.mapTitle}>
                  Live emergency coverage
                </Text>

                <Text style={styles.mapSubtitle}>
                  Responders near your location
                </Text>
              </View>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.liveBadgeDot} />

              <Text style={styles.liveBadgeText}>
                LIVE
              </Text>
            </View>
          </View>

          {/* MAP */}

          <View style={styles.mapContainer}>
            {/* Map background */}

            <View style={styles.mapBackground}>
              {/* Horizontal roads */}

              <View
                style={[
                  styles.mapRoad,
                  {
                    top: 35,
                    transform: [
                      { rotate: "-8deg" },
                    ],
                  },
                ]}
              />

              <View
                style={[
                  styles.mapRoad,
                  {
                    top: 95,
                    transform: [
                      { rotate: "7deg" },
                    ],
                  },
                ]}
              />

              <View
                style={[
                  styles.mapRoad,
                  {
                    top: 145,
                    transform: [
                      { rotate: "-5deg" },
                    ],
                  },
                ]}
              />

              {/* Vertical roads */}

              <View
                style={[
                  styles.mapRoadVertical,
                  {
                    left: 55,
                    transform: [
                      { rotate: "12deg" },
                    ],
                  },
                ]}
              />

              <View
                style={[
                  styles.mapRoadVertical,
                  {
                    left: 155,
                    transform: [
                      { rotate: "-10deg" },
                    ],
                  },
                ]}
              />

              <View
                style={[
                  styles.mapRoadVertical,
                  {
                    right: 55,
                    transform: [
                      { rotate: "7deg" },
                    ],
                  },
                ]}
              />

              {/* Main road */}

              <View
                style={[
                  styles.mainRoad,
                  {
                    transform: [
                      { rotate: "-18deg" },
                    ],
                  },
                ]}
              />

              {/* Map blocks */}

              <View
                style={[
                  styles.mapBlock,
                  {
                    top: 20,
                    left: 25,
                    width: 75,
                    height: 45,
                  },
                ]}
              />

              <View
                style={[
                  styles.mapBlock,
                  {
                    top: 72,
                    right: 18,
                    width: 85,
                    height: 45,
                  },
                ]}
              />

              <View
                style={[
                  styles.mapBlock,
                  {
                    bottom: 18,
                    left: 20,
                    width: 90,
                    height: 50,
                  },
                ]}
              />

              <View
                style={[
                  styles.mapBlock,
                  {
                    bottom: 25,
                    right: 25,
                    width: 70,
                    height: 45,
                  },
                ]}
              />

              {/* Green area */}

              <View style={styles.greenArea}>
                <View style={styles.greenTree} />
                <View style={styles.greenTreeTwo} />
                <View style={styles.greenTreeThree} />
              </View>

              {/* Map labels */}

              <Text
                style={[
                  styles.mapLabel,
                  {
                    top: 24,
                    left: 115,
                  },
                ]}
              >
                KILIMANI
              </Text>

              <Text
                style={[
                  styles.mapLabelSmall,
                  {
                    bottom: 18,
                    right: 105,
                  },
                ]}
              >
                WOOD AVE
              </Text>

              <Text
                style={[
                  styles.mapLabelSmall,
                  {
                    top: 108,
                    left: 24,
                  },
                ]}
              >
                DENIS PRITT
              </Text>

              {/* Coverage circle */}

              <View style={styles.coverageOuter}>
                <View style={styles.coverageMiddle}>
                  <View style={styles.coverageInner} />
                </View>
              </View>

              {/* =================================================
                  USER LOCATION
              ================================================= */}

              <View style={styles.userLocationMarker}>
                <View style={styles.userLocationPulse} />

                <View
                  style={styles.userLocationDot}
                />

                <View style={styles.userLocationLabel}>
                  <Text
                    style={styles.userLocationText}
                  >
                    YOU
                  </Text>
                </View>
              </View>

              {/* =================================================
                  AMBULANCE MARKER
              ================================================= */}

              <View style={styles.ambulanceMarker}>
                <View
                  style={
                    styles.responderMarkerWhite
                  }
                >
                  <Ambulance
                    size={17}
                    color={COLORS.primary}
                    strokeWidth={2.4}
                  />
                </View>

                <View
                  style={styles.markerLabel}
                >
                  <Text
                    style={styles.markerLabelText}
                  >
                    3.5 min
                  </Text>
                </View>
              </View>

              {/* =================================================
                  FIRE ENGINE MARKER
              ================================================= */}

              <View style={styles.fireMarker}>
                <View
                  style={[
                    styles.responderMarkerWhite,
                    {
                      borderColor:
                        "#FDE68A",
                    },
                  ]}
                >
                  <Flame
                    size={17}
                    color={COLORS.amber}
                    strokeWidth={2.4}
                  />
                </View>

                <View
                  style={[
                    styles.markerLabel,
                    {
                      backgroundColor:
                        COLORS.amber,
                    },
                  ]}
                >
                  <Text
                    style={styles.markerLabelText}
                  >
                    FIRE · 5.2 min
                  </Text>
                </View>
              </View>

              {/* =================================================
                  MAP CONTROLS
              ================================================= */}

              <View style={styles.mapControls}>
                <Pressable
                  style={styles.mapControlButton}
                >
                  <LocateFixed
                    size={18}
                    color={COLORS.slate700}
                    strokeWidth={2.2}
                  />
                </Pressable>
              </View>

              {/* MAP STATUS */}

              <View style={styles.mapStatus}>
                <View style={styles.mapStatusDot} />

                <Text style={styles.mapStatusText}>
                  Coverage active
                </Text>
              </View>
            </View>
          </View>

          {/* =====================================================
              MAP SUMMARY
          ===================================================== */}

          <View style={styles.mapSummary}>
            <View style={styles.coverageSummary}>
              <View
                style={styles.coverageSummaryIcon}
              >
                <ShieldCheck
                  size={17}
                  color={COLORS.success}
                  strokeWidth={2.3}
                />
              </View>

              <View>
                <Text
                  style={
                    styles.coverageSummaryTitle
                  }
                >
                  Excellent coverage
                </Text>

                <Text
                  style={
                    styles.coverageSummaryText
                  }
                >
                  2 responders within 2 km
                </Text>
              </View>
            </View>

            <View style={styles.responseTime}>
              <Clock3
                size={15}
                color={COLORS.primary}
                strokeWidth={2.2}
              />

              <View>
                <Text
                  style={styles.responseTimeValue}
                >
                  &lt; 6 min
                </Text>

                <Text
                  style={styles.responseTimeLabel}
                >
                  Estimated
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* =====================================================
            QUICK EMERGENCY ACTION
        ===================================================== */}

          

 
       

        {/* =====================================================
            RESPONDER SECTION
        ===================================================== */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Nearby responders
            </Text>

            <Text style={styles.sectionSubtitle}>
              Live availability around you
            </Text>
          </View>

          <View style={styles.activeBadge}>
            <View style={styles.activeBadgeDot} />

            <Text style={styles.activeBadgeText}>
              {units.length} Active
            </Text>
          </View>
        </View>

        {/* =====================================================
            RESPONDER CARDS
        ===================================================== */}

        <View style={styles.unitsList}>
          {units.map((unit) => {
            const unitColors =
              getUnitColors(unit.kind);

            return (
              <View
                key={unit.id}
                style={[
                  styles.unitCard,
                  {
                    borderColor:
                      unitColors.border,
                  },
                ]}
              >
                {/* UNIT HEADER */}

                <View style={styles.unitHeader}>
                  <View
                    style={[
                      styles.unitIconBadge,
                      {
                        backgroundColor:
                          unitColors.background,
                      },
                    ]}
                  >
                    {getUnitIcon(unit.kind)}
                  </View>

                  <View style={styles.unitMeta}>
                    <Text
                      style={styles.unitName}
                      numberOfLines={1}
                    >
                      {unit.name}
                    </Text>

                    <View
                      style={
                        styles.unitLocationRow
                      }
                    >
                      <MapPin
                        size={12}
                        color={COLORS.slate400}
                        strokeWidth={2}
                      />

                      <Text
                        style={styles.unitStation}
                        numberOfLines={1}
                      >
                        {unit.station}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.unitStatusPill
                    }
                  >
                    <View
                      style={
                        styles.unitStatusDot
                      }
                    />

                    <Text
                      style={
                        styles.unitStatusText
                      }
                    >
                      {unit.status}
                    </Text>
                  </View>
                </View>

                {/* UNIT TYPE */}

                <View style={styles.unitTypeRow}>
                  {unit.kind === "Ambulance" ? (
                    <Ambulance
                      size={13}
                      color={COLORS.primary}
                      strokeWidth={2.2}
                    />
                  ) : (
                    <Flame
                      size={13}
                      color={COLORS.amber}
                      strokeWidth={2.2}
                    />
                  )}

                  <Text
                    style={[
                      styles.unitTypeText,
                      {
                        color:
                          unitColors.icon,
                      },
                    ]}
                  >
                    {unit.kind}
                  </Text>

                  <View
                    style={
                      styles.typeDivider
                    }
                  />

                  <Text
                    style={styles.unitVehicle}
                    numberOfLines={1}
                  >
                    {unit.vehicle}
                  </Text>
                </View>

                {/* =================================================
                    TELEMETRY
                ================================================= */}

                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Clock3
                      size={14}
                      color={COLORS.primary}
                      strokeWidth={2.2}
                    />

                    <Text
                      style={styles.statLabel}
                    >
                      ETA
                    </Text>

                    <Text
                      style={[
                        styles.statValue,
                        styles.statValuePrimary,
                      ]}
                    >
                      {unit.eta}
                    </Text>
                  </View>

                  <View style={styles.statBox}>
                    <MapPin
                      size={14}
                      color={COLORS.slate500}
                      strokeWidth={2.2}
                    />

                    <Text
                      style={styles.statLabel}
                    >
                      DISTANCE
                    </Text>

                    <Text
                      style={styles.statValue}
                    >
                      {unit.distance}
                    </Text>
                  </View>

                  <View style={styles.statBox}>
                    <UsersRound
                      size={14}
                      color={COLORS.slate500}
                      strokeWidth={2.2}
                    />

                    <Text
                      style={styles.statLabel}
                    >
                      CREW
                    </Text>

                    <Text
                      style={styles.statValue}
                    >
                      {unit.crew}
                    </Text>
                  </View>

                  <View style={styles.statBox}>
                    <Truck
                      size={14}
                      color={COLORS.slate500}
                      strokeWidth={2.2}
                    />

                    <Text
                      style={styles.statLabel}
                    >
                      UNIT
                    </Text>

                    <Text
                      style={styles.statValue}
                    >
                      {unit.kind ===
                      "Fire Engine"
                        ? "FE-04"
                        : "ALS-01"}
                    </Text>
                  </View>
                </View>

                {/* REQUEST */}

                <Pressable
                  style={({ pressed }) => [
                    styles.requestButton,
                    pressed &&
                      styles.requestButtonPressed,
                  ]}
                  onPress={() =>
                    router.push("/emergency")
                  }
                >
                  <Text
                    style={
                      styles.requestButtonText
                    }
                  >
                    Request {unit.kind}
                  </Text>

                  <Navigation
                    size={15}
                    color={COLORS.primary}
                    strokeWidth={2.5}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* =====================================================
            BOTTOM INFO
        ===================================================== */}

        <View style={styles.infoCard}>
          <ShieldCheck
            size={18}
            color={COLORS.success}
            strokeWidth={2.2}
          />

          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>
              SafeSync protection is active
            </Text>

            <Text style={styles.infoText}>
              Your location is ready to be shared with
              an assigned responder when you request
              emergency assistance.
            </Text>
          </View>
        </View>

        {/* =====================================================
            BOTTOM SPACING
        ===================================================== */}

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     MAIN
  ======================================================= */

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  greetingSmall: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.slate500,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  greetingTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.7,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  locationIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
  },

  locationText: {
    fontSize: 12,
    color: COLORS.slate600,
    fontWeight: "600",
  },

  gpsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successLight,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 7,
  },

  gpsDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },

  gpsText: {
    fontSize: 9,
    color: COLORS.success,
    fontWeight: "800",
  },

  profileBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.slate900,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 7,
    elevation: 3,
  },

  profileBadgePressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },

  profileInitials: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 14,
  },

  /* =======================================================
     MAP CARD
  ======================================================= */

  mapCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  mapTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 13,
  },

  mapTitleArea: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  liveIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: COLORS.slate900,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  mapTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.slate900,
  },

  mapSubtitle: {
    fontSize: 10,
    color: COLORS.slate500,
    marginTop: 2,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },

  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },

  liveBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.success,
    letterSpacing: 0.4,
  },

  /* =======================================================
     MAP
  ======================================================= */

  mapContainer: {
    height: 250,
  },

  mapBackground: {
    flex: 1,
    backgroundColor: "#E8EEF1",
    position: "relative",
    overflow: "hidden",
  },

  mapRoad: {
    position: "absolute",
    width: "125%",
    height: 8,
    backgroundColor: COLORS.white,
    left: "-10%",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.mapRoad,
  },

  mapRoadVertical: {
    position: "absolute",
    width: 7,
    height: "130%",
    top: "-15%",
    backgroundColor: COLORS.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.mapRoad,
  },

  mainRoad: {
    position: "absolute",
    width: "135%",
    height: 15,
    backgroundColor: "#FFFFFF",
    left: "-20%",
    top: 110,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.mapRoadMain,
  },

  mapBlock: {
    position: "absolute",
    backgroundColor: "#DCE5E7",
    borderRadius: 5,
    opacity: 0.8,
  },

  greenArea: {
    position: "absolute",
    width: 105,
    height: 65,
    borderRadius: 40,
    backgroundColor: "#D9E9D9",
    left: 115,
    bottom: 12,
    opacity: 0.9,
  },

  greenTree: {
    position: "absolute",
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#A8CBA8",
    top: 16,
    left: 22,
  },

  greenTreeTwo: {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#A8CBA8",
    top: 35,
    left: 51,
  },

  greenTreeThree: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#A8CBA8",
    top: 14,
    right: 18,
  },

  mapLabel: {
    position: "absolute",
    fontSize: 8,
    fontWeight: "900",
    color: "#718096",
    letterSpacing: 1,
  },

  mapLabelSmall: {
    position: "absolute",
    fontSize: 7,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.6,
  },

  /* =======================================================
     COVERAGE
  ======================================================= */

  coverageOuter: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(225, 29, 72, 0.035)",
    borderWidth: 1,
    borderColor: "rgba(225, 29, 72, 0.13)",
    alignItems: "center",
    justifyContent: "center",
    top: 30,
    left: "50%",
    marginLeft: -95,
  },

  coverageMiddle: {
    width: 125,
    height: 125,
    borderRadius: 63,
    backgroundColor: "rgba(225, 29, 72, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(225, 29, 72, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  coverageInner: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: "rgba(225, 29, 72, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(225, 29, 72, 0.18)",
  },

  /* =======================================================
     USER LOCATION
  ======================================================= */

  userLocationMarker: {
    position: "absolute",
    top: 105,
    left: "50%",
    marginLeft: -13,
    alignItems: "center",
  },

  userLocationPulse: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(225, 29, 72, 0.12)",
    top: -8,
    left: -8,
  },

  userLocationDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    borderWidth: 4,
    borderColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  userLocationLabel: {
    marginTop: 4,
    backgroundColor: COLORS.slate900,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },

  userLocationText: {
    color: COLORS.white,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  /* =======================================================
     RESPONDER MARKERS
  ======================================================= */

  ambulanceMarker: {
    position: "absolute",
    top: 57,
    left: "24%",
    alignItems: "center",
  },

  fireMarker: {
    position: "absolute",
    bottom: 38,
    right: "20%",
    alignItems: "center",
  },

  responderMarkerWhite: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: "#FECDD3",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  markerLabel: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  markerLabelText: {
    color: COLORS.white,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  /* =======================================================
     MAP CONTROLS
  ======================================================= */

  mapControls: {
    position: "absolute",
    right: 12,
    top: 12,
  },

  mapControlButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  mapStatus: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },

  mapStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },

  mapStatusText: {
    fontSize: 9,
    color: COLORS.slate700,
    fontWeight: "800",
  },

  /* =======================================================
     MAP SUMMARY
  ======================================================= */

  mapSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
  },

  coverageSummary: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  coverageSummaryIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: COLORS.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  coverageSummaryTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.slate900,
  },

  coverageSummaryText: {
    fontSize: 10,
    color: COLORS.slate500,
    marginTop: 2,
  },

  responseTime: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.slate200,
  },

  responseTimeValue: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.primary,
    marginLeft: 6,
  },

  responseTimeLabel: {
    fontSize: 9,
    color: COLORS.slate500,
    marginLeft: 6,
    marginTop: 1,
  },

  /* =======================================================
     EMERGENCY ACTION
  ======================================================= */

  emergencyAction: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 4,
  },

  emergencyActionPressed: {
    backgroundColor: COLORS.primaryDark,
    transform: [{ scale: 0.99 }],
  },

  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  emergencyText: {
    flex: 1,
  },

  emergencyTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.white,
  },

  emergencySubtitle: {
    fontSize: 10,
    color: "#FFE4E6",
    marginTop: 3,
  },

  /* =======================================================
     SECTION
  ======================================================= */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.slate900,
    letterSpacing: -0.4,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
  },

  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },

  activeBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },

  activeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.success,
  },

  /* =======================================================
     UNIT LIST
  ======================================================= */

  unitsList: {
    gap: 13,
  },

  unitCard: {
    backgroundColor: COLORS.card,
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 2,
  },

  unitHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  unitIconBadge: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  unitMeta: {
    flex: 1,
    minWidth: 0,
  },

  unitName: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.slate900,
  },

  unitLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  unitStation: {
    fontSize: 10,
    color: COLORS.slate500,
    marginLeft: 3,
    flex: 1,
  },

  unitStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 5,
  },

  unitStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 4,
  },

  unitStatusText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.success,
  },

  /* =======================================================
     UNIT TYPE
  ======================================================= */

  unitTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
  },

  unitTypeText: {
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 5,
  },

  typeDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.slate300,
    marginHorizontal: 7,
  },

  unitVehicle: {
    flex: 1,
    fontSize: 10,
    color: COLORS.slate500,
  },

  /* =======================================================
     STATS
  ======================================================= */

  statsGrid: {
    flexDirection: "row",
    gap: 7,
    marginTop: 11,
  },

  statBox: {
    flex: 1,
    backgroundColor: COLORS.slate100,
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    minWidth: 0,
  },

  statLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.slate500,
    letterSpacing: 0.2,
    marginTop: 3,
  },

  statValue: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.slate900,
    marginTop: 2,
  },

  statValuePrimary: {
    color: COLORS.primary,
    fontSize: 13,
  },

  /* =======================================================
     REQUEST BUTTON
  ======================================================= */

  requestButton: {
    marginTop: 12,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  requestButtonPressed: {
    backgroundColor: "#FFE4E6",
  },

  requestButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.primary,
  },

  /* =======================================================
     INFO CARD
  ======================================================= */

  infoCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.successLight,
    borderRadius: 15,
    padding: 13,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },

  infoTextContainer: {
    flex: 1,
    marginLeft: 9,
  },

  infoTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#065F46",
  },

  infoText: {
    fontSize: 10,
    lineHeight: 15,
    color: "#047857",
    marginTop: 3,
  },
});