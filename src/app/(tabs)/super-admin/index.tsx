// src/app/super-admin/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
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
  Mail,
  ChevronRight,
  X,
} from "lucide-react-native";

import { RoleGate } from "@/components/role-gate";
import { apiFetch } from "@/lib/api-client";

/* =========================================================
   COLORS
========================================================= */

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

const BOTTOM_CLEARANCE = 170;

/* =========================================================
   API ENDPOINTS
========================================================= */

const API_ENDPOINTS = {
  overview: "/api/v1/superadmin/overview",
  branches: "/api/v1/superadmin/branches",
};

/* =========================================================
   API TYPES
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

  /*
   * core.branch.status is BOOLEAN.
   *
   * true  = active (payment made)
   * false = pending (default for a new branch)
   */
  status: boolean;

  admin_count: number;
  responder_count: number;

  created_at: string;
};

type CreateBranchPayload = {
  name: string;
  email: string;
  location: string;
};

type StatusFilter = "All" | "Active" | "Pending";

/* =========================================================
   SCREEN ENTRY
========================================================= */

export default function SuperAdminScreen() {
  return (
    <RoleGate
      kinds={["super_admin"]}
      redirectTo="/home"
      loadingFallback={
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      }
    >
      <SuperAdminContent />
    </RoleGate>
  );
}

/* =========================================================
   CONTENT
========================================================= */

