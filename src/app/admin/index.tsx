import React, { useMemo, useState } from "react";
import {
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

// Import icons from lucide-react-native
import {
  Ambulance,
  Car,
  Flame,
  LogOut,
  PlusCircle,
  RadioTower,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react-native";

/* =========================================================
   TYPES
========================================================= */

type VehicleKind = "Ambulance" | "Fire Engine" | "Rescue Truck";

type Vehicle = {
  id: string;
  plate: string;
  kind: VehicleKind;
  station: string;
};

type Driver = {
  id: string;
  name: string;
  companyId: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  licence: string;
};

type Shift = {
  id: string;
  driverId: string;
  vehicleId: string;
  since: string;
};

/* =========================================================
   SAMPLE DATA
========================================================= */

const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: "vehicle-1",
    plate: "KDA 250X",
    kind: "Ambulance",
    station: "Central Medical Station",
  },
  {
    id: "vehicle-2",
    plate: "KDB 452A",
    kind: "Fire Engine",
    station: "Nairobi Central Station",  
  },
];

const INITIAL_DRIVERS: Driver[] = [
  {
    id: "driver-1",
    name: "John Kamau",
    companyId: "NRB-001",
    email: "john@safesync.co.ke",
    username: "johnkamau",
    password: "password",
    phone: "0712345678",
    licence: "DL-45821",
  },
  {
    id: "driver-2",
    name: "Brian Otieno",
    companyId: "NRB-001",
    email: "brian@safesync.co.ke",
    username: "brianotieno",
    password: "password",
    phone: "0723456789",
    licence: "DL-78213",
  },
];

