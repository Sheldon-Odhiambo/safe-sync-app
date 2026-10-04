import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  clearLogs,
  exportLogsText,
  loadPersistedLogs,
  LogLevel,
  useLogs,
} from "../lib/debug-log";

const COLORS: Record<LogLevel, string> = {
  info: "#16A34A",
  warn: "#D97706",
  error: "#DC2626",
};

type Filter = "all" | LogLevel;

export function DebugLogButton({ style }: { style?: object }) {
  const [open, setOpen] = useState(false);
  const logs = useLogs();
  const errorCount = logs.filter((l) => l.level === "error").length;

  return (
    <>
      <Pressable style={[styles.fab, style]} onPress={() => setOpen(true)}>
        <Ionicons name="bug-outline" size={20} color="#0F172A" />
        {errorCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {errorCount > 99 ? "99+" : errorCount}
            </Text>
          </View>
        )}
      </Pressable>
      <DebugLogPanel visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function DebugLogPanel({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const logs = useLogs();
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (visible) void loadPersistedLogs();
  }, [visible]);

  const shown = useMemo(
    () => (filter === "all" ? logs : logs.filter((l) => l.level === filter)),
    [logs, filter]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Debug log ({shown.length})</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.action}
              onPress={() =>
                Share.share({ message: exportLogsText() || "(empty)" })
              }
            >
              <Ionicons name="share-outline" size={20} color="#0F172A" />
            </Pressable>
            <Pressable style={styles.action} onPress={clearLogs}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </Pressable>
            <Pressable style={styles.action} onPress={onClose}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </Pressable>
          </View>
        </View>

        <View style={styles.filters}>
          {(["all", "info", "warn", "error"] as Filter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, filter === f && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, filter === f && styles.chipTextActive]}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {shown.length === 0 ? (
            <Text style={styles.empty}>No log entries yet.</Text>
          ) : (
            [...shown].reverse().map((e) => (
              <View key={e.id} style={styles.entry}>
                <Text style={styles.meta}>
                  <Text style={{ color: COLORS[e.level], fontWeight: "800" }}>
                    {e.level.toUpperCase()}
                  </Text>
                  {"  "}
                  {e.ts.slice(11, 23)} · {e.tag}
                </Text>
                <Text style={styles.message} selectable>
                  {e.message}
                </Text>
                {e.data ? (
                  <Text style={styles.data} selectable>
                    {e.data}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  headerActions: { flexDirection: "row", gap: 8 },
  action: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  filters: { flexDirection: "row", gap: 8, padding: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  chipActive: { backgroundColor: "#DC2626" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  chipTextActive: { color: "#FFF" },
  list: { padding: 12, gap: 8 },
  empty: { textAlign: "center", color: "#94A3B8", marginTop: 40 },
  entry: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
  },
  meta: { fontSize: 10, color: "#64748B" },
  message: { fontSize: 12, fontWeight: "700", color: "#0F172A", marginTop: 3 },
  data: {
    fontSize: 10,
    color: "#334155",
    marginTop: 6,
    backgroundColor: "#F1F5F9",
    padding: 6,
    borderRadius: 6,
    fontFamily: "Courier",
  },
});