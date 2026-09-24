import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

import {
  Building2,
  Wallet,
  Siren,
  Users,
  Search,
  Plus,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Ambulance,
  UserCog,
  LogOut,
  ArrowUpRight,
} from "lucide-react-native";

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  primary: "#E11D48",
  primaryDark: "#BE123C",

  background: "#F8FAFC",
  white: "#FFFFFF",

  slate900: "#0F172A",
  slate800: "#1E293B",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748B",
  slate300: "#CBD5E1",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",

  green: "#059669",
  greenLight: "#ECFDF5",

  amber: "#D97706",
  amberLight: "#FFFBEB",

  redLight: "#FEF2F2",
};

/* =========================================================
   TYPES
========================================================= */

type Organization = {
  id: number;
  name: string;
  location: string;
  code: string;
  admins: number;
  responders: number;
  walletBalance: number;
  status: "Active" | "Pending";
};

/* =========================================================
   INITIAL DATA
========================================================= */

const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 1,
    name: "Nairobi Business Centre",
    location: "Nairobi Central",
    code: "HQ-01",
    admins: 3,
    responders: 12,
    walletBalance: 120000,
    status: "Active",
  },
  {
    id: 2,
    name: "Westlands Medical Group",
    location: "Westlands Hub",
    code: "WEST-02",
    admins: 2,
    responders: 8,
    walletBalance: 75000,
    status: "Active",
  },
  {
    id: 3,
    name: "Kilimani Corporate Hub",
    location: "Kilimani Substation",
    code: "KIL-03",
    admins: 1,
    responders: 5,
    walletBalance: 30000,
    status: "Pending",
  },
];

/* =========================================================
   SUPER ADMIN SCREEN
========================================================= */

