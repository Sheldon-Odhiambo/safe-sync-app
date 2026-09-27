import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  primary: "#DC2626",
  primaryDark: "#B91C1C",
  white: "#FFFFFF",
  black: "#0F172A",
  text: "#1E293B",
  muted: "#64748B",
  lightMuted: "#94A3B8",
  background: "#F8FAFC",
  border: "#E2E8F0",
  secondary: "#F1F5F9",
  success: "#059669",
  successLight: "#ECFDF5",
};

/* =========================================================
   API
========================================================= */

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.safesync.co.ke";

// TODO: wire this to however the app already resolves the signed-in
// user's Supabase session/access token — same TODO as in
// AdminScreen.tsx. Worth extracting into one shared helper once both
// exist, rather than duplicating it per screen.
async function getAccessToken(): Promise<string | null> {
  return null;
}

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
    throw new Error(
      body?.detail ?? `Something went wrong (${response.status}).`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

type EmergencyType = "fire" | "ambulance";

type EmergencyStatus =
  | "pending"
  | "dispatching"
  | "assigned"
  | "accepted"
  | "en_route"
  | "arriving"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "failed";

type EmergencySummary = {
  id: string;
  emergency_type: EmergencyType;
  status: EmergencyStatus;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
};

type EmergencyDetail = EmergencySummary & {
  address: string | null;
  description: string | null;
  responder_id: string | null;
  dispatch_id: string | null;
  estimated_distance_meters: number | null;
  estimated_duration_seconds: number | null;
  estimated_cost: number | null;
  cancelled_at: string | null;
  completed_at: string | null;
};

type EmergencyListResponse = {
  emergencies: EmergencySummary[];
  total: number;
};

const EMERGENCY_TYPE_LABEL: Record<EmergencyType, string> = {
  fire: "Fire Emergency",
  ambulance: "Medical Emergency",
};

const STATUS_META: Record<
  EmergencyStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "#B45309", bg: "#FEF3C7" },
  dispatching: { label: "Dispatching", color: "#B45309", bg: "#FEF3C7" },
  assigned: { label: "Assigned", color: "#B45309", bg: "#FEF3C7" },
  accepted: { label: "Accepted", color: "#2563EB", bg: "#DBEAFE" },
  en_route: { label: "En Route", color: "#2563EB", bg: "#DBEAFE" },
  arriving: { label: "Arriving", color: "#2563EB", bg: "#DBEAFE" },
  arrived: { label: "Arrived", color: "#2563EB", bg: "#DBEAFE" },
  in_progress: { label: "In Progress", color: "#2563EB", bg: "#DBEAFE" },
  completed: { label: "Resolved", color: COLORS.success, bg: COLORS.successLight },
  cancelled: { label: "Cancelled", color: COLORS.muted, bg: COLORS.secondary },
  failed: { label: "Failed", color: "#DC2626", bg: "#FEE2E2" },
};

