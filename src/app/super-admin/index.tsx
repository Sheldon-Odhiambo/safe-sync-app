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

type Organization = {
  id: number;
  name: string;
  location: string;
  code: string;
  admins: number;
  responders: number;
  walletBalance: number; // 👈 ADDED: Sub-wallet balance for emergency funds
  status: "Active" | "Pending";
};

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

export default function SuperAdminScreen() {
  const router = useRouter();

  // State
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Active" | "Pending">("All");
  const [masterWallet, setMasterWallet] = useState(2480500);
  const [organizations, setOrganizations] = useState<Organization[]>(INITIAL_ORGANIZATIONS);

  // Filtered organizations
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

  // Actions
  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Super Admin HQ?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          // 👈 FIXED: Route directly back to Sign In
          router.replace("/");
        },
      },
    ]);
  };

  const handleAllocateFunds = (org: Organization) => {
    Alert.alert(
      "Allocate Funds",
      `Transfer KES 25,000 from Corporate HQ Master Wallet to ${org.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer KES 25,000",
          onPress: () => {
            if (masterWallet < 25000) {
              Alert.alert("Error", "Insufficient funds in HQ Master Wallet.");
              return;
            }
            setMasterWallet((prev) => prev - 25000);
            setOrganizations((prev) =>
              prev.map((o) =>
                o.id === org.id
                  ? { ...o, walletBalance: o.walletBalance + 25000 }
                  : o
              )
            );
            Alert.alert(
              "Allocation Successful",
              `Transferred KES 25,000 to ${org.name}. New sub-wallet: KES ${(org.walletBalance + 25000).toLocaleString()}`
            );
          },
        },
      ]
    );
  };

  const handleMasterWalletTopUp = () => {
    Alert.alert(
      "M-PESA Master Deposit",
      "Trigger STK Push to add KES 100,000 into the SafeSync Corporate Escrow Reserve?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deposit KES 100,000",
          onPress: () => {
            setMasterWallet((prev) => prev + 100000);
            Alert.alert("Deposit Confirmed", "KES 100,000 credited to Corporate Wallet.");
          },
        },
      ]
    );
  };

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
      : Alert.alert("Add Organization", "Onboarding form opened.");
  };

  const handleRefresh = () => {
    Alert.alert("Dashboard Refreshed", "Real-time telemetry and ledger updated.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* =========================================================
            HEADER
        ========================================================= */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logo}>
              <ShieldCheck size={22} color={COLORS.white} strokeWidth={2.3} />
            </View>

            <View>
              <Text style={styles.brand}>SafeSync</Text>
              <Text style={styles.headerSubtitle}>Super Admin HQ</Text>
            </View>
          </View>

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          >
            <LogOut size={16} color={COLORS.primary} strokeWidth={2.3} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </View>

        {/* =========================================================
            MASTER CORPORATE WALLET CARD (MOVED TO TOP FOR HIGH VISIBILITY)
        ========================================================= */}
        <View style={styles.walletCard}>
          <View style={styles.walletTopRow}>
            <View style={styles.walletIcon}>
              <Wallet size={20} color={COLORS.white} strokeWidth={2.2} />
            </View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletTitle}>MASTER CORPORATE ESCROW WALLET</Text>
              <Text style={styles.walletAmount}>
                KES {masterWallet.toLocaleString()}
              </Text>
            </View>
          </View>

          <Text style={styles.walletSubtitle}>
            Pre-funded reserve guaranteeing zero-delay paramedic dispatch & instant hospital admission.
          </Text>

          <Pressable
            onPress={handleMasterWalletTopUp}
            style={({ pressed }) => [styles.topUpButton, pressed && styles.pressed]}
          >
            <ArrowUpRight size={16} color={COLORS.white} strokeWidth={2.5} />
            <Text style={styles.topUpButtonText}>Instant M-PESA STK Top-Up</Text>
          </Pressable>
        </View>

        {/* =========================================================
            WELCOME & REFRESH SECTION
        ========================================================= */}
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.welcomeTitle}>System Overview</Text>
            <Text style={styles.welcomeSubtitle}>
              Monitor organizations, sub-wallets, and live dispatches.
            </Text>
          </View>

          <Pressable
            onPress={handleRefresh}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
          >
            <RefreshCw size={17} color={COLORS.slate700} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* =========================================================
            STAT CARDS GRID
        ========================================================= */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FFF1F2" }]}>
              <Building2 size={18} color={COLORS.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.statNumber}>{organizations.length}</Text>
            <Text style={styles.statLabel}>Organizations</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#ECFDF5" }]}>
              <Users size={18} color={COLORS.green} strokeWidth={2.2} />
            </View>
            <Text style={styles.statNumber}>
              {organizations.reduce((sum, o) => sum + o.admins, 0)}
            </Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FFFBEB" }]}>
              <Ambulance size={18} color={COLORS.amber} strokeWidth={2.2} />
            </View>
            <Text style={styles.statNumber}>
              {organizations.reduce((sum, o) => sum + o.responders, 0)}
            </Text>
            <Text style={styles.statLabel}>Responders</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#EFF6FF" }]}>
              <Siren size={18} color="#2563EB" strokeWidth={2.2} />
            </View>
            <Text style={styles.statNumber}>2 Active</Text>
            <Text style={styles.statLabel}>CAD Dispatches</Text>
          </View>
        </View>

        {/* =========================================================
            QUICK ACTIONS
        ========================================================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            onPress={handleAddOrganization}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
          >
            <Plus size={18} color={COLORS.white} strokeWidth={2.5} />
            <Text style={styles.primaryActionText}>Add Branch</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert(
                "CAD Incident Center",
                "2 active incidents currently en-route. Responders mobile."
              )
            }
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
          >
            <Siren size={18} color={COLORS.slate700} strokeWidth={2.2} />
            <Text style={styles.secondaryActionText}>CAD Dispatch Feed</Text>
          </Pressable>
        </View>

        {/* =========================================================
            SEARCH & STATUS FILTER BAR
        ========================================================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Branches & Sub-Wallets</Text>
          <Text style={styles.countText}>{filteredOrganizations.length} shown</Text>
        </View>

        <View style={styles.searchBox}>
          <Search size={17} color={COLORS.slate500} strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search branches by city or code..."
            placeholderTextColor={COLORS.slate500}
            style={styles.searchInput}
          />
        </View>

        {/* STATUS FILTER PILLS */}
        <View style={styles.filterPillsRow}>
          {(["All", "Active", "Pending"] as const).map((tab) => {
            const isSelected = filterStatus === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setFilterStatus(tab)}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
              >
                <Text
                  style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* =========================================================
            ORGANIZATION / BRANCH LIST WITH SUB-WALLETS
        ========================================================= */}
        <View style={styles.organizationList}>
          {filteredOrganizations.map((organization) => (
            <View key={organization.id} style={styles.organizationCard}>
              <View style={styles.orgTopRow}>
                <View style={styles.organizationIcon}>
                  <Building2 size={19} color={COLORS.primary} strokeWidth={2} />
                </View>

                <View style={styles.organizationInfo}>
                  <View style={styles.codeRow}>
                    <Text style={styles.codeBadge}>{organization.code}</Text>
                    <Text style={styles.organizationLocation}>
                      {organization.location}
                    </Text>
                  </View>
                  <Text style={styles.organizationName}>{organization.name}</Text>
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
                    <CheckCircle2 size={12} color={COLORS.green} />
                  ) : (
                    <AlertTriangle size={12} color={COLORS.amber} />
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

              {/* Sub-Wallet Balance Bar */}
              <View style={styles.subWalletBar}>
                <View>
                  <Text style={styles.subWalletLabel}>SUB-WALLET ESCROW</Text>
                  <Text style={styles.subWalletAmount}>
                    KES {organization.walletBalance.toLocaleString()}
                  </Text>
                </View>

                {/* Allocate Action */}
                <Pressable
                  onPress={() => handleAllocateFunds(organization)}
                  style={styles.allocateButton}
                >
                  <Plus size={13} color={COLORS.green} strokeWidth={2.5} />
                  <Text style={styles.allocateButtonText}>Allocate Funds</Text>
                </Pressable>
              </View>

              {/* Meta stats */}
              <View style={styles.organizationMeta}>
                <View style={styles.metaItem}>
                  <UserCog size={13} color={COLORS.slate500} />
                  <Text style={styles.metaText}>{organization.admins} Admins</Text>
                </View>

                <View style={styles.metaItem}>
                  <Ambulance size={13} color={COLORS.slate500} />
                  <Text style={styles.metaText}>
                    {organization.responders} Responders
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* =========================================================
            SYSTEM HEALTH
        ========================================================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>System Health</Text>
        </View>

        <View style={styles.healthCard}>
          <View style={styles.healthRow}>
            <View style={styles.healthLeft}>
              <View style={styles.healthDot} />
              <View>
                <Text style={styles.healthTitle}>Emergency Response CAD Stream</Text>
                <Text style={styles.healthSubtitle}>All telemetry nodes active</Text>
              </View>
            </View>
            <CheckCircle2 size={18} color={COLORS.green} strokeWidth={2.2} />
          </View>

          <View style={styles.healthDivider} />

          <View style={styles.healthRow}>
            <View style={styles.healthLeft}>
              <View style={styles.healthDot} />
              <View>
                <Text style={styles.healthTitle}>Escrow Liquidity Guarantee</Text>
                <Text style={styles.healthSubtitle}>Verified zero-delay reserves</Text>
              </View>
            </View>
            <CheckCircle2 size={18} color={COLORS.green} strokeWidth={2.2} />
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <ShieldCheck size={14} color={COLORS.slate500} />
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  brand: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.slate900,
  },
  headerSubtitle: {
    fontSize: 10,
    color: COLORS.slate500,
    fontWeight: "700",
  },
  logoutButton: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.redLight,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logoutText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "800",
  },

  // Wallet Card
  walletCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: COLORS.slate900,
    padding: 18,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
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
    backgroundColor: "rgba(255, 255, 255, 0.15)",
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
  },
  topUpButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  topUpButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },

  // Welcome Section
  welcomeSection: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.slate900,
  },
  welcomeSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.slate500,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: "center",
    justifyContent: "center",
  },

  // Stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    width: "48.5%",
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
    marginBottom: 6,
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

  // Quick Actions
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
  quickActions: {
    flexDirection: "row",
    gap: 8,
  },
  primaryAction: {
    flex: 1,
    height: 42,
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
    height: 42,
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

  // Search & Filter
  searchBox: {
    height: 42,
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
    fontSize: 12,
    color: COLORS.slate900,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
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

  // Organizations List
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
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  organizationName: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.slate900,
    marginTop: 1,
  },
  organizationLocation: {
    fontSize: 10,
    color: COLORS.slate500,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
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

  // Sub-Wallet Bar
  subWalletBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.slate100,
    padding: 8,
    borderRadius: 8,
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
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  allocateButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.green,
  },

  // Organization Meta
  organizationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
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

  // Health
  healthCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: 12,
  },
  healthRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  healthLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginRight: 9,
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

  // Footer
  footer: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  footerText: {
    fontSize: 10,
    color: COLORS.slate500,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
});