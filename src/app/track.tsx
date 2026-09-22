import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// ============================================================
// TYPES
// ============================================================

type TimelineItem = {
  label: string;
  detail: string;
};

// ============================================================
// COLORS
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
};

// ============================================================
// TRACKING TIMELINE
// ============================================================

const trackingTimeline: TimelineItem[] = [
  {
    label: "Emergency reported",
    detail: "Your emergency request has been received.",
  },
  {
    label: "Responder dispatched",
    detail: "A responder has been assigned to your emergency.",
  },
  {
    label: "Responder en route",
    detail: "The responder is travelling to your location.",
  },
  {
    label: "Approaching location",
    detail: "The responder is getting closer to you.",
  },
  {
    label: "Responder arrived",
    detail: "The responder has arrived at your location.",
  },
];

// ============================================================
// MAIN SCREEN
// ============================================================

export default function TrackScreen() {
  const router = useRouter();

  // ----------------------------------------------------------
  // GET EMERGENCY TYPE
  // ----------------------------------------------------------

  const params = useLocalSearchParams<{
    type?: string | string[];
  }>();

  const emergencyType =
    typeof params.type === "string" && params.type.trim().length > 0
      ? params.type
      : "Emergency";

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [stage, setStage] = useState(0);
  const [eta, setEta] = useState(5);

  // ----------------------------------------------------------
  // ARRIVAL STATUS
  // ----------------------------------------------------------

  const isArrived =
    eta === 0 || stage === trackingTimeline.length - 1;

  // ----------------------------------------------------------
  // SIMULATE RESPONDER PROGRESS
  // ----------------------------------------------------------

  useEffect(() => {
    const totalSteps = trackingTimeline.length - 1;

    const interval = setInterval(() => {
      setStage((currentStage) => {
        if (currentStage >= totalSteps) {
          return currentStage;
        }

        return currentStage + 1;
      });

      setEta((currentEta) => {
        return Math.max(currentEta - 1, 0);
      });
    }, 6000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ==========================================================
  // CALL RESPONDER
  // ==========================================================

  const handleCall = async () => {
    try {
      await Linking.openURL("tel:+254700000000");
    } catch {
      Alert.alert(
        "Unable to call",
        "Your device could not open the phone application."
      );
    }
  };

  // ==========================================================
  // MESSAGE RESPONDER
  // ==========================================================

  const handleMessage = async () => {
    try {
      await Linking.openURL("sms:+254700000000");
    } catch {
      Alert.alert(
        "Unable to message",
        "Your device could not open the messaging application."
      );
    }
  };

  // ==========================================================
  // SHARE LIVE LOCATION
  // ==========================================================

  const handleShareLocation = async () => {
    try {
      await Share.share({
        message:
          `I am currently being assisted through SafeSync.\n\n` +
          `Emergency: ${emergencyType}\n` +
          `Incident: INC-10502\n` +
          `My emergency response is being tracked live.`,
      });
    } catch {
      // User cancelled sharing.
    }
  };

  // ==========================================================
  // NOTIFY EMERGENCY CONTACTS
  // ==========================================================

  const handleNotifyContacts = () => {
    Alert.alert(
      "Emergency Contacts",
      "Your emergency contacts have been notified with your emergency status and location."
    );
  };

  // ==========================================================
  // CANCEL EMERGENCY
  // ==========================================================

  const handleCancel = () => {
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
          onPress: () => {
            router.replace("/home");
          },
        },
      ]
    );
  };

  // ==========================================================
  // RETURN TO HOME
  // ==========================================================

  const handleBackToHome = () => {
    router.replace("/home");
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================
            HEADER / STATUS
        ================================================== */}

        <View style={styles.statusCard}>
          {/* Ambulance Icon */}
          <View style={styles.ambulanceCircle}>
            <MaterialCommunityIcons
              name="ambulance"
              size={23}
              color={COLORS.white}
            />
          </View>

          {/* Status Information */}
          <View style={styles.statusInformation}>
            <Text
              style={styles.statusTitle}
              numberOfLines={1}
            >
              {emergencyType}
            </Text>

            <Text
              style={styles.statusSubtitle}
              numberOfLines={1}
            >
              Incident INC-10502 ·{" "}
              {isArrived
                ? "response complete"
                : "live tracking"}
            </Text>
          </View>

          {/* LIVE Badge */}
          <View
            style={[
              styles.liveBadge,
              isArrived && styles.arrivedBadge,
            ]}
          >
            <View
              style={[
                styles.liveDot,
                isArrived && styles.arrivedDot,
              ]}
            />

            <Text style={styles.liveBadgeText}>
              {isArrived ? "ARRIVED" : "LIVE"}
            </Text>
          </View>
        </View>

        {/* ==================================================
            MAP
        ================================================== */}

        <View style={styles.mapContainer}>
          <View style={styles.mapBackground}>
            {/* Map roads */}

            <View
              style={[
                styles.road,
                styles.roadOne,
              ]}
            />

            <View
              style={[
                styles.road,
                styles.roadTwo,
              ]}
            />

            <View
              style={[
                styles.road,
                styles.roadThree,
              ]}
            />

            <View
              style={[
                styles.road,
                styles.roadFour,
              ]}
            />

            <View
              style={[
                styles.road,
                styles.roadFive,
              ]}
            />

            {/* Map blocks */}

            <View
              style={[
                styles.mapBlock,
                styles.blockOne,
              ]}
            />

            <View
              style={[
                styles.mapBlock,
                styles.blockTwo,
              ]}
            />

            <View
              style={[
                styles.mapBlock,
                styles.blockThree,
              ]}
            />

            <View
              style={[
                styles.mapBlock,
                styles.blockFour,
              ]}
            />

            {/* ==================================================
                USER LOCATION
            ================================================== */}

            <View style={styles.userLocation}>
              <View style={styles.userLocationPulse} />

              <View style={styles.userLocationOuter}>
                <View style={styles.userLocationInner} />
              </View>
            </View>

            {/* ==================================================
                RESPONDER
            ================================================== */}

            {!isArrived && (
              <View
                style={[
                  styles.vehicleMarker,
                  {
                    left: `${20 + stage * 15}%`,
                    top: `${67 - stage * 11}%`,
                  },
                ]}
              >
                <View style={styles.vehiclePulse} />

                <View style={styles.vehicleCircle}>
                  <MaterialCommunityIcons
                    name="ambulance"
                    size={18}
                    color={COLORS.white}
                  />
                </View>
              </View>
            )}

            {/* Destination */}

            <View style={styles.destinationMarker}>
              <Ionicons
                name="location"
                size={18}
                color={COLORS.white}
              />
            </View>

            {/* Map labels */}

            <View style={styles.mapLabelUpperHill}>
              <Text style={styles.mapLabelText}>
                Upper Hill
              </Text>
            </View>

            <View style={styles.mapLabelNairobi}>
              <Text style={styles.mapLabelText}>
                Nairobi
              </Text>
            </View>

            <View style={styles.mapLabelLocation}>
              <Text style={styles.mapLocationText}>
                Your Location
              </Text>
            </View>

            {/* Map status */}

            <View style={styles.mapStatus}>
              <Ionicons
                name="navigate"
                size={14}
                color={COLORS.primary}
              />

              <Text style={styles.mapStatusText}>
                {isArrived
                  ? "Responder arrived"
                  : "Responder tracking live"}
              </Text>
            </View>
          </View>
        </View>

        {/* ==================================================
            ETA / DETAILS CARD
        ================================================== */}

        <View style={styles.detailsCard}>
          {/* Metrics */}

          <View style={styles.metricsRow}>
            <Metric
              label="ETA"
              value={
                isArrived
                  ? "Arrived"
                  : `${eta} min`
              }
              emphasis
            />

            <Metric
              label="Distance"
              value={
                isArrived
                  ? "0.0 km"
                  : `${(eta * 0.3).toFixed(1)} km`
              }
            />

            <Metric
              label="Unit"
              value="KDA 241X"
            />
          </View>

          {/* ==================================================
              RESPONDER CARD
          ================================================== */}

          <View style={styles.responderCard}>
            {/* Avatar */}

            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                AM
              </Text>
            </View>

            {/* Information */}

            <View style={styles.responderInfo}>
              <Text
                style={styles.responderName}
                numberOfLines={1}
              >
                A. Mwangi · Paramedic
              </Text>

              <Text
                style={styles.responderStation}
                numberOfLines={2}
              >
                Nairobi Hospital Station,
                Upper Hill
              </Text>

              <View style={styles.verifiedRow}>
                <View style={styles.verifiedDot} />

                <Text style={styles.verifiedText}>
                  Verified responder
                </Text>
              </View>
            </View>

            {/* Contact Buttons */}

            <View style={styles.contactButtons}>
              <Pressable
                style={styles.callButton}
                onPress={handleCall}
              >
                <Ionicons
                  name="call"
                  size={18}
                  color={COLORS.white}
                />
              </Pressable>

              <Pressable
                style={styles.messageButton}
                onPress={handleMessage}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color={COLORS.primary}
                />
              </Pressable>
            </View>
          </View>

          {/* ==================================================
              EMERGENCY INFORMATION
          ================================================== */}

          <View style={styles.emergencyInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Emergency
              </Text>

              <Text style={styles.infoValue}>
                {emergencyType}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Incident ID
              </Text>

              <Text style={styles.infoValue}>
                INC-10502
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Location
              </Text>

              <Text
                style={[
                  styles.infoValue,
                  styles.locationValue,
                ]}
                numberOfLines={1}
              >
                Wood Avenue, Kilimani
              </Text>
            </View>
          </View>

          {/* ==================================================
              TIMELINE
          ================================================== */}

          <View style={styles.timeline}>
            <Text style={styles.timelineHeading}>
              Response Progress
            </Text>

            {trackingTimeline.map(
              (item, index) => {
                const done = index <= stage;

                const current =
                  index === stage && !isArrived;

                const isLast =
                  index ===
                  trackingTimeline.length - 1;

                return (
                  <View
                    key={item.label}
                    style={styles.timelineItem}
                  >
                    {/* Timeline left */}

                    <View
                      style={styles.timelineLeft}
                    >
                      <View
                        style={[
                          styles.timelineCircle,
                          done &&
                            styles.timelineCircleDone,
                          current &&
                            styles.timelineCircleCurrent,
                        ]}
                      >
                        {done ? (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={COLORS.white}
                          />
                        ) : (
                          <View
                            style={
                              styles.emptyDot
                            }
                          />
                        )}
                      </View>

                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            index < stage &&
                              styles.timelineLineDone,
                          ]}
                        />
                      )}
                    </View>

                    {/* Timeline content */}

                    <View
                      style={styles.timelineContent}
                    >
                      <View
                        style={
                          styles.timelineTitleRow
                        }
                      >
                        <Text
                          style={[
                            styles.timelineTitle,
                            !done &&
                              styles.timelineTitleInactive,
                          ]}
                        >
                          {item.label}
                        </Text>

                        {current && (
                          <View
                            style={
                              styles.currentBadge
                            }
                          >
                            <Text
                              style={
                                styles.currentBadgeText
                              }
                            >
                              CURRENT
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={
                          styles.timelineDetail
                        }
                      >
                        {item.detail}
                      </Text>
                    </View>
                  </View>
                );
              }
            )}
          </View>

          {/* ==================================================
              SHARE LOCATION
          ================================================== */}

          <Pressable
            style={styles.actionButton}
            onPress={handleShareLocation}
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
                Share Live Location
              </Text>

              <Text style={styles.actionSubtitle}>
                Send your emergency tracking
                status to someone
              </Text>
            </View>
          </Pressable>

          {/* ==================================================
              NOTIFY CONTACTS
          ================================================== */}

          <Pressable
            style={styles.actionButton}
            onPress={handleNotifyContacts}
          >
            <View style={styles.actionIcon}>
              <Ionicons
                name="people-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>
                Notify Emergency Contacts
              </Text>

              <Text style={styles.actionSubtitle}>
                Send your current emergency
                status to your contacts
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ==================================================
            ARRIVED / CANCEL
        ================================================== */}

        {isArrived ? (
          <Pressable
            style={styles.dashboardButton}
            onPress={handleBackToHome}
          >
            <Text
              style={styles.dashboardButtonText}
            >
              RETURN TO HOME
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Ionicons
              name="close"
              size={18}
              color={COLORS.muted}
            />

            <Text style={styles.cancelText}>
              Cancel Request
            </Text>
          </Pressable>
        )}
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
          emphasis &&
            styles.metricValueEmphasis,
        ]}
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
  // ========================================================
  // GENERAL
  // ========================================================

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
  // STATUS
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
    shadowOffset: {
      width: 0,
      height: 3,
    },
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
  },

  mapBackground: {
    flex: 1,
    backgroundColor: "#E6ECE4",
    position: "relative",
    overflow: "hidden",
  },

  road: {
    position: "absolute",
    backgroundColor: COLORS.white,
    borderRadius: 30,
    opacity: 0.9,
  },

  roadOne: {
    width: "130%",
    height: 25,
    top: "42%",
    left: "-12%",
    transform: [
      {
        rotate: "-15deg",
      },
    ],
  },

  roadTwo: {
    width: "125%",
    height: 18,
    top: "63%",
    left: "-12%",
    transform: [
      {
        rotate: "28deg",
      },
    ],
  },

  roadThree: {
    width: "17%",
    height: "125%",
    left: "46%",
    top: "-12%",
    transform: [
      {
        rotate: "22deg",
      },
    ],
  },

  roadFour: {
    width: "12%",
    height: "125%",
    left: "73%",
    top: "-12%",
    transform: [
      {
        rotate: "-20deg",
      },
    ],
  },

  roadFive: {
    width: "115%",
    height: 14,
    top: "23%",
    left: "-8%",
    transform: [
      {
        rotate: "8deg",
      },
    ],
  },

  mapBlock: {
    position: "absolute",
    backgroundColor: "#DCE4D8",
    borderRadius: 8,
  },

  blockOne: {
    width: 65,
    height: 45,
    top: 25,
    left: 20,
  },

  blockTwo: {
    width: 75,
    height: 55,
    top: 70,
    right: 20,
  },

  blockThree: {
    width: 60,
    height: 50,
    bottom: 35,
    right: 40,
  },

  blockFour: {
    width: 80,
    height: 50,
    bottom: 55,
    left: 20,
  },

  // ========================================================
  // USER LOCATION
  // ========================================================

  userLocation: {
    position: "absolute",
    left: "17%",
    top: "70%",
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  userLocationPulse: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(22,163,74,0.18)",
  },

  userLocationOuter: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.success,
  },

  userLocationInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.success,
  },

  // ========================================================
  // RESPONDER
  // ========================================================

  vehicleMarker: {
    position: "absolute",
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  destinationMarker: {
    position: "absolute",
    left: "79%",
    top: "26%",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  // ========================================================
  // MAP LABELS
  // ========================================================

  mapLabelUpperHill: {
    position: "absolute",
    top: 32,
    left: 28,
  },

  mapLabelNairobi: {
    position: "absolute",
    right: 30,
    top: 95,
  },

  mapLabelLocation: {
    position: "absolute",
    left: "10%",
    bottom: "18%",
  },

  mapLabelText: {
    fontSize: 10,
    color: "#596158",
    fontWeight: "700",
  },

  mapLocationText: {
    fontSize: 9,
    color: COLORS.success,
    fontWeight: "800",
  },

  // ========================================================
  // MAP STATUS
  // ========================================================

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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
    shadowOffset: {
      width: 0,
      height: 0,
    },
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

  // ========================================================
  // HOME BUTTON
  // ========================================================

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