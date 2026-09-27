import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

/* =========================================================
   API
========================================================= */

// Point this at wherever your FastAPI backend is served from.
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.safesync.co.ke";

// TODO: wire this up to however SafeSync already stores the signed-in
// admin's Supabase session (e.g. `supabase.auth.getSession()`, or a
// token kept in AsyncStorage/SecureStore). It just needs to resolve to
// the current access token so requests below can send
// `Authorization: Bearer <token>`.
async function getAccessToken(): Promise<string | null> {
  return null;
}

class ApiError extends Error {}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.detail ?? `Something went wrong (${response.status}).`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/* =========================================================
   TYPES
   These mirror VehicleResponse / VehicleTypeResponse /
   ResponderResponse+email from the backend.
========================================================= */

type VehicleKind = "Ambulance" | "Fire Engine";

const VEHICLE_TYPE_CODES: Record<VehicleKind, string> = {
  Ambulance: "AMBULANCE",
  "Fire Engine": "FIRE_ENGINE",
};

type VehicleType = {
  id: string;
  code: string;
  name: string;
};

type Vehicle = {
  id: string;
  branch_id: string;
  vehicle_type_id: string;
  registration_number: string;
  status: string;
};

type Driver = {
  id: string;
  user_id: string;
  branch_id: string;
  responder_type: string;
  verification_status: string;
  status: string;
  badge_number: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function AdminScreen() {
  const router = useRouter();

  /* ---------------------------------------------------------
     STATE — loaded from the backend, not mock data
  --------------------------------------------------------- */

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeTab, setActiveTab] =
    useState<"vehicles" | "drivers">("vehicles");

  /* Vehicle form */

  const [plate, setPlate] = useState("");
  const [vehicleKind, setVehicleKind] =
    useState<VehicleKind>("Ambulance");
  const [addingVehicle, setAddingVehicle] = useState(false);

  /* Driver form */

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [licence, setLicence] = useState("");
  const [creatingDriver, setCreatingDriver] = useState(false);

  /* ---------------------------------------------------------
     LOAD DATA
  --------------------------------------------------------- */

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [vehiclesData, driversData, typesData] = await Promise.all([
        apiFetch<Vehicle[]>("/api/v1/vehicles"),
        apiFetch<Driver[]>("/api/v1/responders"),
        apiFetch<VehicleType[]>("/api/v1/vehicles/types"),
      ]);

      setVehicles(vehiclesData);
      setDrivers(driversData);
      setVehicleTypes(typesData);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load fleet data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const vehicleTypeName = useCallback(
    (vehicleTypeId: string) =>
      vehicleTypes.find((type) => type.id === vehicleTypeId)?.name ??
      "Unknown type",
    [vehicleTypes]
  );

  /* ---------------------------------------------------------
     COMPUTED DATA
  --------------------------------------------------------- */

  // The backend doesn't have a shift API wired up yet — this is a
  // stand-in "online" count based on responder status until it does.
  const onlineDrivers = useMemo(
    () => drivers.filter((driver) => driver.status !== "offline").length,
    [drivers]
  );

  /* ---------------------------------------------------------
     SIGN OUT
  --------------------------------------------------------- */

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          router.replace("/");
        },
      },
    ]);
  };

  /* ---------------------------------------------------------
     ADD VEHICLE
  --------------------------------------------------------- */

  const handleAddVehicle = async () => {
    if (!plate.trim()) {
      Alert.alert(
        "Missing information",
        "Please enter the vehicle plate or unit code."
      );
      return;
    }

    setAddingVehicle(true);

    try {
      const vehicle = await apiFetch<Vehicle>("/api/v1/vehicles", {
        method: "POST",
        body: JSON.stringify({
          vehicle_type_code: VEHICLE_TYPE_CODES[vehicleKind],
          registration_number: plate.trim(),
        }),
      });

      setVehicles((current) => [vehicle, ...current]);
      setPlate("");

      Alert.alert(
        "Vehicle added",
        `${vehicle.registration_number} has been added to the company fleet.`
      );
    } catch (err) {
      Alert.alert(
        "Couldn't add vehicle",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setAddingVehicle(false);
    }
  };

  /* ---------------------------------------------------------
     CREATE DRIVER
  --------------------------------------------------------- */

  const handleCreateDriver = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert(
        "Missing information",
        "First name, last name and email are required."
      );
      return;
    }

    setCreatingDriver(true);

    try {
      const driver = await apiFetch<Driver>("/api/v1/responders/drivers", {
        method: "POST",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          licence_number: licence.trim() || null,
        }),
      });

      setDrivers((current) => [driver, ...current]);

      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setLicence("");

      Alert.alert(
        "Driver created",
        `${driver.first_name} ${driver.last_name}'s account is ready. They can log in with ${driver.email} — SafeSync will email them a verification code.`
      );
    } catch (err) {
      Alert.alert(
        "Couldn't create driver",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setCreatingDriver(false);
    }
  };

  /* ---------------------------------------------------------
     REMOVE (client-side only — no delete endpoints exist yet)
  --------------------------------------------------------- */

  const handleRemoveVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      "Remove vehicle",
      "Vehicle removal isn't wired up to the backend yet — this only hides it locally.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Hide locally",
          style: "destructive",
          onPress: () => {
            setVehicles((current) =>
              current.filter((item) => item.id !== vehicle.id)
            );
          },
        },
      ]
    );
  };

  const handleRemoveDriver = (driver: Driver) => {
    Alert.alert(
      "Remove driver",
      "Driver removal isn't wired up to the backend yet — this only hides it locally.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Hide locally",
          style: "destructive",
          onPress: () => {
            setDrivers((current) =>
              current.filter((item) => item.id !== driver.id)
            );
          },
        },
      ]
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
            </View>

            <View>
              <Text style={styles.headerTitle}>Admin Portal</Text>
              <Text style={styles.headerSubtitle}>SafeSync</Text>
            </View>
          </View>

          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={21} color="#0F172A" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#DC2626" size="large" />
              <Text style={styles.emptySubtitle}>Loading your fleet…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>Couldn't load your data</Text>
              <Text style={styles.emptySubtitle}>{loadError}</Text>
              <Pressable style={styles.primaryButton} onPress={loadData}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* COMPANY SUMMARY */}

              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryTitle}>
                      SafeSync Company Fleet
                    </Text>
                    <Text style={styles.summarySubtitle}>
                      Manage responders, vehicles and driver accounts.
                    </Text>
                  </View>

                  <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>
                      {onlineDrivers} online
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Ionicons name="car-outline" size={22} color="#DC2626" />
                    <Text style={styles.statNumber}>{vehicles.length}</Text>
                    <Text style={styles.statLabel}>Vehicles</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Ionicons
                      name="people-outline"
                      size={22}
                      color="#DC2626"
                    />
                    <Text style={styles.statNumber}>{drivers.length}</Text>
                    <Text style={styles.statLabel}>Drivers</Text>
                  </View>

                  <View style={styles.statBox}>
                    <MaterialCommunityIcons
                      name="radio-tower"
                      size={22}
                      color="#DC2626"
                    />
                    <Text style={styles.statNumber}>{onlineDrivers}</Text>
                    <Text style={styles.statLabel}>Online</Text>
                  </View>
                </View>
              </View>

              {/* LIVE DRIVER STATUS */}

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Live driver status
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Current responder availability
                    </Text>
                  </View>

                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>

                {drivers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="people-outline"
                      size={38}
                      color="#94A3B8"
                    />
                    <Text style={styles.emptyTitle}>No drivers yet</Text>
                    <Text style={styles.emptySubtitle}>
                      Create a driver account below.
                    </Text>
                  </View>
                ) : (
                  drivers.map((driver) => {
                    const isOnline = driver.status !== "offline";

                    return (
                      <View key={driver.id} style={styles.driverStatusRow}>
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor: isOnline
                                ? "#16A34A"
                                : "#CBD5E1",
                            },
                          ]}
                        />

                        <View style={styles.driverStatusInfo}>
                          <Text style={styles.driverStatusName}>
                            {driver.first_name} {driver.last_name}
                          </Text>
                          <Text style={styles.driverStatusUsername}>
                            {driver.email}
                          </Text>
                          <Text style={styles.driverStatusVehicle}>
                            {driver.verification_status === "pending"
                              ? "Verification pending"
                              : "Verified"}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isOnline
                                ? "#DCFCE7"
                                : "#F1F5F9",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: isOnline ? "#15803D" : "#64748B" },
                            ]}
                          >
                            {isOnline ? "Online" : "Offline"}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              {/* TAB NAVIGATION */}

              <View style={styles.tabs}>
                <Pressable
                  onPress={() => setActiveTab("vehicles")}
                  style={[
                    styles.tab,
                    activeTab === "vehicles" && styles.activeTab,
                  ]}
                >
                  <Ionicons
                    name="car-outline"
                    size={20}
                    color={activeTab === "vehicles" ? "#FFFFFF" : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "vehicles" && styles.activeTabText,
                    ]}
                  >
                    Vehicles
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab("drivers")}
                  style={[
                    styles.tab,
                    activeTab === "drivers" && styles.activeTab,
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={activeTab === "drivers" ? "#FFFFFF" : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "drivers" && styles.activeTabText,
                    ]}
                  >
                    Drivers
                  </Text>
                </Pressable>
              </View>

              {/* VEHICLES */}

              {activeTab === "vehicles" && (
                <>
                  <View style={styles.card}>
                    <View style={styles.formTitleRow}>
                      <View style={styles.formIcon}>
                        <Ionicons name="car" size={20} color="#DC2626" />
                      </View>
                      <View>
                        <Text style={styles.sectionTitle}>Add a vehicle</Text>
                        <Text style={styles.sectionSubtitle}>
                          Added to your branch's fleet.
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>Plate / Unit Code</Text>
                    <TextInput
                      style={styles.input}
                      value={plate}
                      onChangeText={setPlate}
                      placeholder="KDA 250X"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                    />

                    <Text style={styles.inputLabel}>Vehicle Type</Text>
                    <View style={styles.typeRow}>
                      {(["Ambulance", "Fire Engine"] as VehicleKind[]).map(
                        (type) => (
                          <Pressable
                            key={type}
                            onPress={() => setVehicleKind(type)}
                            style={[
                              styles.typeButton,
                              vehicleKind === type &&
                                styles.selectedTypeButton,
                            ]}
                          >
                            <Text
                              style={[
                                styles.typeButtonText,
                                vehicleKind === type &&
                                  styles.selectedTypeText,
                              ]}
                            >
                              {type}
                            </Text>
                          </Pressable>
                        )
                      )}
                    </View>

                    <Pressable
                      style={[
                        styles.primaryButton,
                        addingVehicle && styles.primaryButtonDisabled,
                      ]}
                      onPress={handleAddVehicle}
                      disabled={addingVehicle}
                    >
                      {addingVehicle ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name="add-circle-outline"
                            size={21}
                            color="#FFFFFF"
                          />
                          <Text style={styles.primaryButtonText}>
                            Add Vehicle
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                      <View>
                        <Text style={styles.sectionTitle}>Company fleet</Text>
                        <Text style={styles.sectionSubtitle}>
                          All registered vehicles
                        </Text>
                      </View>
                      <Text style={styles.countText}>
                        {vehicles.length} vehicles
                      </Text>
                    </View>

                    {vehicles.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Ionicons
                          name="car-outline"
                          size={38}
                          color="#94A3B8"
                        />
                        <Text style={styles.emptyTitle}>No vehicles</Text>
                      </View>
                    ) : (
                      vehicles.map((vehicle) => {
                        const typeName = vehicleTypeName(
                          vehicle.vehicle_type_id
                        );
                        const isAvailable = vehicle.status === "available";

                        return (
                          <View key={vehicle.id} style={styles.vehicleRow}>
                            <View style={styles.vehicleIcon}>
                              <MaterialCommunityIcons
                                name={
                                  typeName === "Ambulance"
                                    ? "ambulance"
                                    : "fire-truck"
                                }
                                size={24}
                                color="#DC2626"
                              />
                            </View>

                            <View style={styles.vehicleInfo}>
                              <Text style={styles.vehiclePlate}>
                                {vehicle.registration_number}
                              </Text>
                              <Text style={styles.vehicleKind}>
                                {typeName}
                              </Text>
                            </View>

                            <View style={styles.vehicleActions}>
                              <View
                                style={[
                                  styles.statusBadge,
                                  {
                                    backgroundColor: isAvailable
                                      ? "#DCFCE7"
                                      : "#FEF3C7",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusBadgeText,
                                    {
                                      color: isAvailable
                                        ? "#15803D"
                                        : "#B45309",
                                    },
                                  ]}
                                >
                                  {vehicle.status}
                                </Text>
                              </View>

                              <Pressable
                                onPress={() => handleRemoveVehicle(vehicle)}
                                style={styles.deleteButton}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={20}
                                  color="#DC2626"
                                />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </>
              )}

              {/* DRIVERS */}

              {activeTab === "drivers" && (
                <>
                  <View style={styles.card}>
                    <View style={styles.formTitleRow}>
                      <View style={styles.formIcon}>
                        <Ionicons name="person-add" size={20} color="#DC2626" />
                      </View>
                      <View>
                        <Text style={styles.sectionTitle}>
                          Create driver account
                        </Text>
                        <Text style={styles.sectionSubtitle}>
                          The driver logs in with their email — SafeSync
                          emails them a one-time code, no password needed.
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>First Name</Text>
                    <TextInput
                      style={styles.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="John"
                      placeholderTextColor="#94A3B8"
                    />

                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TextInput
                      style={styles.input}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Kamau"
                      placeholderTextColor="#94A3B8"
                    />

                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="driver@safesync.co.ke"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="0712345678"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                    />

                    <Text style={styles.inputLabel}>Licence Number</Text>
                    <TextInput
                      style={styles.input}
                      value={licence}
                      onChangeText={setLicence}
                      placeholder="DL-45821"
                      placeholderTextColor="#94A3B8"
                    />

                    <Pressable
                      style={[
                        styles.primaryButton,
                        creatingDriver && styles.primaryButtonDisabled,
                      ]}
                      onPress={handleCreateDriver}
                      disabled={creatingDriver}
                    >
                      {creatingDriver ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons
                            name="person-add-outline"
                            size={21}
                            color="#FFFFFF"
                          />
                          <Text style={styles.primaryButtonText}>
                            Create Driver
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                      <View>
                        <Text style={styles.sectionTitle}>
                          Driver accounts
                        </Text>
                        <Text style={styles.sectionSubtitle}>
                          Registered emergency responders
                        </Text>
                      </View>
                      <Text style={styles.countText}>
                        {drivers.length} drivers
                      </Text>
                    </View>

                    {drivers.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Ionicons
                          name="people-outline"
                          size={38}
                          color="#94A3B8"
                        />
                        <Text style={styles.emptyTitle}>No drivers</Text>
                      </View>
                    ) : (
                      drivers.map((driver) => (
                        <View key={driver.id} style={styles.accountRow}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {driver.first_name.charAt(0).toUpperCase()}
                            </Text>
                          </View>

                          <View style={styles.accountInfo}>
                            <Text style={styles.accountName}>
                              {driver.first_name} {driver.last_name}
                            </Text>
                            <Text style={styles.accountUsername}>
                              {driver.email}
                            </Text>
                            <Text style={styles.accountDetails}>
                              {driver.phone || "No phone"}
                            </Text>
                            <Text style={styles.accountDetails}>
                              {driver.badge_number || "No licence on file"}
                            </Text>
                          </View>

                          <Pressable
                            onPress={() => handleRemoveDriver(driver)}
                            style={styles.deleteButton}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={20}
                              color="#DC2626"
                            />
                          </Pressable>
                        </View>
                      ))
                    )}
                  </View>
                </>
              )}
            </>
          )}

          {/* FOOTER */}

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={18} color="#94A3B8" />
            <Text style={styles.footerText}>
              SafeSync Emergency Response Platform
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { padding: 16, paddingBottom: 40 },

  loadingState: { alignItems: "center", paddingVertical: 60, gap: 12 },

  header: {
    minHeight: 70,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  headerSubtitle: { marginTop: 3, fontSize: 11, color: "#64748B" },
  signOutButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryTitle: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  summarySubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    maxWidth: 220,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    marginRight: 5,
  },
  onlineText: { color: "#15803D", fontSize: 11, fontWeight: "800" },
  statsRow: { flexDirection: "row", marginTop: 18, gap: 9 },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 5,
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  sectionSubtitle: { fontSize: 11, color: "#64748B", marginTop: 4 },
  countText: { fontSize: 11, color: "#64748B", fontWeight: "700" },

  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 5,
    backgroundColor: "#DC2626",
    marginRight: 5,
  },
  liveText: { fontSize: 9, fontWeight: "900", color: "#DC2626" },
  driverStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingVertical: 13,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 11 },
  driverStatusInfo: { flex: 1 },
  driverStatusName: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  driverStatusUsername: { fontSize: 10, color: "#64748B", marginTop: 1 },
  driverStatusVehicle: { fontSize: 10, color: "#64748B", marginTop: 4 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { fontSize: 9, fontWeight: "800" },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    height: 46,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  activeTab: { backgroundColor: "#DC2626" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  activeTabText: { color: "#FFFFFF" },

  formTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  formIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 7,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 15 },
  typeButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },
  selectedTypeButton: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  typeButtonText: { fontSize: 10, fontWeight: "700", color: "#475569" },
  selectedTypeText: { color: "#FFFFFF" },

  primaryButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 5,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },

  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingVertical: 14,
  },
  vehicleIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  vehicleInfo: { flex: 1 },
  vehiclePlate: { fontSize: 13, fontWeight: "900", color: "#0F172A" },
  vehicleKind: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  vehicleActions: { alignItems: "flex-end", gap: 8, marginLeft: 8 },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  accountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingVertical: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  avatarText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 13, fontWeight: "800", color: "#0F172A" },
  accountUsername: {
    fontSize: 10,
    color: "#DC2626",
    fontWeight: "700",
    marginTop: 2,
  },
  accountDetails: { fontSize: 10, color: "#64748B", marginTop: 2 },

  emptyState: { alignItems: "center", paddingVertical: 28 },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginTop: 8,
  },
  emptySubtitle: { fontSize: 11, color: "#94A3B8", marginTop: 3 },

  footer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    flexDirection: "row",
    gap: 6,
  },
  footerText: { fontSize: 10, color: "#94A3B8", fontWeight: "600" },
});