const INITIAL_SHIFTS: Shift[] = [
  {
    id: "shift-1",
    driverId: "driver-1",
    vehicleId: "vehicle-1",
    since: new Date().toISOString(),
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function AdminScreen() {
  const router = useRouter();

  /* ---------------------------------------------------------
     STATE
  --------------------------------------------------------- */

  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [shifts] = useState<Shift[]>(INITIAL_SHIFTS);
  const [activeTab, setActiveTab] = useState<"vehicles" | "drivers">("vehicles");

  /* Vehicle form */
  const [plate, setPlate] = useState("");
  const [vehicleKind, setVehicleKind] = useState<VehicleKind>("Ambulance");
  const [station, setStation] = useState("");

  /* Driver form */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("NRB-001");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [licence, setLicence] = useState("");

  /* ---------------------------------------------------------
     COMPUTED DATA
  --------------------------------------------------------- */

  const onlineDrivers = useMemo(() => shifts.length, [shifts]);

  /* ---------------------------------------------------------
     SIGN OUT
  --------------------------------------------------------- */

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => router.replace("/"),
      },
    ]);
  };

  /* ---------------------------------------------------------
     ADD VEHICLE
  --------------------------------------------------------- */

  const handleAddVehicle = () => {
    if (!plate.trim()) {
      Alert.alert(
        "Missing information",
        "Please enter the vehicle plate or unit code."
      );
      return;
    }

    const newVehicle: Vehicle = {
      id: `vehicle-${Date.now()}`,
      plate: plate.trim(),
      kind: vehicleKind,
      station: station.trim() || "Unassigned station",
    };

    setVehicles((current) => [...current, newVehicle]);
    setPlate("");
    setStation("");

    Alert.alert(
      "Vehicle added",
      `${newVehicle.plate} has been added to the company fleet.`
    );
  };

  /* ---------------------------------------------------------
     REMOVE VEHICLE
  --------------------------------------------------------- */

  const handleRemoveVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      "Remove vehicle",
      `Are you sure you want to remove ${vehicle.plate}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
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

  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */

  const getDriver = (driverId?: string) =>
    drivers.find((driver) => driver.id === driverId);

  const getVehicle = (vehicleId?: string) =>
    vehicles.find((vehicle) => vehicle.id === vehicleId);

  /* Helper function to render Lucide vehicle icons dynamically */
  const renderVehicleIcon = (kind: VehicleKind) => {
    switch (kind) {
      case "Ambulance":
        return <Ambulance size={24} color="#DC2626" />;
      case "Fire Engine":
        return <Flame size={24} color="#DC2626" />;
      case "Rescue Truck":
        return <Truck size={24} color="#DC2626" />;
      default:
        return <Car size={24} color="#DC2626" />;
    }
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
              <ShieldCheck size={22} color="#FFFFFF" />
            </View>

            <View>
              <Text style={styles.headerTitle}>Super Admin Portal</Text>
              <Text style={styles.headerSubtitle}>
                SafeSync · ID NRB-001
              </Text>
            </View>
          </View>

          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={21} color="#0F172A" />
          </Pressable>
        </View>

        {/* MAIN SCROLL */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* COMPANY SUMMARY */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryTitle}>SafeSync Company Fleet</Text>
                <Text style={styles.summarySubtitle}>
                  Manage responders, vehicles and driver accounts.
                </Text>
              </View>

              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>{onlineDrivers} online</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Car size={22} color="#DC2626" />
                <Text style={styles.statNumber}>{vehicles.length}</Text>
                <Text style={styles.statLabel}>Vehicles</Text>
              </View>

              <View style={styles.statBox}>
                <Users size={22} color="#DC2626" />
                <Text style={styles.statNumber}>{drivers.length}</Text>
                <Text style={styles.statLabel}>Drivers</Text>
              </View>

              <View style={styles.statBox}>
                <RadioTower size={22} color="#DC2626" />
                <Text style={styles.statNumber}>{onlineDrivers}</Text>
                <Text style={styles.statLabel}>Online</Text>
              </View>
            </View>
          </View>

          {/* LIVE DRIVER STATUS */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Live driver status</Text>
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
                <Users size={38} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No drivers yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create a driver account below.
                </Text>
              </View>
            ) : (
              drivers.map((driver) => {
                const shift = shifts.find(
                  (item) => item.driverId === driver.id
                );
                const vehicle = getVehicle(shift?.vehicleId);

                return (
                  <View key={driver.id} style={styles.driverStatusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: shift ? "#16A34A" : "#CBD5E1",
                        },
                      ]}
                    />

                    <View style={styles.driverStatusInfo}>
                      <Text style={styles.driverStatusName}>
                        {driver.name}
                      </Text>
                      <Text style={styles.driverStatusUsername}>
                        @{driver.username}
                      </Text>
                      <Text style={styles.driverStatusVehicle}>
                        {shift && vehicle
                          ? `Driving ${vehicle.plate} · ${vehicle.kind}`
                          : "Off shift — no vehicle assigned"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: shift ? "#DCFCE7" : "#F1F5F9",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: shift ? "#15803D" : "#64748B" },
                        ]}
                      >
                        {shift ? "Online" : "Offline"}
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
              <Car
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
              <Users
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

          {/* VEHICLES TAB */}
          {activeTab === "vehicles" && (
            <>
              {/* ADD VEHICLE */}
              <View style={styles.card}>
                <View style={styles.formTitleRow}>
                  <View style={styles.formIcon}>
                    <Car size={20} color="#DC2626" />
                  </View>

                  <View>
                    <Text style={styles.sectionTitle}>Add a vehicle</Text>
                    <Text style={styles.sectionSubtitle}>
                      Add emergency response vehicles.
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
                  {(
                    ["Ambulance", "Fire Engine", "Rescue Truck"] as VehicleKind[]
                  ).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setVehicleKind(type)}
                      style={[
                        styles.typeButton,
                        vehicleKind === type && styles.selectedTypeButton,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          vehicleKind === type && styles.selectedTypeText,
                        ]}
                      >
                        {type}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Station</Text>
                <TextInput
                  style={styles.input}
                  value={station}
                  onChangeText={setStation}
                  placeholder="Central Medical Station"
                  placeholderTextColor="#94A3B8"
                />

                <Pressable style={styles.primaryButton} onPress={handleAddVehicle}>
                  <PlusCircle size={21} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Add Vehicle</Text>
                </Pressable>
              </View>

              {/* FLEET LIST */}
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
                    <Car size={38} color="#94A3B8" />
                    <Text style={styles.emptyTitle}>No vehicles</Text>
                  </View>
                ) : (
                  vehicles.map((vehicle) => {
                    const shift = shifts.find(
                      (item) => item.vehicleId === vehicle.id
                    );
                    const driver = getDriver(shift?.driverId);

                    return (
                      <View key={vehicle.id} style={styles.vehicleRow}>
                        <View style={styles.vehicleIcon}>
                          {renderVehicleIcon(vehicle.kind)}
                        </View>

                        <View style={styles.vehicleInfo}>
                          <Text style={styles.vehiclePlate}>
                            {vehicle.plate}
                          </Text>
                          <Text style={styles.vehicleKind}>
                            {vehicle.kind}
                          </Text>
                          <Text style={styles.vehicleStation}>
                            {vehicle.station}
                          </Text>
                          <Text style={styles.vehicleDriver}>
                            {driver
                              ? `In use by ${driver.name}`
                              : "Available"}
                          </Text>
                        </View>

                        <View style={styles.vehicleActions}>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: driver
                                  ? "#FEF3C7"
                                  : "#DCFCE7",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                {
                                  color: driver ? "#B45309" : "#15803D",
                                },
                              ]}
                            >
                              {driver ? "In use" : "Available"}
                            </Text>
                          </View>

                          <Pressable
                            onPress={() => handleRemoveVehicle(vehicle)}
                          >
                            <Text style={styles.removeText}>Remove</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  headerSubtitle: { fontSize: 13, color: "#64748B" },
  signOutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: { padding: 16, gap: 16 },
  summaryCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  summarySubtitle: { fontSize: 13, color: "#94A3B8", marginTop: 4 },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(22, 163, 74, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  onlineText: { fontSize: 12, fontWeight: "600", color: "#4ADE80" },
  statsRow: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statNumber: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  statLabel: { fontSize: 12, color: "#94A3B8" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  sectionSubtitle: { fontSize: 12, color: "#64748B" },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#DC2626" },
  liveText: { fontSize: 11, fontWeight: "700", color: "#DC2626" },
  emptyState: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: "#475569" },
  emptySubtitle: { fontSize: 13, color: "#94A3B8" },
  driverStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  driverStatusInfo: { flex: 1 },
  driverStatusName: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  driverStatusUsername: { fontSize: 12, color: "#64748B" },
  driverStatusVehicle: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: { backgroundColor: "#DC2626" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  activeTabText: { color: "#FFFFFF" },
  formTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  formIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#334155", marginTop: 4 },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  selectedTypeButton: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  typeButtonText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  selectedTypeText: { color: "#FFFFFF" },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  primaryButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  countText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleInfo: { flex: 1 },
  vehiclePlate: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  vehicleKind: { fontSize: 12, fontWeight: "500", color: "#DC2626" },
  vehicleStation: { fontSize: 12, color: "#64748B" },
  vehicleDriver: { fontSize: 12, color: "#94A3B8" },
  vehicleActions: { alignItems: "flex-end", gap: 8 },
  removeText: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
});