// src/app/super-admin/branch/[id].tsx
import React, { useCallback, useEffect, useState } from "react";
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
import { Stack, useLocalSearchParams } from "expo-router";
import {
  Building2,
  Siren,
  Users,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Ambulance,
  Car,
  UserCog,
  Mail,
  MapPin,
  Activity,
  X,
} from "lucide-react-native";

import { RoleGate } from "@/components/role-gate";
import { apiFetch } from "@/lib/api-client";

const COLORS = {
  primary: "#E11D48",
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

type BranchAdmin = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  added_at: string | null;
};

type BranchDetail = {
  id: string;
  name: string;
  email: string;
  location: string;
  status: boolean;
  created_at: string;
  admin_count: number;
  responder_count: number;
  vehicle_count: number;
  available_vehicle_count: number;
  active_incident_count: number;
  total_incident_count: number;
  incidents_last_30_days: number;
  admins: BranchAdmin[];
};

export default function BranchDetailScreen() {
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
      <BranchDetailContent />
    </RoleGate>
  );
}

function BranchDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) return;
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setLoadError("");
      try {
        const data = await apiFetch<BranchDetail>(
          `/api/v1/superadmin/branches/${id}`
        );
        if (!data || typeof data !== "object") {
          throw new Error("The server returned an invalid branch.");
        }
        setBranch(data);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load this branch."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load("initial");
  }, [load]);

  const openAdd = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setCreateError("");
    setModalVisible(true);
  };

  const closeAdd = () => {
    if (creating) return;
    setModalVisible(false);
  };

  const handleAddAdmin = async () => {
    if (creating) return;
    setCreateError("");

    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim().toLowerCase();

    if (!fn || !ln) {
      setCreateError("Please enter the admin's first and last name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setCreateError("Please enter a valid email address.");
      return;
    }

    setCreating(true);
    try {
      await apiFetch(`/api/v1/superadmin/branches/${id}/admins`, {
        method: "POST",
        body: JSON.stringify({ first_name: fn, last_name: ln, email: em }),
      });
      setModalVisible(false);
      await load("refresh");
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Couldn't add the admin."
      );
    } finally {
      setCreating(false);
    }
  };

  const stats = branch
    ? [
        {
          label: "Admins",
          value: branch.admin_count,
          bg: "#ECFDF5",
          icon: <Users size={18} color={COLORS.green} strokeWidth={2.2} />,
        },
        {
          label: "Responders",
          value: branch.responder_count,
          bg: "#FFFBEB",
          icon: <Ambulance size={18} color={COLORS.amber} strokeWidth={2.2} />,
        },
        {
          label: "Vehicles",
          value: branch.vehicle_count,
          secondary: `${branch.available_vehicle_count} available`,
          bg: "#F5F3FF",
          icon: <Car size={18} color="#7C3AED" strokeWidth={2.2} />,
        },
        {
          label: "Active incidents",
          value: branch.active_incident_count,
          bg: "#EFF6FF",
          icon: <Siren size={18} color="#2563EB" strokeWidth={2.2} />,
        },
        {
          label: "Incidents (30 days)",
          value: branch.incidents_last_30_days,
          bg: "#FFF1F2",
          icon: <Activity size={18} color={COLORS.primary} strokeWidth={2.2} />,
        },
        {
          label: "All-time incidents",
          value: branch.total_incident_count,
          bg: COLORS.slate100,
          icon: <Building2 size={18} color={COLORS.slate700} strokeWidth={2.2} />,
        },
      ]
    : [];

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: branch?.name ?? "Branch" }} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load("refresh")}
            tintColor={COLORS.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : loadError || !branch ? (
          <View style={styles.card}>
            <AlertTriangle size={28} color={COLORS.primary} />
            <Text style={styles.title}>Couldn't load this branch</Text>
            <Text style={styles.muted}>{loadError}</Text>
            <Pressable onPress={() => load("initial")} style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* HEADER */}
            <View style={styles.headerCard}>
              <View style={styles.row}>
                <Text style={styles.branchName} numberOfLines={2}>
                  {branch.name}
                </Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: branch.status ? COLORS.greenLight : COLORS.amberLight },
                  ]}
                >
                  {branch.status ? (
                    <CheckCircle2 size={12} color={COLORS.green} />
                  ) : (
                    <AlertTriangle size={12} color={COLORS.amber} />
                  )}
                  <Text
                    style={[
                      styles.badgeText,
                      { color: branch.status ? COLORS.green : COLORS.amber },
                    ]}
                  >
                    {branch.status ? "Active" : "Pending"}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <MapPin size={13} color={COLORS.slate500} />
                <Text style={styles.metaText}>{branch.location}</Text>
              </View>
              <View style={styles.metaRow}>
                <Mail size={13} color={COLORS.slate500} />
                <Text style={styles.metaText}>{branch.email}</Text>
              </View>

              {!branch.status && (
                <Text style={styles.pendingNote}>
                  This branch becomes active once your subscription payment is
                  completed.
                </Text>
              )}
            </View>

            {/* STATS */}
            <View style={styles.statsGrid}>
              {stats.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                    {s.icon}
                  </View>
                  <Text style={styles.statNumber}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  {"secondary" in s && s.secondary ? (
                    <Text style={styles.statSecondary}>{s.secondary}</Text>
                  ) : null}
                </View>
              ))}
            </View>

            {/* ADMINS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Branch admins</Text>
              <Pressable
                onPress={openAdd}
                style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
              >
                <Plus size={15} color={COLORS.white} strokeWidth={2.5} />
                <Text style={styles.addBtnText}>Add Admin</Text>
              </Pressable>
            </View>

            {branch.admins.length === 0 ? (
              <View style={styles.card}>
                <UserCog size={28} color={COLORS.slate300} />
                <Text style={styles.title}>No admins yet</Text>
                <Text style={styles.muted}>
                  Add an admin so this branch can manage its responders and
                  vehicles.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {branch.admins.map((a) => (
                  <View key={a.user_id} style={styles.adminCard}>
                    <View style={styles.adminIcon}>
                      <UserCog size={18} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminName} numberOfLines={1}>
                        {a.full_name || a.email || "Admin"}
                      </Text>
                      {a.email ? (
                        <Text style={styles.metaText} numberOfLines={1}>
                          {a.email}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.roleText}>
                      {a.role === "system_user" ? "System user" : "Admin"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ADD ADMIN MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeAdd}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.modalTitle}>Add Admin</Text>
                <Text style={styles.modalSubtitle} numberOfLines={2}>
                  They'll sign in to {branch?.name ?? "this branch"} with an
                  email code.
                </Text>
              </View>
              <Pressable onPress={closeAdd} disabled={creating} style={styles.close}>
                <X size={18} color={COLORS.slate700} />
              </Pressable>
            </View>

            <Text style={styles.label}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              editable={!creating}
              maxLength={80}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Jane"
              placeholderTextColor={COLORS.slate500}
            />

            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              editable={!creating}
              maxLength={80}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Wanjiru"
              placeholderTextColor={COLORS.slate500}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              editable={!creating}
              maxLength={254}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="jane@yourorg.co.ke"
              placeholderTextColor={COLORS.slate500}
            />

            {createError ? (
              <View style={styles.errorBox}>
                <AlertTriangle size={15} color="#B91C1C" />
                <Text style={styles.errorText}>{createError}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable onPress={closeAdd} disabled={creating} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAddAdmin}
                disabled={creating}
                style={[styles.submit, creating && { opacity: 0.7 }]}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Plus size={16} color={COLORS.white} strokeWidth={2.5} />
                )}
                <Text style={styles.submitText}>
                  {creating ? "Adding..." : "Add admin"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: BOTTOM_CLEARANCE },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingState: { alignItems: "center", paddingVertical: 60 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 15, fontWeight: "900", color: COLORS.slate900, textAlign: "center" },
  muted: { fontSize: 12, color: COLORS.slate500, textAlign: "center", lineHeight: 18 },
  retry: {
    marginTop: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { color: COLORS.white, fontSize: 12, fontWeight: "800" },

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    padding: 14,
    gap: 6,
  },
  branchName: { flex: 1, fontSize: 18, fontWeight: "900", color: COLORS.slate900, paddingRight: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 9, fontWeight: "900" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 11, color: COLORS.slate500, fontWeight: "600", flexShrink: 1 },
  pendingNote: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.amber,
    backgroundColor: COLORS.amberLight,
    padding: 8,
    borderRadius: 8,
    lineHeight: 16,
  },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
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
  statSecondary: { marginTop: 2, fontSize: 9, color: COLORS.green, fontWeight: "700" },

  sectionHeader: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: COLORS.slate900 },
  addBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  addBtnText: { color: COLORS.white, fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },

  adminCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  adminIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
  adminName: { fontSize: 13, fontWeight: "900", color: COLORS.slate900 },
  roleText: { fontSize: 10, fontWeight: "800", color: COLORS.slate600 },

  backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 28,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: "900", color: COLORS.slate900 },
  modalSubtitle: { marginTop: 2, fontSize: 10, color: COLORS.slate500, lineHeight: 15 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 11, fontWeight: "800", color: COLORS.slate700, marginBottom: 6 },
  input: {
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
  errorText: { flex: 1, color: "#B91C1C", fontSize: 12, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  cancel: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 13, fontWeight: "800", color: COLORS.slate700 },
  submit: {
    flex: 1.4,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  submitText: { fontSize: 13, fontWeight: "800", color: COLORS.white },
});