/* =========================================================
   FORMATTING HELPERS
========================================================= */

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDurationBetween(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function formatCurrency(value: number): string {
  return `KSh ${Math.round(value).toLocaleString("en-KE")}`;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function HistoryScreen() {
  const [items, setItems] = useState<EmergencySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Whenever loadHistory fails — network unreachable, timeout, the
  // backend itself down — we treat it the same way: the app couldn't
  // reach the backend, so we tell the person they're offline rather
  // than surfacing the raw error detail.
  const [isOffline, setIsOffline] = useState(false);

  const [details, setDetails] = useState<Record<string, EmergencyDetail>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setIsOffline(false);

    try {
      const data = await apiFetch<EmergencyListResponse>(
        "/api/v1/emergencies"
      );
      setItems(data.emergencies);
      setTotal(data.total);
    } catch (err) {
      // Any failure to reach/complete the request against the backend
      // is surfaced the same simple way — as being offline — rather
      // than showing the underlying error message.
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Based on the currently loaded page, not the full history — there's
  // no separate stats endpoint, so with more than one page loaded this
  // becomes an approximation. Fine at typical history sizes.
  const resolvedCount = items.filter((item) => item.status === "completed")
    .length;
  const resolvedPercent =
    items.length > 0 ? Math.round((resolvedCount / items.length) * 100) : 0;

  const handleToggleDetails = async (item: EmergencySummary) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(item.id);

    if (details[item.id]) {
      return;
    }

    setDetailLoadingId(item.id);
    try {
      const detail = await apiFetch<EmergencyDetail>(
        `/api/v1/emergencies/${item.id}`
      );
      setDetails((current) => ({ ...current, [item.id]: detail }));
    } catch (err) {
      Alert.alert(
        "You're offline",
        "Couldn't load details for this incident. Check your connection and try again."
      );
      setExpandedId(null);
    } finally {
      setDetailLoadingId(null);
    }
  };

  const handleDownload = (item: EmergencySummary) => {
    Alert.alert(
      "Report",
      `Report ${item.id} would be downloaded here once the backend has a report/document-generation endpoint.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Emergency History</Text>
            <Text style={styles.subtitle}>
              View your previous emergency requests and reports.
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.emptyStateText}>Loading your history…</Text>
            </View>
          ) : isOffline ? (
            <View style={styles.summaryCard}>
              <Text style={styles.offlineIcon}>⚠</Text>
              <Text style={styles.emptyStateTitle}>You're offline</Text>
              <Text style={styles.emptyStateText}>
                Check your internet connection and try again.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadHistory}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* SUMMARY */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{total}</Text>
                  <Text style={styles.summaryLabel}>Total incidents</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{resolvedPercent}%</Text>
                  <Text style={styles.summaryLabel}>Resolved</Text>
                </View>
              </View>

              {/* SECTION TITLE */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Previous incidents</Text>
                <Text style={styles.sectionCount}>{items.length} shown</Text>
              </View>

              {items.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>
                    No history available
                  </Text>
                </View>
              ) : (
                items.map((item) => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    detail={details[item.id]}
                    expanded={expandedId === item.id}
                    detailLoading={detailLoadingId === item.id}
                    onToggleDetails={() => handleToggleDetails(item)}
                    onDownload={() => handleDownload(item)}
                  />
                ))
              )}

              <View style={{ height: 30 }} />
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------ */
/* HISTORY CARD */
/* ------------------------------------------------ */

function HistoryCard({
  item,
  detail,
  expanded,
  detailLoading,
  onToggleDetails,
  onDownload,
}: {
  item: EmergencySummary;
  detail?: EmergencyDetail;
  expanded: boolean;
  detailLoading: boolean;
  onToggleDetails: () => void;
  onDownload: () => void;
}) {
  const meta = STATUS_META[item.status];

  return (
    <View style={styles.historyCard}>
      {/* TOP ROW */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.emergencyType}>
            {EMERGENCY_TYPE_LABEL[item.emergency_type]}
          </Text>

          <Text style={styles.emergencyId}>
            {formatDateTime(item.created_at)} ·{" "}
            {item.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.statusText, { color: meta.color }]}>
            {meta.label}
          </Text>
        </View>
      </View>

      {/* DETAILS (fetched on demand — the list endpoint only returns
          the lean summary shape, not cost/distance/address) */}
      {expanded && (
        <View style={styles.infoGrid}>
          {detailLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : detail ? (
            <>
              {detail.address ? (
                <InfoCell label="Location" value={detail.address} fullWidth />
              ) : null}

              {detail.estimated_distance_meters != null ? (
                <InfoCell
                  label="Distance"
                  value={`${(detail.estimated_distance_meters / 1000).toFixed(
                    1
                  )} km`}
                />
              ) : null}

              {detail.estimated_duration_seconds != null ? (
                <InfoCell
                  label="Est. response time"
                  value={`${Math.round(
                    detail.estimated_duration_seconds / 60
                  )} min`}
                />
              ) : null}

              {detail.estimated_cost != null ? (
                <InfoCell
                  label="Cost"
                  value={formatCurrency(Number(detail.estimated_cost))}
                />
              ) : null}

              {detail.completed_at ? (
                <InfoCell
                  label="Total duration"
                  value={formatDurationBetween(
                    detail.created_at,
                    detail.completed_at
                  )}
                />
              ) : null}

              {detail.cancelled_at ? (
                <InfoCell
                  label="Cancelled"
                  value={formatDateTime(detail.cancelled_at)}
                />
              ) : null}

              {!detail.address &&
              detail.estimated_distance_meters == null &&
              detail.estimated_duration_seconds == null &&
              detail.estimated_cost == null &&
              !detail.completed_at &&
              !detail.cancelled_at ? (
                <Text style={styles.noDetailsText}>
                  No further details recorded for this incident yet.
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
      )}

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.outlineButton}
          activeOpacity={0.8}
          onPress={onDownload}
        >
          <Text style={styles.downloadIcon}>↓</Text>
          <Text style={styles.outlineButtonText}>Download report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailsButton}
          activeOpacity={0.7}
          onPress={onToggleDetails}
        >
          <Text style={styles.fileIcon}>▤</Text>
          <Text style={styles.detailsButtonText}>
            {expanded ? "Hide details" : "View details"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------------------------------------ */
/* INFO CELL */
/* ------------------------------------------------ */

function InfoCell({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <View style={[styles.infoCell, fullWidth && styles.infoCellFull]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/* ------------------------------------------------ */
/* STYLES */
/* ------------------------------------------------ */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: { fontSize: 25, fontWeight: "800", color: COLORS.black },
  subtitle: { marginTop: 5, fontSize: 13, lineHeight: 19, color: COLORS.muted },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },

  loadingState: { alignItems: "center", paddingVertical: 60, gap: 12 },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "800", color: COLORS.black },
  summaryLabel: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },
  summaryDivider: { width: 1, height: 35, backgroundColor: COLORS.border },

  offlineIcon: {
    fontSize: 26,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 6,
  },

  retryButton: {
    marginTop: 14,
    alignSelf: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: { color: COLORS.white, fontWeight: "800", fontSize: 13 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.black },
  sectionCount: { fontSize: 11, color: COLORS.muted, fontWeight: "600" },

  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.black,
    marginBottom: 4,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
  },

  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitleContainer: { flex: 1, paddingRight: 10 },
  emergencyType: { fontSize: 15, fontWeight: "800", color: COLORS.black },
  emergencyId: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.lightMuted,
    fontWeight: "500",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 10, fontWeight: "800" },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  infoCell: {
    width: "48%",
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  infoCellFull: { width: "100%" },
  infoLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.lightMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  noDetailsText: {
    fontSize: 11,
    color: COLORS.lightMuted,
    fontStyle: "italic",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  outlineButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  downloadIcon: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginRight: 6,
  },
  outlineButtonText: { fontSize: 12, fontWeight: "700", color: COLORS.text },

  detailsButton: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fileIcon: { fontSize: 16, fontWeight: "800", color: COLORS.muted, marginRight: 5 },
  detailsButtonText: { fontSize: 12, fontWeight: "700", color: COLORS.text },
});