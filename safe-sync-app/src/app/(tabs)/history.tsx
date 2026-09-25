import React from "react";
import {
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

const emergencyHistory = [
  {
    id: "EMG-2026-00124",
    type: "Medical Emergency",
    date: "18 Aug 2026 · 14:32",
    status: "Resolved",
    responder: "Nairobi Hospital Ambulance",
    arrival: "5 min",
    resolution: "42 min",
    cost: "KSh 3,500",
  },
  {
    id: "EMG-2026-00118",
    type: "Road Accident",
    date: "14 Aug 2026 · 09:18",
    status: "Resolved",
    responder: "SafeSync Response Unit",
    arrival: "7 min",
    resolution: "1 hr 15 min",
    cost: "KSh 5,000",
  },
  {
    id: "EMG-2026-00103",
    type: "Medical Emergency",
    date: "08 Aug 2026 · 18:47",
    status: "Resolved",
    responder: "Nairobi Hospital Ambulance",
    arrival: "6 min",
    resolution: "35 min",
    cost: "KSh 3,000",
  },
];

export default function HistoryScreen() {
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

        {/* CONTENT */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* SUMMARY */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {emergencyHistory.length}
              </Text>

              <Text style={styles.summaryLabel}>Total incidents</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>100%</Text>

              <Text style={styles.summaryLabel}>Resolved</Text>
            </View>
          </View>

          {/* SECTION TITLE */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Previous incidents</Text>

            <Text style={styles.sectionCount}>
              {emergencyHistory.length} records
            </Text>
          </View>

          {/* HISTORY CARDS */}
          {emergencyHistory.map((item) => (
            <HistoryCard key={item.id} item={item} />
          ))}

          {/* EMPTY SPACE FOR TAB BAR */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------ */
/* HISTORY CARD */
/* ------------------------------------------------ */

function HistoryCard({ item }: { item: (typeof emergencyHistory)[number] }) {
  const handleDownload = () => {
    Alert.alert(
      "Report",
      `Report ${item.id} would be downloaded here once the backend and document service are connected.`
    );
  };

  const handleDetails = () => {
    Alert.alert(
      "Emergency Details",
      `Opening details for ${item.id}.`
    );
  };

  return (
    <View style={styles.historyCard}>
      {/* TOP ROW */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.emergencyType}>{item.type}</Text>

          <Text style={styles.emergencyId}>
            {item.date} · {item.id}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />

          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {/* INFORMATION GRID */}
      <View style={styles.infoGrid}>
        <InfoCell
          label="Responder"
          value={item.responder}
          fullWidth
        />

        <InfoCell
          label="Arrival time"
          value={item.arrival}
        />

        <InfoCell
          label="Resolution"
          value={item.resolution}
        />

        <InfoCell
          label="Cost"
          value={item.cost}
        />
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.outlineButton}
          activeOpacity={0.8}
          onPress={handleDownload}
        >
          <Text style={styles.downloadIcon}>↓</Text>

          <Text style={styles.outlineButtonText}>
            Download report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailsButton}
          activeOpacity={0.7}
          onPress={handleDetails}
        >
          <Text style={styles.fileIcon}>▤</Text>

          <Text style={styles.detailsButtonText}>
            View details
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
    <View
      style={[
        styles.infoCell,
        fullWidth && styles.infoCellFull,
      ]}
    >
      <Text style={styles.infoLabel}>{label}</Text>

      <Text
        style={styles.infoValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/* ------------------------------------------------ */
/* STYLES */
/* ------------------------------------------------ */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* HEADER */

  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.black,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.muted,
  },

  /* SCROLL */

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },

  /* SUMMARY */

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

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.black,
  },

  summaryLabel: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },

  summaryDivider: {
    width: 1,
    height: 35,
    backgroundColor: COLORS.border,
  },

  /* SECTION */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.black,
  },

  sectionCount: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },

  /* HISTORY CARD */

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

  cardTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },

  emergencyType: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.black,
  },

  emergencyId: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.lightMuted,
    fontWeight: "500",
  },

  /* STATUS */

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successLight,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.success,
  },

  /* INFO GRID */

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

  infoCellFull: {
    width: "100%",
  },

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

  /* ACTIONS */

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

  outlineButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },

  detailsButton: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  fileIcon: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.muted,
    marginRight: 5,
  },

  detailsButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
});