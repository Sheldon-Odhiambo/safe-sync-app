import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Building2,
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
  Mail,
  X,
} from "lucide-react-native";

import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api-client";

const COLORS = {
  primary: "#E11D48",
  primaryDark: "#BE123C",
  background: "#F8FAFC",
  white: "#FFFFFF",
  slate900: "#0F172A",
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
   TYPES — mirror SuperAdminOverviewResponse / SuperAdminBranchResponse
========================================================= */

type Overview = {
  organization_id: string;
  organization_name: string;
  organization_type: string;
  branch_count: number;
  active_branch_count: number;
  admin_count: number;
  responder_count: number;
  active_incident_count: number;
};

type Branch = {
  id: string;
  name: string;
  email: string;
  location: string;
  status: boolean; // true = Active, false = Pending
  admin_count: number;
  responder_count: number;
  created_at: string;
};

type StatusFilter = "All" | "Active" | "Pending";

export default function SuperAdminScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const isSuperAdmin = profile?.userKind === "super_admin";

  const [overview, setOverview] = useState<Overview | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("All");

  // Add-branch modal
  const [modalVisible, setModalVisible] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [branchEmail, setBranchEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  /* ---------------------------------------------------------
     LOAD DATA
  --------------------------------------------------------- */

  const loadData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError("");

    try {
      const [overviewData, branchesData] = await Promise.all([
        apiFetch<Overview>("/api/v1/superadmin/overview"),
        apiFetch<Branch[]>("/api/v1/superadmin/branches"),
      ]);

      setOverview(overviewData);
      setBranches(branchesData);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load your organization."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin, loadData]);

  /* ---------------------------------------------------------
     FILTERED BRANCHES
  --------------------------------------------------------- */

  const filteredBranches = useMemo(() => {
    const value = search.trim().toLowerCase();

    return branches.filter((branch) => {
      const matchesSearch =
        !value ||
        branch.name.toLowerCase().includes(value) ||
        branch.location.toLowerCase().includes(value) ||
        branch.email.toLowerCase().includes(value);

      const matchesStatus =
        filterStatus === "All"
          ? true
          : filterStatus === "Active"
          ? branch.status
          : !branch.status;

      return matchesSearch && matchesStatus;
    });
  }, [search, filterStatus, branches]);

  /* ---------------------------------------------------------
     ACTIONS
  --------------------------------------------------------- */

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  const openAddBranch = () => {
    setBranchName("");
    setBranchLocation("");
    setBranchEmail("");
    setCreateError("");
    setModalVisible(true);
  };

  const handleCreateBranch = async () => {
    setCreateError("");

    const name = branchName.trim();
    const location = branchLocation.trim();
    const email = branchEmail.trim().toLowerCase();

    if (!name || !location || !email) {
      setCreateError("Branch name, location and email are all required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCreateError("Please enter a valid email address.");
      return;
    }

    setCreating(true);

    try {
      const created = await apiFetch<Branch>("/api/v1/superadmin/branches", {
        method: "POST",
        body: JSON.stringify({ name, location, email }),
      });

      setBranches((current) => [created, ...current]);
      setOverview((current) =>
        current
          ? {
              ...current,
              branch_count: current.branch_count + 1,
              active_branch_count:
                current.active_branch_count + (created.status ? 1 : 0),
            }
          : current
      );

      setModalVisible(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Couldn't create the branch."
      );
    } finally {
      setCreating(false);
    }
  };

  /* ---------------------------------------------------------
     ACCESS GUARD — the tab is hidden for other roles, but the
     route is still reachable directly.
  --------------------------------------------------------- */

  if (!isSuperAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ShieldCheck size={32} color={COLORS.slate500} strokeWidth={2} />
          <Text style={styles.centeredTitle}>Super admin access only</Text>
          <Text style={styles.centeredText}>
            This area is only available to your organization's super admin.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData("refresh")}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logo}>
              <ShieldCheck size={22} color={COLORS.white} strokeWidth={2.3} />
            </View>

            <View style={styles.headerTextBlock}>
              <Text style={styles.brand}>SafeSync</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {profile?.organization?.name ?? "Super Admin"}
              </Text>
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

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.centeredText}>Loading your organization…</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.centeredTitle}>Couldn't load your organization</Text>
            <Text style={styles.centeredText}>{loadError}</Text>
            <Pressable
              onPress={() => loadData()}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <RefreshCw size={15} color={COLORS.white} strokeWidth={2.3} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* OVERVIEW HEADER */}
            <View style={styles.welcomeSection}>
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeTitle}>Organization Overview</Text>
                <Text style={styles.welcomeSubtitle}>
                  Monitor your branches, admins and responders.
                </Text>
              </View>

              <Pressable
                onPress={() => loadData("refresh")}
                style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
              >
                <RefreshCw size={17} color={COLORS.slate700} strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* STAT CARDS */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: "#FFF1F2" }]}>
                  <Building2 size={18} color={COLORS.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.statNumber}>{overview?.branch_count ?? 0}</Text>
                <Text style={styles.statLabel}>Branches</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: "#ECFDF5" }]}>
                  <Users size={18} color={COLORS.green} strokeWidth={2.2} />
                </View>
                <Text style={styles.statNumber}>{overview?.admin_count ?? 0}</Text>
                <Text style={styles.statLabel}>Admins</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: "#FFFBEB" }]}>
                  <Ambulance size={18} color={COLORS.amber} strokeWidth={2.2} />
                </View>
                <Text style={styles.statNumber}>{overview?.responder_count ?? 0}</Text>
                <Text style={styles.statLabel}>Responders</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: "#EFF6FF" }]}>
                  <Siren size={18} color="#2563EB" strokeWidth={2.2} />
                </View>
                <Text style={styles.statNumber}>
                  {overview?.active_incident_count ?? 0}
                </Text>
                <Text style={styles.statLabel}>Active incidents</Text>
              </View>
            </View>

            {/* QUICK ACTIONS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>

            <View style={styles.quickActions}>
              <Pressable
                onPress={openAddBranch}
                style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
              >
                <Plus size={18} color={COLORS.white} strokeWidth={2.5} />
                <Text style={styles.primaryActionText}>Add Branch</Text>
              </Pressable>
            </View>

            {/* SEARCH & FILTER */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Branches</Text>
              <Text style={styles.countText}>{filteredBranches.length} shown</Text>
            </View>

            <View style={styles.searchBox}>
              <Search size={17} color={COLORS.slate500} strokeWidth={2} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, location or email..."
                placeholderTextColor={COLORS.slate500}
                style={styles.searchInput}
              />
            </View>

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
                      style={[
                        styles.filterPillText,
                        isSelected && styles.filterPillTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* BRANCH LIST */}
            <View style={styles.organizationList}>
              {filteredBranches.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.centeredTitle}>
                    {branches.length === 0 ? "No branches yet" : "No matching branches"}
                  </Text>
                  <Text style={styles.centeredText}>
                    {branches.length === 0
                      ? "Add your first branch to get started."
                      : "Try a different search or filter."}
                  </Text>
                </View>
              ) : (
                filteredBranches.map((branch) => (
                  <View key={branch.id} style={styles.organizationCard}>
                    <View style={styles.orgTopRow}>
                      <View style={styles.organizationIcon}>
                        <Building2 size={19} color={COLORS.primary} strokeWidth={2} />
                      </View>

                      <View style={styles.organizationInfo}>
                        <Text style={styles.organizationName} numberOfLines={1}>
                          {branch.name}
                        </Text>
                        <Text style={styles.organizationLocation} numberOfLines={1}>
                          {branch.location}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          branch.status ? styles.activeBadge : styles.pendingBadge,
                        ]}
                      >
                        {branch.status ? (
                          <CheckCircle2 size={12} color={COLORS.green} />
                        ) : (
                          <AlertTriangle size={12} color={COLORS.amber} />
                        )}
                        <Text
                          style={[
                            styles.statusText,
                            branch.status ? styles.activeText : styles.pendingText,
                          ]}
                        >
                          {branch.status ? "Active" : "Pending"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.organizationMeta}>
                      <View style={styles.metaItem}>
                        <UserCog size={13} color={COLORS.slate500} />
                        <Text style={styles.metaText}>
                          {branch.admin_count}{" "}
                          {branch.admin_count === 1 ? "Admin" : "Admins"}
                        </Text>
                      </View>

                      <View style={styles.metaItem}>
                        <Ambulance size={13} color={COLORS.slate500} />
                        <Text style={styles.metaText}>
                          {branch.responder_count}{" "}
                          {branch.responder_count === 1 ? "Responder" : "Responders"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaItem}>
                      <Mail size={13} color={COLORS.slate500} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {branch.email}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <ShieldCheck size={14} color={COLORS.slate500} />
          <Text style={styles.footerText}>
            SafeSync Super Admin • Enterprise Command Center
          </Text>
        </View>
      </ScrollView>

      {/* =========================================================
          ADD BRANCH MODAL
      ========================================================= */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !creating && setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Branch</Text>
              <Pressable
                onPress={() => !creating && setModalVisible(false)}
                style={styles.modalClose}
              >
                <X size={18} color={COLORS.slate700} strokeWidth={2.3} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Branch name</Text>
            <TextInput
              value={branchName}
              onChangeText={setBranchName}
              placeholder="Westlands Branch"
              placeholderTextColor={COLORS.slate500}
              style={styles.modalInput}
              editable={!creating}
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              value={branchLocation}
              onChangeText={setBranchLocation}
              placeholder="Westlands, Nairobi"
              placeholderTextColor={COLORS.slate500}
              style={styles.modalInput}
              editable={!creating}
            />

            <Text style={styles.inputLabel}>Branch email</Text>
            <TextInput
              value={branchEmail}
              onChangeText={setBranchEmail}
              placeholder="westlands@yourorg.co.ke"
              placeholderTextColor={COLORS.slate500}
              style={styles.modalInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!creating}
            />

            {createError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{createError}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setModalVisible(false)}
                disabled={creating}
                style={({ pressed }) => [styles.modalCancel, pressed && styles.pressed]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleCreateBranch}
                disabled={creating}
                style={({ pressed }) => [
                  styles.modalSubmit,
                  pressed && styles.pressed,
                  creating && styles.modalSubmitDisabled,
                ]}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSubmitText}>Create branch</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 36 },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  centeredTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.slate900,
    textAlign: "center",
  },
  centeredText: {
    fontSize: 12,
    color: COLORS.slate500,
    textAlign: "center",
    lineHeight: 18,
  },
  loadingState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  errorCard: {
    marginTop: 14,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 6 },
  retryButton: {
    marginTop: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  retryButtonText: { color: COLORS.white, fontSize: 12, fontWeight: "800" },

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
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 },
  headerTextBlock: { flex: 1 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  brand: { fontSize: 16, fontWeight: "900", color: COLORS.slate900 },
  headerSubtitle: { fontSize: 10, color: COLORS.slate500, fontWeight: "700" },
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
  logoutText: { fontSize: 11, color: COLORS.primary, fontWeight: "800" },

  // Welcome
  welcomeSection: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeTitle: { fontSize: 20, fontWeight: "900", color: COLORS.slate900 },
  welcomeSubtitle: { marginTop: 2, fontSize: 11, color: COLORS.slate500 },
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
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  statNumber: { fontSize: 18, fontWeight: "900", color: COLORS.slate900 },
  statLabel: { marginTop: 2, fontSize: 10, color: COLORS.slate500, fontWeight: "700" },

  // Sections / actions
  sectionHeader: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: COLORS.slate900 },
  countText: { fontSize: 10, color: COLORS.slate500, fontWeight: "700" },
  quickActions: { flexDirection: "row", gap: 8 },
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
  primaryActionText: { color: COLORS.white, fontSize: 11, fontWeight: "800" },

  // Search & filter
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
  searchInput: { flex: 1, marginLeft: 8, fontSize: 12, color: COLORS.slate900 },
  filterPillsRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  filterPillActive: { backgroundColor: COLORS.slate900, borderColor: COLORS.slate900 },
  filterPillText: { fontSize: 10, fontWeight: "700", color: COLORS.slate600 },
  filterPillTextActive: { color: COLORS.white },

  // Branch list
  organizationList: { marginTop: 10, gap: 10 },
  organizationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    padding: 12,
    gap: 8,
  },
  orgTopRow: { flexDirection: "row", alignItems: "center" },
  organizationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  organizationInfo: { flex: 1, paddingRight: 8 },
  organizationName: { fontSize: 13, fontWeight: "900", color: COLORS.slate900 },
  organizationLocation: { fontSize: 10, color: COLORS.slate500, marginTop: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadge: { backgroundColor: COLORS.greenLight },
  pendingBadge: { backgroundColor: COLORS.amberLight },
  statusText: { fontSize: 8, fontWeight: "900" },
  activeText: { color: COLORS.green },
  pendingText: { color: COLORS.amber },
  organizationMeta: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 10, color: COLORS.slate500, fontWeight: "700" },

  // Footer
  footer: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  footerText: { fontSize: 10, color: COLORS.slate500, fontWeight: "600" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: "900", color: COLORS.slate900 },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: { fontSize: 11, fontWeight: "800", color: COLORS.slate700, marginBottom: 6 },
  modalInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.slate900,
    marginBottom: 12,
  },
  errorBox: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: COLORS.redLight,
  },
  errorText: { color: "#B91C1C", fontSize: 12, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  modalCancel: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { fontSize: 13, fontWeight: "800", color: COLORS.slate700 },
  modalSubmit: {
    flex: 1.4,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitDisabled: { opacity: 0.7 },
  modalSubmitText: { fontSize: 13, fontWeight: "800", color: COLORS.white },
});