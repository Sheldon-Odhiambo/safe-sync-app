import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

const transactions = [
  {
    id: "TXN-1024",
    label: "Ambulance dispatch",
    date: "18 Aug 2026",
    amount: "- KSh 5,500",
    kind: "debit",
  },
  {
    id: "TXN-1023",
    label: "Wallet deposit",
    date: "16 Aug 2026",
    amount: "+ KSh 10,000",
    kind: "credit",
  },
  {
    id: "TXN-1022",
    label: "Emergency response",
    date: "12 Aug 2026",
    amount: "- KSh 4,200",
    kind: "debit",
  },
  {
    id: "TXN-1021",
    label: "Wallet deposit",
    date: "08 Aug 2026",
    amount: "+ KSh 15,000",
    kind: "credit",
  },
];

const methods = [
  {
    id: "mpesa",
    label: "M-PESA",
    detail: "+254 712 345 678",
    badge: "Default",
    icon: "phone",
  },
  {
    id: "visa",
    label: "Visa",
    detail: "•••• 4412 · 09/29",
    icon: "card",
  },
  {
    id: "bank",
    label: "Bank Transfer",
    detail: "KCB Bank · •••• 8871",
    icon: "bank",
  },
];

export default function Wallet() {
  const [autoTopUp, setAutoTopUp] = useState(true);
  const [lowBalanceAlerts, setLowBalanceAlerts] = useState(true);

  const handleDeposit = () => {
    Alert.alert(
      "Deposit funds",
      "Choose how you would like to add money to your SafeSync wallet.",
      [
        {
          text: "M-PESA",
          onPress: () => {
            Alert.alert(
              "M-PESA",
              "M-PESA top-up will be connected to the backend."
            );
          },
        },
        {
          text: "Bank Transfer",
          onPress: () => {
            Alert.alert(
              "Bank Transfer",
              "Bank transfer details will appear here."
            );
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleDownloadReceipts = () => {
    Alert.alert(
      "Receipts",
      "Your receipts will be prepared for download."
    );
  };

  const handleAddPaymentMethod = () => {
    Alert.alert(
      "Add payment method",
      "Choose a payment method to add.",
      [
        {
          text: "M-PESA",
          onPress: () => console.log("Add M-PESA"),
        },
        {
          text: "Card",
          onPress: () => console.log("Add card"),
        },
        {
          text: "Bank",
          onPress: () => console.log("Add bank"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ========================================= */}
        {/* PAGE HEADER                               */}
        {/* ========================================= */}

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Wallet</Text>

          <Text style={styles.pageSubtitle}>
            Keep a balance so dispatch is never delayed by payment.
          </Text>
        </View>

        {/* ========================================= */}
        {/* BALANCE CARD                              */}
        {/* ========================================= */}

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            CURRENT BALANCE
          </Text>

          <Text style={styles.balanceAmount}>
            KSh 21,800
          </Text>

          <Text style={styles.balanceDescription}>
            Covers roughly 4 standard ambulance dispatches
          </Text>

          <View style={styles.balanceActions}>

            <TouchableOpacity
              style={styles.depositButton}
              activeOpacity={0.8}
              onPress={handleDeposit}
            >
              <Ionicons
                name="add"
                size={20}
                color="#DC2626"
              />

              <Text style={styles.depositButtonText}>
                Deposit Funds
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.receiptButton}
              activeOpacity={0.8}
              onPress={handleDownloadReceipts}
            >
              <Ionicons
                name="download-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text style={styles.receiptButtonText}>
                Receipts
              </Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* ========================================= */}
        {/* AUTOMATIC TOP-UP                          */}
        {/* ========================================= */}

        <View style={styles.panel}>

          <Text style={styles.panelTitle}>
            Automatic top-up
          </Text>

          <Text style={styles.panelSubtitle}>
            Never risk an unfunded dispatch during an emergency.
          </Text>

          {/* AUTO TOP-UP */}

          <View style={styles.settingRow}>

            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>
                Auto top-up KSh 6,500
              </Text>

              <Text style={styles.settingDescription}>
                When balance drops below KSh 3,000
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.switch,
                autoTopUp && styles.switchActive,
              ]}
              onPress={() => setAutoTopUp(!autoTopUp)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.switchThumb,
                  autoTopUp && styles.switchThumbActive,
                ]}
              />
            </TouchableOpacity>

          </View>

          {/* LOW BALANCE */}

          <View style={styles.settingRow}>

            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>
                Low balance alerts
              </Text>

              <Text style={styles.settingDescription}>
                Push notifications and SMS
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.switch,
                lowBalanceAlerts && styles.switchActive,
              ]}
              onPress={() =>
                setLowBalanceAlerts(!lowBalanceAlerts)
              }
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.switchThumb,
                  lowBalanceAlerts &&
                    styles.switchThumbActive,
                ]}
              />
            </TouchableOpacity>

          </View>

        </View>

        {/* ========================================= */}
        {/* TRANSACTION HISTORY                       */}
        {/* ========================================= */}

        <View style={styles.panel}>

          <View style={styles.sectionHeader}>
            <Text style={styles.panelTitle}>
              Transaction history
            </Text>

            <TouchableOpacity>
              <Text style={styles.viewAllText}>
                View all
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionList}>

            {transactions.map((transaction) => (

              <View
                key={transaction.id}
                style={styles.transactionRow}
              >

                {/* TRANSACTION ICON */}

                <View
                  style={[
                    styles.transactionIcon,
                    transaction.kind === "credit"
                      ? styles.creditIcon
                      : styles.debitIcon,
                  ]}
                >
                  <Ionicons
                    name={
                      transaction.kind === "credit"
                        ? "arrow-down"
                        : "arrow-up"
                    }
                    size={18}
                    color={
                      transaction.kind === "credit"
                        ? "#059669"
                        : "#DC2626"
                    }
                  />
                </View>

                {/* DETAILS */}

                <View style={styles.transactionDetails}>

                  <Text
                    style={styles.transactionLabel}
                    numberOfLines={1}
                  >
                    {transaction.label}
                  </Text>

                  <Text
                    style={styles.transactionDate}
                    numberOfLines={1}
                  >
                    {transaction.date} · {transaction.id}
                  </Text>

                </View>

                {/* AMOUNT */}

                <Text
                  style={[
                    styles.transactionAmount,
                    transaction.kind === "credit" &&
                      styles.creditAmount,
                  ]}
                >
                  {transaction.amount}
                </Text>

              </View>

            ))}

          </View>

        </View>

        {/* ========================================= */}
        {/* SAVED PAYMENT METHODS                     */}
        {/* ========================================= */}

        <View style={styles.panel}>

          <Text style={styles.panelTitle}>
            Saved payment methods
          </Text>

          <Text style={styles.panelSubtitle}>
            Manage the accounts you use for SafeSync payments.
          </Text>

          <View style={styles.methodsList}>

            {methods.map((method) => (

              <TouchableOpacity
                key={method.id}
                style={styles.paymentMethod}
                activeOpacity={0.75}
              >

                {/* ICON */}

                <View style={styles.paymentIcon}>

                  {method.icon === "phone" && (
                    <Ionicons
                      name="phone-portrait-outline"
                      size={20}
                      color="#DC2626"
                    />
                  )}

                  {method.icon === "card" && (
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color="#DC2626"
                    />
                  )}

                  {method.icon === "bank" && (
                    <MaterialCommunityIcons
                      name="bank-outline"
                      size={20}
                      color="#DC2626"
                    />
                  )}

                </View>

                {/* DETAILS */}

                <View style={styles.methodDetails}>

                  <Text style={styles.methodLabel}>
                    {method.label}
                  </Text>

                  <Text style={styles.methodDetail}>
                    {method.detail}
                  </Text>

                </View>

                {/* DEFAULT BADGE */}

                {method.badge && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>
                      {method.badge}
                    </Text>
                  </View>
                )}

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#94A3B8"
                />

              </TouchableOpacity>

            ))}

          </View>

          {/* ADD PAYMENT METHOD */}

          <TouchableOpacity
            style={styles.addPaymentButton}
            activeOpacity={0.8}
            onPress={handleAddPaymentMethod}
          >
            <Ionicons
              name="add"
              size={20}
              color="#DC2626"
            />

            <Text style={styles.addPaymentText}>
              Add payment method
            </Text>
          </TouchableOpacity>

        </View>

        {/* BOTTOM SPACE FOR GLOBAL EMERGENCY BUTTON */}

        <View style={{ height: 120 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },

  /* ========================================= */
  /* HEADER                                    */
  /* ========================================= */

  pageHeader: {
    marginBottom: 20,
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0F172A",
  },

  pageSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    marginTop: 5,
  },

  /* ========================================= */
  /* BALANCE CARD                              */
  /* ========================================= */

  balanceCard: {
    backgroundColor: "#DC2626",
    borderRadius: 26,
    padding: 22,
    marginBottom: 16,

    shadowColor: "#DC2626",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 14,

    elevation: 7,
  },

  balanceLabel: {
    color: "#FFFFFF",
    opacity: 0.75,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },

  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "900",
    marginTop: 10,
  },

  balanceDescription: {
    color: "#FFFFFF",
    opacity: 0.85,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  balanceActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },

  depositButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  depositButtonText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },

  receiptButton: {
    flex: 0.8,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  receiptButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* ========================================= */
  /* PANELS                                    */
  /* ========================================= */

  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,

    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  panelTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  panelSubtitle: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginTop: 4,
  },

  /* ========================================= */
  /* SETTINGS                                  */
  /* ========================================= */

  settingRow: {
    marginTop: 16,
    padding: 14,

    borderRadius: 15,

    backgroundColor: "#F8FAFC",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  settingTextContainer: {
    flex: 1,
    paddingRight: 15,
  },

  settingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  settingDescription: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 16,
  },

  /* ========================================= */
  /* CUSTOM SWITCH                             */
  /* ========================================= */

  switch: {
    width: 48,
    height: 28,

    borderRadius: 20,

    backgroundColor: "#CBD5E1",

    justifyContent: "center",

    paddingHorizontal: 3,
  },

  switchActive: {
    backgroundColor: "#DC2626",
  },

  switchThumb: {
    width: 22,
    height: 22,

    borderRadius: 11,

    backgroundColor: "#FFFFFF",
  },

  switchThumbActive: {
    alignSelf: "flex-end",
  },

  /* ========================================= */
  /* SECTION HEADER                            */
  /* ========================================= */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  viewAllText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },

  /* ========================================= */
  /* TRANSACTIONS                              */
  /* ========================================= */

  transactionList: {
    marginTop: 10,
  },

  transactionRow: {
    flexDirection: "row",
    alignItems: "center",

    paddingVertical: 13,

    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  transactionIcon: {
    width: 40,
    height: 40,

    borderRadius: 13,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 12,
  },

  creditIcon: {
    backgroundColor: "#ECFDF5",
  },

  debitIcon: {
    backgroundColor: "#FEF2F2",
  },

  transactionDetails: {
    flex: 1,
    minWidth: 0,
  },

  transactionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  transactionDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 3,
  },

  transactionAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginLeft: 8,
  },

  creditAmount: {
    color: "#059669",
  },

  /* ========================================= */
  /* PAYMENT METHODS                           */
  /* ========================================= */

  methodsList: {
    marginTop: 14,
    gap: 10,
  },

  paymentMethod: {
    minHeight: 68,

    borderWidth: 1,
    borderColor: "#E2E8F0",

    borderRadius: 15,

    paddingHorizontal: 12,

    flexDirection: "row",
    alignItems: "center",
  },

  paymentIcon: {
    width: 40,
    height: 40,

    borderRadius: 12,

    backgroundColor: "#FEF2F2",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 11,
  },

  methodDetails: {
    flex: 1,
  },

  methodLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  methodDetail: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  defaultBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 8,
  },

  defaultBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#475569",
  },

  /* ========================================= */
  /* ADD PAYMENT                               */
  /* ========================================= */

  addPaymentButton: {
    height: 48,

    marginTop: 14,

    borderWidth: 1,
    borderColor: "#DC2626",

    borderRadius: 14,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 7,
  },

  addPaymentText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },
});