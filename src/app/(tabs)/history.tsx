import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { ToastBanner } from "@/components/toast";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../../contexts/auth-context";
import { apiFetch } from "../../lib/api-client";

const COLORS = {
  primary: "#DC2626",
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

const PAGE_SIZE = 20;

/* =========================================================
   TYPES (match GET /api/v1/history)
========================================================= */

type HistoryRole = "requester" | "responder";

type HistoryItem = {
  id: string;
  incident_id: string;
  public_id: string;
  role: HistoryRole;
  emergency_type: string;
  emergency_type_name: string;
  status: string;
  address: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  cancelled_at: string | null;
  distance_km: number | null;
  eta_minutes: number | null;
  response_seconds: number | null;
  responder_name: string | null;
  client_name: string | null;
  vehicle_registration: string | null;
  vehicle_type: string | null;
  station: string | null;
};

type HistoryResponse = {
  role: HistoryRole;
  items: HistoryItem[];
  total: number;
  completed: number;
  has_more: boolean;
};

// Every value of emergency.incident_status.
const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  created: { label: "Requested", color: "#B45309", bg: "#FEF3C7" },
  searching: { label: "Finding responder", color: "#B45309", bg: "#FEF3C7" },
  dispatched: { label: "Dispatched", color: "#B45309", bg: "#FEF3C7" },
  accepted: { label: "Accepted", color: "#2563EB", bg: "#DBEAFE" },
  en_route: { label: "En route", color: "#2563EB", bg: "#DBEAFE" },
  arrived: { label: "Arrived", color: "#2563EB", bg: "#DBEAFE" },
  on_scene: { label: "On scene", color: "#2563EB", bg: "#DBEAFE" },
  completed: {
    label: "Resolved",
    color: COLORS.success,
    bg: COLORS.successLight,
  },
  cancelled: { label: "Cancelled", color: COLORS.muted, bg: COLORS.secondary },
  escalated: { label: "Escalated", color: "#B91C1C", bg: "#FEE2E2" },
  expired: { label: "Expired", color: COLORS.muted, bg: COLORS.secondary },
};

function statusMeta(status: string) {
  return (
    STATUS_META[status] ?? {
      label: status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
      color: COLORS.muted,
      bg: COLORS.secondary,
    }
  );
}

/* =========================================================
   HELPERS
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

function formatSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} sec`;
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function secondsBetween(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000;
}

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

function fetchPage(role: HistoryRole, offset: number) {
  return apiFetch<HistoryResponse>(
    `/api/v1/history?role=${role}&limit=${PAGE_SIZE}&offset=${offset}`
  );
}

/* =========================================================
   SCREEN
========================================================= */