export default function SuperAdminScreen() {
  const router = useRouter();

  const [search, setSearch] = useState("");

  const [filterStatus, setFilterStatus] = useState<
    "All" | "Active" | "Pending"
  >("All");

  const [masterWallet, setMasterWallet] = useState(2480500);

  const [organizations, setOrganizations] = useState<Organization[]>(
    INITIAL_ORGANIZATIONS
  );

  /* =========================================================
     FILTER ORGANIZATIONS
  ========================================================= */

  const filteredOrganizations = useMemo(() => {
    const value = search.trim().toLowerCase();

    return organizations.filter((org) => {
      const matchesSearch =
        !value ||
        org.name.toLowerCase().includes(value) ||
        org.location.toLowerCase().includes(value) ||
        org.code.toLowerCase().includes(value);

      const matchesStatus =
        filterStatus === "All" ? true : org.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [search, filterStatus, organizations]);

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of Super Admin HQ?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            router.replace("/");
          },
        },
      ]
    );
  };

  /* =========================================================
     ALLOCATE FUNDS
  ========================================================= */

  const handleAllocateFunds = (org: Organization) => {
    Alert.alert(
      "Allocate Funds",
      `Transfer KES 25,000 from Corporate HQ Master Wallet to ${org.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Transfer KES 25,000",
          onPress: () => {
            if (masterWallet < 25000) {
              Alert.alert(
                "Insufficient Funds",
                "There are not enough funds in the HQ Master Wallet."
              );
              return;
            }

            setMasterWallet((prev) => prev - 25000);

            setOrganizations((prev) =>
              prev.map((o) =>
                o.id === org.id
                  ? {
                      ...o,
                      walletBalance: o.walletBalance + 25000,
                    }
                  : o
              )
            );

            Alert.alert(
              "Allocation Successful",
              `KES 25,000 transferred to ${org.name}.\n\nNew sub-wallet balance: KES ${(
                org.walletBalance + 25000
              ).toLocaleString()}`
            );
          },
        },
      ]
    );
  };

  /* =========================================================
     MASTER WALLET TOP UP
  ========================================================= */

  const handleMasterWalletTopUp = () => {
    Alert.alert(
      "M-PESA Master Deposit",
      "Trigger STK Push to add KES 100,000 into the SafeSync Corporate Reserve?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Deposit KES 100,000",
          onPress: () => {
            setMasterWallet((prev) => prev + 100000);

            Alert.alert(
              "Deposit Confirmed",
              "KES 100,000 has been credited to the Corporate Wallet."
            );
          },
        },
      ]
    );
  };

  /* =========================================================
     ADD ORGANIZATION
  ========================================================= */

  const handleAddOrganization = () => {
    Alert.prompt
      ? Alert.prompt(
          "New Branch / Organization",
          "Enter branch name:",
          (name) => {
            if (name && name.trim()) {
              const newOrg: Organization = {
                id: Date.now(),
                name: name.trim(),
                location: "Regional Station",
                code: `BR-${organizations.length + 1}`,
                admins: 1,
                responders: 4,
                walletBalance: 20000,
                status: "Active",
              };

              setOrganizations((prev) => [newOrg, ...prev]);
            }
          }
        )
      : Alert.alert(
          "Add Organization",
          "Organization onboarding form opened."
        );
  };

  /* =========================================================
     REFRESH
  ========================================================= */

  const handleRefresh = () => {
    Alert.alert(
      "Dashboard Refreshed",
      "Real-time telemetry and ledger updated."
    );
  };

  /* =========================================================
     SCREEN
  ========================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* =====================================================
          FIXED TOP NAVIGATION
      ===================================================== */}

      <View style={styles.fixedHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <ShieldCheck
              size={21}
              color={COLORS.white}
              strokeWidth={2.4}
            />
          </View>

          <View style={styles.brandContainer}>
            <Text style={styles.brand}>SafeSync</Text>

            <Text style={styles.headerSubtitle}>
              Super Admin HQ
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
        >
          <LogOut
            size={16}
            color={COLORS.primary}
            strokeWidth={2.3}
          />

          <Text style={styles.logoutText}>
            Sign Out
          </Text>
        </Pressable>
      </View>

      {/* =====================================================
          SCROLLABLE DASHBOARD
      ===================================================== */}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===================================================
            MASTER CORPORATE WALLET
        =================================================== */}

        <View style={styles.walletCard}>
          <View style={styles.walletTopRow}>
            <View style={styles.walletIcon}>
              <Wallet
                size={20}
                color={COLORS.white}
                strokeWidth={2.2}
              />
            </View>

            <View style={styles.walletInfo}>
              <Text style={styles.walletTitle}>
                MASTER CORPORATE WALLET
              </Text>

              <Text style={styles.walletAmount}>
                KES {masterWallet.toLocaleString()}
              </Text>
            </View>
          </View>

          <Text style={styles.walletSubtitle}>
            Pre-funded reserve guaranteeing zero-delay emergency
            dispatch and instant hospital admission.
          </Text>

          <Pressable
            onPress={handleMasterWalletTopUp}
            style={({ pressed }) => [
              styles.topUpButton,
              pressed && styles.pressed,
            ]}
          >
            <ArrowUpRight
              size={16}
              color={COLORS.white}
              strokeWidth={2.5}
            />

            <Text style={styles.topUpButtonText}>
              Instant M-PESA STK Top-Up
            </Text>
          </Pressable>
        </View>

        {/* ===================================================
            SYSTEM OVERVIEW
        =================================================== */}

        <View style={styles.welcomeSection}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>
              System Overview
            </Text>

            <Text style={styles.welcomeSubtitle}>
              Monitor organizations, sub-wallets, and live dispatches.
            </Text>
          </View>

          <Pressable
            onPress={handleRefresh}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
            ]}
          >
            <RefreshCw
              size={17}
              color={COLORS.slate700}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>

        {/* ===================================================
            STATISTICS
        =================================================== */}

        <View style={styles.statsGrid}>
          {/* Organizations */}

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "#FFF1F2" },
              ]}
            >
              <Building2
                size={18}
                color={COLORS.primary}
                strokeWidth={2.2}
              />
            </View>

            <Text style={styles.statNumber}>
              {organizations.length}
            </Text>

            <Text style={styles.statLabel}>
              Organizations
            </Text>
          </View>

          {/* Admins */}

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "#ECFDF5" },
              ]}
            >
              <Users
                size={18}
                color={COLORS.green}
                strokeWidth={2.2}
              />
            </View>

            <Text style={styles.statNumber}>
              {organizations.reduce(
                (sum, organization) =>
                  sum + organization.admins,
                0
              )}
            </Text>

            <Text style={styles.statLabel}>
              Admins
            </Text>
          </View>

          {/* Responders */}

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "#FFFBEB" },
              ]}
            >
              <Ambulance
                size={18}
                color={COLORS.amber}
                strokeWidth={2.2}
              />
            </View>

            <Text style={styles.statNumber}>
              {organizations.reduce(
                (sum, organization) =>
                  sum + organization.responders,
                0
              )}
            </Text>

            <Text style={styles.statLabel}>
              Responders
            </Text>
          </View>

          {/* Dispatches */}

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "#EFF6FF" },
              ]}
            >
              <Siren
                size={18}
                color="#2563EB"
                strokeWidth={2.2}
              />
            </View>

            <Text style={styles.statNumber}>
              2 Active
            </Text>

            <Text style={styles.statLabel}>
              CAD Dispatches
            </Text>
          </View>
        </View>

        {/* ===================================================
            QUICK ACTIONS
        =================================================== */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Quick Actions
          </Text>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            onPress={handleAddOrganization}
            style={({ pressed }) => [
              styles.primaryAction,
              pressed && styles.pressed,
            ]}
          >
            <Plus
              size={18}
              color={COLORS.white}
              strokeWidth={2.5}
            />

            <Text style={styles.primaryActionText}>
              Add Branch
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                "CAD Incident Center",
                "2 active incidents currently en-route. Responders are mobile."
              )
            }
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed && styles.pressed,
            ]}
          >
            <Siren
              size={18}
              color={COLORS.slate700}
              strokeWidth={2.2}
            />

            <Text style={styles.secondaryActionText}>
              CAD Dispatch Feed
            </Text>
          </Pressable>
        </View>

        {/* ===================================================
            BRANCHES
        =================================================== */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Branches & Sub-Wallets
          </Text>

          <Text style={styles.countText}>
            {filteredOrganizations.length} shown
          </Text>
        </View>

        {/* Search */}

        <View style={styles.searchBox}>
          <Search
            size={17}
            color={COLORS.slate500}
            strokeWidth={2}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search branches by city or code..."
            placeholderTextColor={COLORS.slate500}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* ===================================================
            FILTERS
        =================================================== */}

        <View style={styles.filterPillsRow}>
          {(["All", "Active", "Pending"] as const).map(
            (tab) => {
              const isSelected = filterStatus === tab;

              return (
                <Pressable
                  key={tab}
                  onPress={() => setFilterStatus(tab)}
                  style={[
                    styles.filterPill,
                    isSelected &&
                      styles.filterPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected &&
                        styles.filterPillTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>

        {/* ===================================================
            ORGANIZATION LIST
        =================================================== */}

        <View style={styles.organizationList}>
          {filteredOrganizations.length === 0 ? (
            <View style={styles.emptyState}>
              <Search
                size={26}
                color={COLORS.slate300}
              />

              <Text style={styles.emptyTitle}>
                No organizations found
              </Text>

              <Text style={styles.emptySubtitle}>
                Try another search term or status filter.
              </Text>
            </View>
          ) : (
            filteredOrganizations.map((organization) => (
              <View
                key={organization.id}
                style={styles.organizationCard}
              >
                {/* Organization Header */}

                <View style={styles.orgTopRow}>
                  <View style={styles.organizationIcon}>
                    <Building2
                      size={19}
                      color={COLORS.primary}
                      strokeWidth={2}
                    />
                  </View>

                  <View style={styles.organizationInfo}>
                    <View style={styles.codeRow}>
                      <Text style={styles.codeBadge}>
                        {organization.code}
                      </Text>

                      <Text
                        style={styles.organizationLocation}
                        numberOfLines={1}
                      >
                        {organization.location}
                      </Text>
                    </View>

                    <Text
                      style={styles.organizationName}
                      numberOfLines={1}
                    >
                      {organization.name}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      organization.status === "Active"
                        ? styles.activeBadge
                        : styles.pendingBadge,
                    ]}
                  >
                    {organization.status === "Active" ? (
                      <CheckCircle2
                        size={12}
                        color={COLORS.green}
                      />
                    ) : (
                      <AlertTriangle
                        size={12}
                        color={COLORS.amber}
                      />
                    )}

                    <Text
                      style={[
                        styles.statusText,
                        organization.status === "Active"
                          ? styles.activeText
                          : styles.pendingText,
                      ]}
                    >
                      {organization.status}
                    </Text>
                  </View>
                </View>

                {/* Sub Wallet */}

                <View style={styles.subWalletBar}>
                  <View style={styles.subWalletInfo}>
                    <Text style={styles.subWalletLabel}>
                      SUB-WALLET ESCROW
                    </Text>

                    <Text style={styles.subWalletAmount}>
                      KES{" "}
                      {organization.walletBalance.toLocaleString()}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      handleAllocateFunds(
                        organization
                      )
                    }
                    style={({ pressed }) => [
                      styles.allocateButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Plus
                      size={13}
                      color={COLORS.green}
                      strokeWidth={2.5}
                    />

                    <Text style={styles.allocateButtonText}>
                      Allocate
                    </Text>
                  </Pressable>
                </View>

                {/* Organization Meta */}

                <View style={styles.organizationMeta}>
                  <View style={styles.metaItem}>
                    <UserCog
                      size={13}
                      color={COLORS.slate500}
                    />

                    <Text style={styles.metaText}>
                      {organization.admins} Admins
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ambulance
                      size={13}
                      color={COLORS.slate500}
                    />

                    <Text style={styles.metaText}>
                      {organization.responders} Responders
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ===================================================
            SYSTEM HEALTH
        =================================================== */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            System Health
          </Text>
        </View>

        <View style={styles.healthCard}>
          <View style={styles.healthRow}>
            <View style={styles.healthLeft}>
              <View style={styles.healthDot} />

              <View style={styles.healthTextContainer}>
                <Text style={styles.healthTitle}>
                  Emergency Response CAD Stream
                </Text>

                <Text style={styles.healthSubtitle}>
                  All telemetry nodes active
                </Text>
              </View>
            </View>

            <CheckCircle2
              size={18}
              color={COLORS.green}
              strokeWidth={2.2}
            />
          </View>

          <View style={styles.healthDivider} />

          <View style={styles.healthRow}>
            <View style={styles.healthLeft}>
              <View style={styles.healthDot} />

              <View style={styles.healthTextContainer}>
                <Text style={styles.healthTitle}>
                  Escrow Liquidity Guarantee
                </Text>

                <Text style={styles.healthSubtitle}>
                  Verified zero-delay reserves
                </Text>
              </View>
            </View>

            <CheckCircle2
              size={18}
              color={COLORS.green}
              strokeWidth={2.2}
            />
          </View>
        </View>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <View style={styles.footer}>
          <ShieldCheck
            size={14}
            color={COLORS.slate500}
          />

          <Text style={styles.footerText}>
            SafeSync Super Admin • Enterprise Command Center
          </Text>
        </View>
      </ScrollView>
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
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* =======================================================
     FIXED HEADER
  ======================================================= */

  fixedHeader: {
  height: 68,
  width: "100%",
  backgroundColor: COLORS.white,

  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",

  paddingHorizontal: 16,

  // Move the header slightly downward
  marginTop: 10,

  borderBottomWidth: 1,
  borderBottomColor: COLORS.slate200,

  zIndex: 100,
  elevation: 5,

  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.06,
  shadowRadius: 4,
},

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  logo: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.primary,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  brandContainer: {
    justifyContent: "center",
  },

  brand: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.slate900,
    letterSpacing: -0.3,
  },

  headerSubtitle: {
    marginTop: 1,
    fontSize: 10,
    color: COLORS.slate500,
    fontWeight: "700",
  },

  logoutButton: {
    minHeight: 34,
    paddingHorizontal: 10,

    borderRadius: 9,

    backgroundColor: COLORS.redLight,

    borderWidth: 1,
    borderColor: "#FECACA",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 5,
  },

  logoutText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "800",
  },

  /* =======================================================
     WALLET
  ======================================================= */

  walletCard: {
    borderRadius: 18,
    backgroundColor: COLORS.slate900,

    padding: 18,

    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,

    elevation: 3,
  },

  walletTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  walletIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,

    backgroundColor: "rgba(255,255,255,0.15)",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  walletInfo: {
    flex: 1,
  },

  walletTitle: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  walletAmount: {
    color: "#10B981",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },

  walletSubtitle: {
    color: "#CBD5E1",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },

  topUpButton: {
    backgroundColor: COLORS.primary,

    borderRadius: 10,

    minHeight: 42,

    paddingHorizontal: 12,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 6,

    marginTop: 12,
  },

  topUpButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },

  /* =======================================================
     OVERVIEW
  ======================================================= */

  welcomeSection: {
    marginTop: 18,
    marginBottom: 12,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  welcomeTextContainer: {
    flex: 1,
    paddingRight: 10,
  },

  welcomeTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.slate900,
  },

  welcomeSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.slate500,
    lineHeight: 16,
  },

  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 10,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    alignItems: "center",
    justifyContent: "center",
  },

  /* =======================================================
     STATS
  ======================================================= */

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",

    justifyContent: "space-between",

    rowGap: 8,
  },

  statCard: {
    width: "48.5%",

    minHeight: 105,

    backgroundColor: COLORS.white,

    borderRadius: 14,

    padding: 12,

    borderWidth: 1,
    borderColor: COLORS.slate200,
  },

  statIcon: {
    width: 32,
    height: 32,

    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 7,
  },

  statNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.slate900,
  },

  statLabel: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.slate500,
    fontWeight: "700",
  },

  /* =======================================================
     SECTION HEADER
  ======================================================= */

  sectionHeader: {
    marginTop: 18,
    marginBottom: 8,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.slate900,
  },

  countText: {
    fontSize: 10,
    color: COLORS.slate500,
    fontWeight: "700",
  },

  /* =======================================================
     QUICK ACTIONS
  ======================================================= */

  quickActions: {
    flexDirection: "row",
    gap: 8,
  },

  primaryAction: {
    flex: 1,

    minHeight: 44,

    borderRadius: 10,

    backgroundColor: COLORS.primary,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 6,
  },

  primaryActionText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
  },

  secondaryAction: {
    flex: 1,

    minHeight: 44,

    borderRadius: 10,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 6,
  },

  secondaryActionText: {
    color: COLORS.slate700,
    fontSize: 11,
    fontWeight: "800",
  },

  /* =======================================================
     SEARCH
  ======================================================= */

  searchBox: {
    minHeight: 44,

    borderRadius: 10,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 12,
  },

  searchInput: {
    flex: 1,

    marginLeft: 8,

    minHeight: 42,

    fontSize: 12,

    color: COLORS.slate900,
  },

  /* =======================================================
     FILTERS
  ======================================================= */

  filterPillsRow: {
    flexDirection: "row",
    gap: 6,

    marginTop: 8,
  },

  filterPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,

    borderRadius: 8,

    backgroundColor: COLORS.slate100,

    borderWidth: 1,
    borderColor: COLORS.slate200,
  },

  filterPillActive: {
    backgroundColor: COLORS.slate900,
    borderColor: COLORS.slate900,
  },

  filterPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.slate600,
  },

  filterPillTextActive: {
    color: COLORS.white,
  },

  /* =======================================================
     ORGANIZATIONS
  ======================================================= */

  organizationList: {
    marginTop: 10,
    gap: 10,
  },

  organizationCard: {
    backgroundColor: COLORS.white,

    borderRadius: 14,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    padding: 12,

    gap: 8,
  },

  orgTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  organizationIcon: {
    width: 36,
    height: 36,

    borderRadius: 10,

    backgroundColor: "#FFF1F2",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 9,
  },

  organizationInfo: {
    flex: 1,
    minWidth: 0,
  },

  codeRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: 6,
  },

  codeBadge: {
    fontSize: 9,
    fontWeight: "900",

    color: COLORS.primary,

    backgroundColor: "#FFE4E6",

    paddingHorizontal: 5,
    paddingVertical: 2,

    borderRadius: 4,
  },

  organizationLocation: {
    flex: 1,

    fontSize: 9,
    color: COLORS.slate500,
  },

  organizationName: {
    fontSize: 13,
    fontWeight: "900",

    color: COLORS.slate900,

    marginTop: 2,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",

    gap: 3,

    paddingHorizontal: 6,
    paddingVertical: 4,

    borderRadius: 6,

    marginLeft: 6,
  },

  activeBadge: {
    backgroundColor: COLORS.greenLight,
  },

  pendingBadge: {
    backgroundColor: COLORS.amberLight,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "900",
  },

  activeText: {
    color: COLORS.green,
  },

  pendingText: {
    color: COLORS.amber,
  },

  /* =======================================================
     SUB WALLET
  ======================================================= */

  subWalletBar: {
    flexDirection: "row",

    justifyContent: "space-between",
    alignItems: "center",

    backgroundColor: COLORS.slate100,

    padding: 9,

    borderRadius: 8,
  },

  subWalletInfo: {
    flex: 1,
  },

  subWalletLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.slate500,
  },

  subWalletAmount: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.green,

    marginTop: 1,
  },

  allocateButton: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: "#A7F3D0",

    paddingHorizontal: 8,
    paddingVertical: 6,

    borderRadius: 7,

    gap: 4,
  },

  allocateButtonText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.green,
  },

  /* =======================================================
     ORGANIZATION META
  ======================================================= */

  organizationMeta: {
    flexDirection: "row",
    alignItems: "center",

    gap: 14,

    paddingTop: 2,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",

    gap: 4,
  },

  metaText: {
    fontSize: 10,
    color: COLORS.slate500,
    fontWeight: "700",
  },

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  emptyState: {
    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    borderRadius: 14,

    paddingVertical: 30,
    paddingHorizontal: 20,

    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 10,

    fontSize: 13,
    fontWeight: "900",

    color: COLORS.slate900,
  },

  emptySubtitle: {
    marginTop: 4,

    fontSize: 10,

    color: COLORS.slate500,

    textAlign: "center",
  },

  /* =======================================================
     SYSTEM HEALTH
  ======================================================= */

  healthCard: {
    backgroundColor: COLORS.white,

    borderRadius: 14,

    borderWidth: 1,
    borderColor: COLORS.slate200,

    paddingHorizontal: 12,
  },

  healthRow: {
    minHeight: 58,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  healthLeft: {
    flexDirection: "row",
    alignItems: "center",

    flex: 1,

    paddingRight: 10,
  },

  healthDot: {
    width: 8,
    height: 8,

    borderRadius: 4,

    backgroundColor: COLORS.green,

    marginRight: 9,
  },

  healthTextContainer: {
    flex: 1,
  },

  healthTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.slate900,
  },

  healthSubtitle: {
    fontSize: 9,
    color: COLORS.slate500,

    marginTop: 1,
  },

  healthDivider: {
    height: 1,
    backgroundColor: COLORS.slate200,
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footer: {
    marginTop: 20,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 5,

    paddingBottom: 10,
  },

  footerText: {
    fontSize: 10,
    color: COLORS.slate500,
    fontWeight: "600",

    textAlign: "center",
  },

  /* =======================================================
     PRESS EFFECT
  ======================================================= */

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});