function SuperAdminContent() {
  const router = useRouter();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("All");

  /* ---------------------------------------------------------
     ADD BRANCH MODAL
  --------------------------------------------------------- */

  const [modalVisible, setModalVisible] = useState(false);

  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [branchEmail, setBranchEmail] = useState("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  /* =========================================================
     LOAD OVERVIEW + BRANCHES
  ========================================================= */

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError("");

      try {
        const [overviewData, branchesData] = await Promise.all([
          apiFetch<Overview>(API_ENDPOINTS.overview),
          apiFetch<Branch[]>(API_ENDPOINTS.branches),
        ]);

        if (!overviewData || typeof overviewData !== "object") {
          throw new Error(
            "The server returned an invalid organization overview."
          );
        }

        if (!Array.isArray(branchesData)) {
          throw new Error("The server returned an invalid branch list.");
        }

        setOverview(overviewData);
        setBranches(branchesData);
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : "Failed to load your organization."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData("initial");
  }, [loadData]);

  /* =========================================================
     FILTER BRANCHES
  ========================================================= */

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
            ? branch.status === true
            : branch.status === false;

      return matchesSearch && matchesStatus;
    });
  }, [search, filterStatus, branches]);

  /* =========================================================
     OPEN / CLOSE ADD BRANCH
  ========================================================= */

  const openAddBranch = () => {
    if (creating) return;

    setBranchName("");
    setBranchLocation("");
    setBranchEmail("");
    setCreateError("");

    setModalVisible(true);
  };

  const closeAddBranch = () => {
    if (creating) return;

    setModalVisible(false);
    setCreateError("");
  };

  /* =========================================================
     OPEN BRANCH DETAIL
  ========================================================= */

  const openBranch = (branchId: string) => {
    router.push(`./super-admin/branch/${branchId}`);
  };

  /* =========================================================
     CREATE BRANCH
  ========================================================= */

  const handleCreateBranch = async () => {
    if (creating) return;

    setCreateError("");

    const name = branchName.trim();
    const location = branchLocation.trim();
    const email = branchEmail.trim().toLowerCase();

    if (!name) {
      setCreateError("Please enter the branch name.");
      return;
    }

    if (!location) {
      setCreateError("Please enter the branch location.");
      return;
    }

    if (!email) {
      setCreateError("Please enter the branch email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setCreateError("Please enter a valid email address.");
      return;
    }

    const payload: CreateBranchPayload = { name, email, location };

    setCreating(true);

    try {
      /*
       * The backend creates the branch as PENDING (status = false).
       * It becomes active once the subscription payment is applied.
       * organization_id is never sent: it comes from the
       * authenticated super_admin.
       */
      await apiFetch<Branch>(API_ENDPOINTS.branches, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setModalVisible(false);

      setBranchName("");
      setBranchLocation("");
      setBranchEmail("");
      setCreateError("");

      await loadData("refresh");
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Couldn't create the branch."
      );
    } finally {
      setCreating(false);
    }
  };

  /* =========================================================
     HELPERS
  ========================================================= */

  const formatDate = (value: string) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const organizationTypeLabel =
    overview?.organization_type === "service_provider"
      ? "Service Provider"
      : overview?.organization_type === "client"
        ? "Client Organization"
        : overview?.organization_type || "";

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <View style={styles.root}>
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
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={COLORS.primary} size="large" />

            <Text style={styles.centeredText}>
              Loading your organization…
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorCard}>
            <AlertTriangle size={28} color={COLORS.primary} />

            <Text style={styles.centeredTitle}>
              Couldn't load your organization
            </Text>

            <Text style={styles.centeredText}>{loadError}</Text>

            <Pressable
              onPress={() => loadData("initial")}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <RefreshCw size={15} color={COLORS.white} strokeWidth={2.3} />

              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ORGANIZATION HEADER */}

            <View style={styles.welcomeSection}>
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeTitle} numberOfLines={2}>
                  Organization Overview
                </Text>

                <Text style={styles.organizationNameHeader} numberOfLines={2}>
                  {overview?.organization_name || "Your organization"}
                </Text>

                {organizationTypeLabel ? (
                  <Text style={styles.organizationType}>
                    {organizationTypeLabel}
                  </Text>
                ) : null}

                <Text style={styles.welcomeSubtitle}>
                  Monitor your branches, admins and responders.
                </Text>
              </View>

              <Pressable
                onPress={() => loadData("refresh")}
                disabled={refreshing}
                style={({ pressed }) => [
                  styles.refreshButton,
                  pressed && styles.pressed,
                ]}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={COLORS.slate700} />
                ) : (
                  <RefreshCw
                    size={17}
                    color={COLORS.slate700}
                    strokeWidth={2.2}
                  />
                )}
              </Pressable>
            </View>

            {/* STAT CARDS */}

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: "#FFF1F2" }]}>
                  <Building2
                    size={18}
                    color={COLORS.primary}
                    strokeWidth={2.2}
                  />
                </View>

                <Text style={styles.statNumber}>
                  {overview?.branch_count ?? 0}
                </Text>

                <Text style={styles.statLabel}>Branches</Text>

                <Text style={styles.statSecondary}>
                  {overview?.active_branch_count ?? 0} active
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: "#ECFDF5" }]}>
                  <Users size={18} color={COLORS.green} strokeWidth={2.2} />
                </View>

                <Text style={styles.statNumber}>
                  {overview?.admin_count ?? 0}
                </Text>

                <Text style={styles.statLabel}>Admins</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: "#FFFBEB" }]}>
                  <Ambulance
                    size={18}
                    color={COLORS.amber}
                    strokeWidth={2.2}
                  />
                </View>

                <Text style={styles.statNumber}>
                  {overview?.responder_count ?? 0}
                </Text>

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
                disabled={creating}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed && styles.pressed,
                ]}
              >
                <Plus size={18} color={COLORS.white} strokeWidth={2.5} />

                <Text style={styles.primaryActionText}>Add Branch</Text>
              </Pressable>
            </View>

            {/* BRANCHES HEADER */}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Branches</Text>

              <Text style={styles.countText}>
                {filteredBranches.length} shown
              </Text>
            </View>

            {/* SEARCH */}

            <View style={styles.searchBox}>
              <Search size={17} color={COLORS.slate500} strokeWidth={2} />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, location or email..."
                placeholderTextColor={COLORS.slate500}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <X size={16} color={COLORS.slate500} />
                </Pressable>
              )}
            </View>

            {/* FILTERS */}

            <View style={styles.filterPillsRow}>
              {(["All", "Active", "Pending"] as const).map((tab) => {
                const isSelected = filterStatus === tab;

                return (
                  <Pressable
                    key={tab}
                    onPress={() => setFilterStatus(tab)}
                    style={[
                      styles.filterPill,
                      isSelected && styles.filterPillActive,
                    ]}
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
                  <Building2 size={28} color={COLORS.slate300} />

                  <Text style={styles.centeredTitle}>
                    {branches.length === 0
                      ? "No branches yet"
                      : "No matching branches"}
                  </Text>

                  <Text style={styles.centeredText}>
                    {branches.length === 0
                      ? "Add your first branch to get started."
                      : "Try a different search or filter."}
                  </Text>

                  {branches.length === 0 && (
                    <Pressable
                      onPress={openAddBranch}
                      style={({ pressed }) => [
                        styles.emptyAddButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Plus size={15} color={COLORS.white} />

                      <Text style={styles.emptyAddButtonText}>Add Branch</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                filteredBranches.map((branch) => (
                  <Pressable
                    key={branch.id}
                    onPress={() => openBranch(branch.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${branch.name}`}
                    style={({ pressed }) => [
                      styles.organizationCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    {/* TOP ROW */}

                    <View style={styles.orgTopRow}>
                      <View style={styles.organizationIcon}>
                        <Building2
                          size={19}
                          color={COLORS.primary}
                          strokeWidth={2}
                        />
                      </View>

                      <View style={styles.organizationInfo}>
                        <Text style={styles.organizationName} numberOfLines={1}>
                          {branch.name}
                        </Text>

                        <Text
                          style={styles.organizationLocation}
                          numberOfLines={1}
                        >
                          {branch.location}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          branch.status
                            ? styles.activeBadge
                            : styles.pendingBadge,
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
                            branch.status
                              ? styles.activeText
                              : styles.pendingText,
                          ]}
                        >
                          {branch.status ? "Active" : "Pending"}
                        </Text>
                      </View>

                      <ChevronRight
                        size={16}
                        color={COLORS.slate300}
                        style={styles.chevron}
                      />
                    </View>

                    {/* META */}

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
                          {branch.responder_count === 1
                            ? "Responder"
                            : "Responders"}
                        </Text>
                      </View>
                    </View>

                    {/* EMAIL */}

                    <View style={styles.metaItem}>
                      <Mail size={13} color={COLORS.slate500} />

                      <Text style={styles.metaText} numberOfLines={1}>
                        {branch.email}
                      </Text>
                    </View>

                    {/* CREATED DATE */}

                    {branch.created_at ? (
                      <Text style={styles.createdText}>
                        Created {formatDate(branch.created_at)}
                      </Text>
                    ) : null}
                  </Pressable>
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

      {/* ADD BRANCH MODAL */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeAddBranch}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Add Branch</Text>

                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  Add a new branch to{" "}
                  {overview?.organization_name || "your organization"}. It
                  stays pending until payment is made.
                </Text>
              </View>

              <Pressable
                onPress={closeAddBranch}
                disabled={creating}
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
              maxLength={150}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Location</Text>

            <TextInput
              value={branchLocation}
              onChangeText={setBranchLocation}
              placeholder="Westlands, Nairobi"
              placeholderTextColor={COLORS.slate500}
              style={styles.modalInput}
              editable={!creating}
              maxLength={300}
              autoCapitalize="words"
              autoCorrect={false}
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
              maxLength={254}
            />

            {createError ? (
              <View style={styles.errorBox}>
                <AlertTriangle size={15} color="#B91C1C" />

                <Text style={styles.errorText}>{createError}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeAddBranch}
                disabled={creating}
                style={({ pressed }) => [
                  styles.modalCancel,
                  pressed && styles.pressed,
                ]}
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
                  <>
                    <ActivityIndicator size="small" color={COLORS.white} />

                    <Text style={styles.modalSubmitText}>Creating...</Text>
                  </>
                ) : (
                  <>
                    <Plus size={16} color={COLORS.white} strokeWidth={2.5} />

                    <Text style={styles.modalSubmitText}>Create branch</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: BOTTOM_CLEARANCE,
  },

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

  loadingState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },

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

  emptyState: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 7,
  },

  retryButton: {
    marginTop: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  retryButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },

  welcomeSection: {
    marginTop: 6,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  welcomeTextContainer: {
    flex: 1,
    paddingRight: 8,
  },

  welcomeTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.slate900,
  },

  organizationNameHeader: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primary,
  },

  organizationType: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.slate600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  welcomeSubtitle: {
    marginTop: 3,
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
    marginLeft: 10,
  },

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

  statSecondary: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.green,
    fontWeight: "700",
  },

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

  emptyAddButton: {
    marginTop: 8,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  emptyAddButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
  },

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
    paddingRight: 8,
  },

  organizationName: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.slate900,
  },

  organizationLocation: {
    fontSize: 10,
    color: COLORS.slate500,
    marginTop: 1,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },

  chevron: {
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
    flexShrink: 1,
  },

  metaText: {
    fontSize: 10,
    color: COLORS.slate500,
    fontWeight: "700",
    flexShrink: 1,
  },

  createdText: {
    fontSize: 9,
    color: COLORS.slate500,
    marginTop: -2,
  },

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
    marginBottom: 16,
  },

  modalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.slate900,
  },

  modalSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.slate500,
    lineHeight: 15,
  },

  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.slate100,
    alignItems: "center",
    justifyContent: "center",
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.slate700,
    marginBottom: 6,
  },

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
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  errorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
  },

  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },

  modalCancel: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: "center",
    justifyContent: "center",
  },

  modalCancelText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.slate700,
  },

  modalSubmit: {
    flex: 1.4,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  modalSubmitDisabled: {
    opacity: 0.7,
  },

  modalSubmitText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.white,
  },
});