import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import {
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  const nearbyUnits = [
    {
      id: "ambulance-001",
      name: "Nearest Ambulance",
      kind: "Ambulance",
      station: "Nairobi Hospital Station, Upper Hill",
      status: "Available",
      eta: "5 min",
      distance: "1.5 km",
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
      crew: 6,
      vehicle: "KDB 912F",
      latitude: -1.2676,
      longitude: 36.8108,
    },
  ];

  const userLocation = {
    latitude: -1.2921,
    longitude: 36.8219,
  };

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
            You are covered at Kilimani, Nairobi · GPS accuracy 6 m
          </Text>
        </View>

        {/* MAP */}
        <View style={styles.mapCard}>
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }}
              showsUserLocation
              showsMyLocationButton
              mapType="standard"
            >
              {/* User location */}
              <Marker
                coordinate={userLocation}
                title="Your location"
                description="Kilimani, Nairobi"
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
          </View>

          {/* Map information */}
          <View style={styles.mapFooter}>
            <View style={styles.mapFooterInfo}>
              <Text style={styles.mapFooterTitle}>
                {nearbyUnits.length} units available within 2 km
              </Text>

              <Text style={styles.mapFooterSubtitle}>
                Coverage: excellent
              </Text>
            </View>

            <View style={styles.protectedBadge}>
              <Text style={styles.protectedText}>
                Protected
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
            <View
              key={unit.id}
              style={styles.responderCard}
            >
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
                <Stat
                  label="ETA"
                  value={unit.eta}
                  emphasis
                />

                <Stat
                  label="DISTANCE"
                  value={unit.distance}
                />

                <Stat
                  label="CREW SIZE"
                  value={`${unit.crew}`}
                />

                <Stat
                  label="VEHICLE"
                  value={unit.vehicle}
                />
              </View>

              {/* Request */}
              <TouchableOpacity
                style={styles.requestButton}
                activeOpacity={0.8}
                onPress={() => router.push}
              >
                <Text style={styles.requestButtonText}>
                  Request
                </Text>
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
      <Text style={styles.metricLabel}>
        {label}
      </Text>

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

  metricBoxInner: {
    backgroundColor: "#F8FAFC",
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