export default function HistoryScreen() {
  const { profile } = useAuth();
  const role: HistoryRole =
    profile?.userKind === "responder" ? "responder" : "requester";
  const isResponder = role === "responder";

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { toast, showToast } = useToast();

  // Kept in a ref so the focus effect below does not re-run (and refetch)
  // whenever the toast helper changes identity.
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Newest request wins: a slow old answer must not overwrite a newer one.
  const seqRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const loadFirstPage = useCallback(
    async (mode: "focus" | "pull") => {
      const seq = ++seqRef.current;

      if (mode === "pull") setRefreshing(true);
      else if (!hasLoadedRef.current) setLoading(true);

      try {
        const data = await fetchPage(role, 0);
        if (seq !== seqRef.current) return;

        setItems(data.items);
        setTotal(data.total);
        setCompleted(data.completed);
        setLoadError("");
        hasLoadedRef.current = true;
      } catch (err) {
        if (seq !== seqRef.current) return;

        const message = errorText(err, "Failed to load your history.");
        if (hasLoadedRef.current) {
          // Keep the list that is already on screen.
          showToastRef.current("Couldn't refresh", message, "error");
        } else {
          setLoadError(message);
        }
      } finally {
        if (seq === seqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [role]
  );

  // Reload every time the History tab is shown.
  useFocusEffect(
    useCallback(() => {
      loadFirstPage("focus");
    }, [loadFirstPage])
  );

  const loadMore = useCallback(async () => {
    if (loading || refreshing || loadingMore) return;

    const seq = seqRef.current;
    setLoadingMore(true);

    try {
      const data = await fetchPage(role, items.length);
      if (seq !== seqRef.current) return;

      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...data.items.filter((item) => !seen.has(item.id))];
      });
      setTotal(data.total);
      setCompleted(data.completed);
    } catch (err) {
      showToastRef.current(
        "Couldn't load more",
        errorText(err, "Please try again."),
        "error"
      );
    } finally {
      setLoadingMore(false);
    }
  }, [role, items.length, loading, refreshing, loadingMore]);

  const resolvedPercent =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  const hasMore = items.length < total;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isResponder ? "Response History" : "Emergency History"}
          </Text>
          <Text style={styles.subtitle}>
            {isResponder
              ? "Emergencies you have responded to."
              : "Emergencies you have requested."}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            // Clear the floating tab bar (and the emergency button for clients).
            { paddingBottom: isResponder ? 110 : 170 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFirstPage("pull")}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.emptyStateText}>Loading your history…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.summaryCardColumn}>
              <Text style={styles.emptyStateTitle}>Couldn't load history</Text>
              <Text style={styles.emptyStateText}>{loadError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadFirstPage("focus")}
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
                  <Text style={styles.summaryLabel}>
                    {isResponder ? "Total responses" : "Total incidents"}
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{resolvedPercent}%</Text>
                  <Text style={styles.summaryLabel}>Resolved</Text>
                </View>
              </View>

              {/* SECTION TITLE */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {isResponder ? "Previous responses" : "Previous incidents"}
                </Text>
                <Text style={styles.sectionCount}>
                  {items.length} of {total}
                </Text>
              </View>

              {items.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>
                    {isResponder ? "No responses yet" : "No incidents yet"}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {isResponder
                      ? "Emergencies you accept will show up here."
                      : "Your emergency requests will show up here."}
                  </Text>
                </View>
              ) : (
                items.map((item) => (
                  <HistoryCard
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    onToggle={() =>
                      setExpandedId((current) =>
                        current === item.id ? null : item.id
                      )
                    }
                  />
                ))
              )}

              {hasMore ? (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  activeOpacity={0.8}
                  onPress={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load more</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </ScrollView>

        <ToastBanner toast={toast} />
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------ */
/* HISTORY CARD */
/* ------------------------------------------------ */

function HistoryCard({
  item,
  expanded,
  onToggle,
}: {
  item: HistoryItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = statusMeta(item.status);
  const isResponder = item.role === "responder";

  const vehicle = [item.vehicle_type, item.vehicle_registration]
    .filter(Boolean)
    .join(" · ");

  // Recorded arrival time when there is one, otherwise the estimate.
  const responseValue =
    item.response_seconds != null
      ? formatSeconds(item.response_seconds)
      : item.eta_minutes != null
      ? `~${item.eta_minutes} min`
      : null;
  const responseLabel =
    item.response_seconds != null ? "Response time" : "Est. response time";

  const totalDuration =
    item.status === "completed" && item.closed_at
      ? formatSeconds(secondsBetween(item.created_at, item.closed_at))
      : null;

  return (
    <View style={styles.historyCard}>
      {/* TOP ROW */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.emergencyType}>
            {item.emergency_type_name || item.emergency_type}
          </Text>

          <Text style={styles.emergencyId}>
            {formatDateTime(item.created_at)} · {item.public_id}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.statusText, { color: meta.color }]}>
            {meta.label}
          </Text>
        </View>
      </View>

      {/* ONE-LINE SUMMARY (visible when collapsed) */}
      {!expanded && item.address ? (
        <Text style={styles.addressPreview} numberOfLines={1}>
          {item.address}
        </Text>
      ) : null}

      {/* DETAILS */}
      {expanded && (
        <View style={styles.infoGrid}>
          {item.address ? (
            <InfoCell label="Location" value={item.address} fullWidth />
          ) : null}

          {isResponder && item.client_name ? (
            <InfoCell label="Client" value={item.client_name} />
          ) : null}

          {!isResponder && item.responder_name ? (
            <InfoCell label="Responder" value={item.responder_name} />
          ) : null}

          {vehicle ? <InfoCell label="Vehicle" value={vehicle} /> : null}

          {item.station ? (
            <InfoCell label="Station" value={item.station} />
          ) : null}

          {item.distance_km != null ? (
            <InfoCell
              label="Distance"
              value={`${item.distance_km.toFixed(1)} km`}
            />
          ) : null}

          {responseValue ? (
            <InfoCell label={responseLabel} value={responseValue} />
          ) : null}

          {totalDuration ? (
            <InfoCell label="Total duration" value={totalDuration} />
          ) : null}

          {item.cancelled_at ? (
            <InfoCell
              label="Cancelled"
              value={formatDateTime(item.cancelled_at)}
            />
          ) : null}

          {item.description ? (
            <InfoCell label="Notes" value={item.description} fullWidth />
          ) : null}
        </View>
      )}

      {/* ACTIONS */}
      <TouchableOpacity
        style={styles.detailsButton}
        activeOpacity={0.7}
        onPress={onToggle}
      >
        <Text style={styles.fileIcon}>▤</Text>
        <Text style={styles.detailsButtonText}>
          {expanded ? "Hide details" : "View details"}
        </Text>
      </TouchableOpacity>
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
      <Text style={styles.infoValue} numberOfLines={fullWidth ? 4 : 2}>
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

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

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
  summaryCardColumn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 16,
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
  addressPreview: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.muted,
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

  detailsButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fileIcon: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.muted,
    marginRight: 6,
  },
  detailsButtonText: { fontSize: 12, fontWeight: "700", color: COLORS.text },

  loadMoreButton: {
    marginTop: 4,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: { fontSize: 13, fontWeight: "800", color: COLORS.primary },
});