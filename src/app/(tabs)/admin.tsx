import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
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
   TYPES
========================================================= */

type VehicleKind =
  | "Ambulance"
  | "Fire Engine"
  | "Rescue Truck";

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
   Replace this later with your backend/database
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

  const [vehicles, setVehicles] =
    useState<Vehicle[]>(INITIAL_VEHICLES);

  const [drivers, setDrivers] =
    useState<Driver[]>(INITIAL_DRIVERS);

  const [shifts] =
    useState<Shift[]>(INITIAL_SHIFTS);

  const [activeTab, setActiveTab] =
    useState<"vehicles" | "drivers">("vehicles");

  /* Vehicle form */

  const [plate, setPlate] = useState("");
  const [vehicleKind, setVehicleKind] =
    useState<VehicleKind>("Ambulance");
  const [station, setStation] = useState("");

  /* Driver form */

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] =
    useState("NRB-001");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [licence, setLicence] = useState("");

  /* ---------------------------------------------------------
     COMPUTED DATA
  --------------------------------------------------------- */

  const onlineDrivers = useMemo(() => {
    return shifts.length;
  }, [shifts]);

  /* ---------------------------------------------------------
     SIGN OUT
  --------------------------------------------------------- */

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
      station:
        station.trim() || "Unassigned station",
    };

    setVehicles((current) => [
      ...current,
      newVehicle,
    ]);

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

  const handleRemoveVehicle = (
    vehicle: Vehicle
  ) => {
    Alert.alert(
      "Remove vehicle",
      `Are you sure you want to remove ${vehicle.plate}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setVehicles((current) =>
              current.filter(
                (item) => item.id !== vehicle.id
              )
            );
          },
        },
      ]
    );
  };

  /* ---------------------------------------------------------
     CREATE DRIVER
  --------------------------------------------------------- */

  const handleCreateDriver = () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      Alert.alert(
        "Missing information",
        "Name, email and password are required."
      );

      return;
    }

    const emailExists = drivers.some(
      (driver) =>
        driver.email.toLowerCase() ===
        email.trim().toLowerCase()
    );

    if (emailExists) {
      Alert.alert(
        "Email already exists",
        "Please use another email address."
      );

      return;
    }

    const finalUsername =
      username.trim() ||
      email.trim().split("@")[0];

    const usernameExists = drivers.some(
      (driver) =>
        driver.username.toLowerCase() ===
        finalUsername.toLowerCase()
    );

    if (usernameExists) {
      Alert.alert(
        "Username already exists",
        "Please choose another username."
      );

      return;
    }

    const newDriver: Driver = {
      id: `driver-${Date.now()}`,
      name: name.trim(),
      companyId:
        companyId.trim() || "NRB-001",
      email: email.trim(),
      username: finalUsername,
      password: password.trim(),
      phone: phone.trim(),
      licence: licence.trim(),
    };

    setDrivers((current) => [
      ...current,
      newDriver,
    ]);

    setName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setPhone("");
    setLicence("");

    Alert.alert(
      "Driver created",
      `${newDriver.name}'s driver account has been created.`
    );
  };

  /* ---------------------------------------------------------
     REMOVE DRIVER
  --------------------------------------------------------- */

  const handleRemoveDriver = (
    driver: Driver
  ) => {
    Alert.alert(
      "Remove driver",
      `Are you sure you want to remove ${driver.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setDrivers((current) =>
              current.filter(
                (item) => item.id !== driver.id
              )
            );
          },
        },
      ]
    );
  };

  /* ---------------------------------------------------------
     GET DRIVER
  --------------------------------------------------------- */

  const getDriver = (driverId?: string) => {
    return drivers.find(
      (driver) => driver.id === driverId
    );
  };

  /* ---------------------------------------------------------
     GET VEHICLE
  --------------------------------------------------------- */

  const getVehicle = (vehicleId?: string) => {
    return vehicles.find(
      (vehicle) => vehicle.id === vehicleId
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBadge}>
              <Ionicons
                name="shield-checkmark"
                size={22}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text style={styles.headerTitle}>
                Super Admin Portal
              </Text>

              <Text style={styles.headerSubtitle}>
                SafeSync · ID NRB-001
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons
              name="log-out-outline"
              size={21}
              color="#0F172A"
            />
          </Pressable>
        </View>

        {/* =================================================
            MAIN SCROLL
        ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
        >
          {/* =================================================
              COMPANY SUMMARY
          ================================================= */}

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryTitle}>
                  SafeSync Company Fleet
                </Text>

                <Text
                  style={styles.summarySubtitle}
                >
                  Manage responders, vehicles and
                  driver accounts.
                </Text>
              </View>

              <View style={styles.onlineBadge}>
                <View
                  style={styles.onlineDot}
                />

                <Text
                  style={styles.onlineText}
                >
                  {onlineDrivers} online
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Ionicons
                  name="car-outline"
                  size={22}
                  color="#DC2626"
                />

                <Text style={styles.statNumber}>
                  {vehicles.length}
                </Text>

                <Text style={styles.statLabel}>
                  Vehicles
                </Text>
              </View>

              <View style={styles.statBox}>
                <Ionicons
                  name="people-outline"
                  size={22}
                  color="#DC2626"
                />

                <Text style={styles.statNumber}>
                  {drivers.length}
                </Text>

                <Text style={styles.statLabel}>
                  Drivers
                </Text>
              </View>

              <View style={styles.statBox}>
                <MaterialCommunityIcons
                  name="radio-tower"
                  size={22}
                  color="#DC2626"
                />

                <Text style={styles.statNumber}>
                  {onlineDrivers}
                </Text>

                <Text style={styles.statLabel}>
                  Online
                </Text>
              </View>
            </View>
          </View>

          {/* =================================================
              LIVE DRIVER STATUS
          ================================================= */}

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Live driver status
                </Text>

                <Text
                  style={styles.sectionSubtitle}
                >
                  Current responder availability
                </Text>
              </View>

              <View style={styles.liveIndicator}>
                <View
                  style={styles.liveDot}
                />

                <Text style={styles.liveText}>
                  LIVE
                </Text>
              </View>
            </View>

            {drivers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="people-outline"
                  size={38}
                  color="#94A3B8"
                />

                <Text style={styles.emptyTitle}>
                  No drivers yet
                </Text>

                <Text
                  style={styles.emptySubtitle}
                >
                  Create a driver account below.
                </Text>
              </View>
            ) : (
              drivers.map((driver) => {
                const shift = shifts.find(
                  (item) =>
                    item.driverId ===
                    driver.id
                );

                const vehicle =
                  getVehicle(
                    shift?.vehicleId
                  );

                return (
                  <View
                    key={driver.id}
                    style={styles.driverStatusRow}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            shift
                              ? "#16A34A"
                              : "#CBD5E1",
                        },
                      ]}
                    />

                    <View
                      style={
                        styles.driverStatusInfo
                      }
                    >
                      <Text
                        style={
                          styles.driverStatusName
                        }
                      >
                        {driver.name}
                      </Text>

                      <Text
                        style={
                          styles.driverStatusUsername
                        }
                      >
                        @{driver.username}
                      </Text>

                      <Text
                        style={
                          styles.driverStatusVehicle
                        }
                      >
                        {shift && vehicle
                          ? `Driving ${vehicle.plate} · ${vehicle.kind}`
                          : "Off shift — no vehicle assigned"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            shift
                              ? "#DCFCE7"
                              : "#F1F5F9",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: shift
                              ? "#15803D"
                              : "#64748B",
                          },
                        ]}
                      >
                        {shift
                          ? "Online"
                          : "Offline"}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* =================================================
              TAB NAVIGATION
          ================================================= */}

          <View style={styles.tabs}>
            <Pressable
              onPress={() =>
                setActiveTab("vehicles")
              }
              style={[
                styles.tab,
                activeTab === "vehicles" &&
                  styles.activeTab,
              ]}
            >
              <Ionicons
                name="car-outline"
                size={20}
                color={
                  activeTab === "vehicles"
                    ? "#FFFFFF"
                    : "#64748B"
                }
              />

              <Text
                style={[
                  styles.tabText,
                  activeTab === "vehicles" &&
                    styles.activeTabText,
                ]}
              >
                Vehicles
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setActiveTab("drivers")
              }
              style={[
                styles.tab,
                activeTab === "drivers" &&
                  styles.activeTab,
              ]}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={
                  activeTab === "drivers"
                    ? "#FFFFFF"
                    : "#64748B"
                }
              />

              <Text
                style={[
                  styles.tabText,
                  activeTab === "drivers" &&
                    styles.activeTabText,
                ]}
              >
                Drivers
              </Text>
            </Pressable>
          </View>

          {/* =================================================
              VEHICLES
          ================================================= */}

          {activeTab === "vehicles" && (
            <>
              {/* ADD VEHICLE */}

              <View style={styles.card}>
                <View
                  style={styles.formTitleRow}
                >
                  <View
                    style={styles.formIcon}
                  >
                    <Ionicons
                      name="car"
                      size={20}
                      color="#DC2626"
                    />
                  </View>

                  <View>
                    <Text
                      style={styles.sectionTitle}
                    >
                      Add a vehicle
                    </Text>

                    <Text
                      style={styles.sectionSubtitle}
                    >
                      Add emergency response
                      vehicles.
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.inputLabel}
                >
                  Plate / Unit Code
                </Text>

                <TextInput
                  style={styles.input}
                  value={plate}
                  onChangeText={setPlate}
                  placeholder="KDA 250X"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />

                <Text
                  style={styles.inputLabel}
                >
                  Vehicle Type
                </Text>

                <View style={styles.typeRow}>
                  {(
                    [
                      "Ambulance",
                      "Fire Engine",
                      "Rescue Truck",
                    ] as VehicleKind[]
                  ).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() =>
                        setVehicleKind(type)
                      }
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
                  ))}
                </View>

                <Text
                  style={styles.inputLabel}
                >
                  Station
                </Text>

                <TextInput
                  style={styles.input}
                  value={station}
                  onChangeText={setStation}
                  placeholder="Central Medical Station"
                  placeholderTextColor="#94A3B8"
                />

                <Pressable
                  style={styles.primaryButton}
                  onPress={handleAddVehicle}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={21}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Add Vehicle
                  </Text>
                </Pressable>
              </View>

              {/* FLEET */}

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text
                      style={styles.sectionTitle}
                    >
                      Company fleet
                    </Text>

                    <Text
                      style={styles.sectionSubtitle}
                    >
                      All registered vehicles
                    </Text>
                  </View>

                  <Text
                    style={styles.countText}
                  >
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

                    <Text
                      style={styles.emptyTitle}
                    >
                      No vehicles
                    </Text>
                  </View>
                ) : (
                  vehicles.map((vehicle) => {
                    const shift =
                      shifts.find(
                        (item) =>
                          item.vehicleId ===
                          vehicle.id
                      );

                    const driver =
                      getDriver(
                        shift?.driverId
                      );

                    return (
                      <View
                        key={vehicle.id}
                        style={
                          styles.vehicleRow
                        }
                      >
                        <View
                          style={
                            styles.vehicleIcon
                          }
                        >
                          <MaterialCommunityIcons
                            name={
                              vehicle.kind ===
                              "Ambulance"
                                ? "ambulance"
                                : vehicle.kind ===
                                  "Fire Engine"
                                ? "fire-truck"
                                : "truck"
                            }
                            size={24}
                            color="#DC2626"
                          />
                        </View>

                        <View
                          style={
                            styles.vehicleInfo
                          }
                        >
                          <Text
                            style={
                              styles.vehiclePlate
                            }
                          >
                            {vehicle.plate}
                          </Text>

                          <Text
                            style={
                              styles.vehicleKind
                            }
                          >
                            {vehicle.kind}
                          </Text>

                          <Text
                            style={
                              styles.vehicleStation
                            }
                          >
                            {vehicle.station}
                          </Text>

                          <Text
                            style={
                              styles.vehicleDriver
                            }
                          >
                            {driver
                              ? `In use by ${driver.name}`
                              : "Available"}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.vehicleActions
                          }
                        >
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  driver
                                    ? "#FEF3C7"
                                    : "#DCFCE7",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                {
                                  color:
                                    driver
                                      ? "#B45309"
                                      : "#15803D",
                                },
                              ]}
                            >
                              {driver
                                ? "In use"
                                : "Available"}
                            </Text>
                          </View>

                          <Pressable
                            onPress={() =>
                              handleRemoveVehicle(
                                vehicle
                              )
                            }
                            style={
                              styles.deleteButton
                            }
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

          {/* =================================================
              DRIVERS
          ================================================= */}

          {activeTab === "drivers" && (
            <>
              {/* CREATE DRIVER */}

              <View style={styles.card}>
                <View
                  style={styles.formTitleRow}
                >
                  <View
                    style={styles.formIcon}
                  >
                    <Ionicons
                      name="person-add"
                      size={20}
                      color="#DC2626"
                    />
                  </View>

                  <View>
                    <Text
                      style={styles.sectionTitle}
                    >
                      Create driver account
                    </Text>

                    <Text
                      style={styles.sectionSubtitle}
                    >
                      The driver will use these
                      credentials to sign in.
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.inputLabel}
                >
                  Full Name
                </Text>

                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="John Kamau"
                  placeholderTextColor="#94A3B8"
                />

                <Text
                  style={styles.inputLabel}
                >
                  Company ID
                </Text>

                <TextInput
                  style={styles.input}
                  value={companyId}
                  onChangeText={setCompanyId}
                  placeholder="NRB-001"
                  placeholderTextColor="#94A3B8"
                />

                <Text
                  style={styles.inputLabel}
                >
                  Email
                </Text>

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="driver@safesync.co.ke"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text
                  style={styles.inputLabel}
                >
                  Username
                </Text>

                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="johnkamau"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />

                <Text
                  style={styles.inputLabel}
                >
                  Password
                </Text>

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                />

                <Text
                  style={styles.inputLabel}
                >
                  Phone
                </Text>

                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="0712345678"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />

                <Text
                  style={styles.inputLabel}
                >
                  Licence Number
                </Text>

                <TextInput
                  style={styles.input}
                  value={licence}
                  onChangeText={setLicence}
                  placeholder="DL-45821"
                  placeholderTextColor="#94A3B8"
                />

                <Pressable
                  style={styles.primaryButton}
                  onPress={handleCreateDriver}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={21}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Create Driver
                  </Text>
                </Pressable>
              </View>

              {/* DRIVER ACCOUNTS */}

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text
                      style={styles.sectionTitle}
                    >
                      Driver accounts
                    </Text>

                    <Text
                      style={styles.sectionSubtitle}
                    >
                      Registered emergency
                      responders
                    </Text>
                  </View>

                  <Text
                    style={styles.countText}
                  >
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

                    <Text
                      style={styles.emptyTitle}
                    >
                      No drivers
                    </Text>
                  </View>
                ) : (
                  drivers.map((driver) => (
                    <View
                      key={driver.id}
                      style={styles.accountRow}
                    >
                      <View
                        style={
                          styles.avatar
                        }
                      >
                        <Text
                          style={
                            styles.avatarText
                          }
                        >
                          {driver.name
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.accountInfo
                        }
                      >
                        <Text
                          style={
                            styles.accountName
                          }
                        >
                          {driver.name}
                        </Text>

                        <Text
                          style={
                            styles.accountUsername
                          }
                        >
                          @{driver.username}
                        </Text>

                        <Text
                          style={
                            styles.accountDetails
                          }
                        >
                          {driver.companyId}
                        </Text>

                        <Text
                          style={
                            styles.accountDetails
                          }
                        >
                          {driver.phone ||
                            "No phone"}
                        </Text>

                        <Text
                          style={
                            styles.accountDetails
                          }
                        >
                          {driver.licence ||
                            "No licence"}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() =>
                          handleRemoveDriver(
                            driver
                          )
                        }
                        style={
                          styles.deleteButton
                        }
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

          {/* =================================================
              FOOTER
          ================================================= */}

          <View style={styles.footer}>
            <Ionicons
              name="shield-checkmark"
              size={18}
              color="#94A3B8"
            />

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
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* =====================================================
     HEADER
  ===================================================== */

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

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },

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

  /* =====================================================
     SUMMARY
  ===================================================== */

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

  summaryTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

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

  onlineText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "800",
  },

  statsRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 9,
  },

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

  /* =====================================================
     CARD
  ===================================================== */

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

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },

  countText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
  },

  /* =====================================================
     LIVE DRIVER
  ===================================================== */

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

  liveText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#DC2626",
  },

  driverStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingVertical: 13,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 11,
  },

  driverStatusInfo: {
    flex: 1,
  },

  driverStatusName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  driverStatusUsername: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },

  driverStatusVehicle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },

  /* =====================================================
     TABS
  ===================================================== */

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

  activeTab: {
    backgroundColor: "#DC2626",
  },

  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },

  activeTabText: {
    color: "#FFFFFF",
  },

  /* =====================================================
     FORM
  ===================================================== */

  formTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

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

  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 15,
  },

  typeButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
  },

  selectedTypeButton: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },

  typeButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },

  selectedTypeText: {
    color: "#FFFFFF",
  },

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

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  /* =====================================================
     VEHICLES
  ===================================================== */

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

  vehicleInfo: {
    flex: 1,
  },

  vehiclePlate: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },

  vehicleKind: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },

  vehicleStation: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  vehicleDriver: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },

  vehicleActions: {
    alignItems: "flex-end",
    gap: 8,
    marginLeft: 8,
  },

  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  /* =====================================================
     DRIVER ACCOUNTS
  ===================================================== */

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

  avatarText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  accountInfo: {
    flex: 1,
  },

  accountName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  accountUsername: {
    fontSize: 10,
    color: "#DC2626",
    fontWeight: "700",
    marginTop: 2,
  },

  accountDetails: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },

  /* =====================================================
     EMPTY STATE
  ===================================================== */

  emptyState: {
    alignItems: "center",
    paddingVertical: 28,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginTop: 8,
  },

  emptySubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
  },

  /* =====================================================
     FOOTER
  ===================================================== */

  footer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    flexDirection: "row",
    gap: 6,
  },

  footerText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
});