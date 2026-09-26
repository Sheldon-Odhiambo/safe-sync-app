import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";


const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://192.168.1.10:8000";

const PAYHERO_STK_ENDPOINT =
  process.env.EXPO_PUBLIC_PAYHERO_STK_ENDPOINT ||
  `${API_BASE}/api/v1/payments/payhero/stk-push`;

/*
|--------------------------------------------------------------------------
| PAYMENT STATUS ENDPOINT
|--------------------------------------------------------------------------
|
| Everything routes through FastAPI, in both directions:
|
|   1. App  --STK push request-->  FastAPI  --STK push-->  PayHero
|   2. PayHero --payment result (webhook)-->  FastAPI  (this app never
|      receives that callback directly — a phone can't host a public
|      webhook URL, so PayHero can only call FastAPI)
|   3. App  --"what happened?"-->  FastAPI  --confirmed status-->  App
|
| Step 3 is done here by polling this status endpoint with the same
| reference we got back from the STK push, since FastAPI is the only
| place that actually knows the outcome once PayHero's callback lands.
| Adjust the path below to match your real route.
*/

const PAYHERO_STATUS_ENDPOINT =
  process.env.EXPO_PUBLIC_PAYHERO_STATUS_ENDPOINT ||
  `${API_BASE}/api/v1/payments/payhero/status`;

const STATUS_POLL_INTERVAL_MS = 3000;
const STATUS_POLL_MAX_ATTEMPTS = 20; // ~60s total before giving up

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type Transaction = {
  id: string;
  label: string;
  date: string;
  amount: string;
  kind: "credit" | "debit";
  status?: string;
};

type PayHeroResponse = {
  success?: boolean;
  status?: string;
  message?: string;
  error?: string;
  error_code?: string;
  error_message?: string;

  reference?: string;
  external_reference?: string;

  checkout_request_id?: string;
  CheckoutRequestID?: string;

  transaction_id?: string;
};

/*
|--------------------------------------------------------------------------
| QUICK DEPOSIT AMOUNTS
|--------------------------------------------------------------------------
*/

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

function normalizeKenyanPhone(phone: string): string | null {
  let value = phone.trim().replace(/[\s()-]/g, "");

  if (!value) {
    return null;
  }

  if (value.startsWith("+254")) {
    value = value.substring(1);
  }

  if (value.startsWith("254")) {
    if (value.length !== 12) {
      return null;
    }

    return value;
  }

  if (value.startsWith("07") || value.startsWith("01")) {
    if (value.length !== 10) {
      return null;
    }

    return `254${value.substring(1)}`;
  }

  return null;
}


function formatPhoneForDisplay(phone: string) {
  const normalized = normalizeKenyanPhone(phone);

  if (!normalized) {
    return phone;
  }

  return `+${normalized}`;
}

function formatCurrency(amount: number) {
  return `KSh ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function Wallet() {
  /*
   * ----------------------------------------------------------------------
   * USER / ORGANIZATION FLAGS
   * ----------------------------------------------------------------------
   *
   * These are currently placeholders from the original implementation.
   *
   * Later, these should come from AuthContext/profile.
   */

  const [isSuperAdmin] = useState(true);
  const [isResponderOrg] = useState(true);

  /*
   * ----------------------------------------------------------------------
   * WALLET STATE
   * ----------------------------------------------------------------------
   */

  const [balance] = useState(0);

  /*
   * ----------------------------------------------------------------------
   * PAYMENT STATE
   * ----------------------------------------------------------------------
   */

  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /*
   * ----------------------------------------------------------------------
   * ORGANIZATION TOP-UP STATE
   * ----------------------------------------------------------------------
   */

  const [selectedTopUpTier, setSelectedTopUpTier] = useState<
    "semi" | "annual" | null
  >("semi");

  const [lowBalanceAlerts, setLowBalanceAlerts] = useState(true);

  /*
   * ----------------------------------------------------------------------
   * TRANSACTIONS
   * ----------------------------------------------------------------------
   *
   * This remains empty until connected to the SafeSync finance API.
   */

  const [transactions] = useState<Transaction[]>([]);

  /*
   * ----------------------------------------------------------------------
   * DERIVED PAYMENT VALUES
   * ----------------------------------------------------------------------
   */

  const normalizedPhone = useMemo(() => {
    return normalizeKenyanPhone(phoneNumber);
  }, [phoneNumber]);

  const displayPhone = useMemo(() => {
    return formatPhoneForDisplay(phoneNumber);
  }, [phoneNumber]);

  const parsedAmount = useMemo(() => {
    const cleaned = amount.replace(/,/g, "").trim();

    if (!cleaned) {
      return 0;
    }

    const numeric = Number(cleaned);

    if (!Number.isFinite(numeric)) {
      return 0;
    }

    return numeric;
  }, [amount]);

  const canSubmit =
    !!normalizedPhone &&
    parsedAmount >= 1 &&
    Number.isInteger(parsedAmount) &&
    !isProcessing &&
    !isConfirming;

  /*
   * ----------------------------------------------------------------------
   * QUICK AMOUNT
   * ----------------------------------------------------------------------
   */

  const handleQuickAmount = (value: number) => {
    if (isProcessing) {
      return;
    }

    setAmount(String(value));
  };

  /*
   * ----------------------------------------------------------------------
   * POLL FASTAPI FOR THE FINAL PAYMENT STATUS
   * ----------------------------------------------------------------------
   *
   * The mobile app never talks to PayHero directly and never receives
   * PayHero's webhook — only FastAPI does. So once the STK push has
   * been accepted, this asks FastAPI (repeatedly, until it has an
   * answer) what PayHero's callback actually reported.
   */

  const pollPaymentStatus = async (
    reference: string,
    accessToken: string
  ) => {
    setIsConfirming(true);

    try {
      for (
        let attempt = 0;
        attempt < STATUS_POLL_MAX_ATTEMPTS;
        attempt += 1
      ) {
        await new Promise((resolve) => {
          setTimeout(resolve, STATUS_POLL_INTERVAL_MS);
        });

        let statusData: PayHeroResponse = {};

        try {
          const statusResponse = await fetch(
            `${PAYHERO_STATUS_ENDPOINT}/${reference}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (statusResponse.ok) {
            statusData = await statusResponse.json();
          }
        } catch {
          // Transient network error — just try again next attempt.
          continue;
        }

        const status = String(statusData.status || "").toUpperCase();

        if (status === "SUCCESS" || status === "COMPLETED") {
          Alert.alert(
            "Payment confirmed",
            "Your M-Pesa payment was confirmed by SafeSync and your wallet has been credited."
          );

          handleRefresh();
          return;
        }

        if (
          status === "FAILED" ||
          status === "CANCELLED" ||
          status === "REJECTED"
        ) {
          Alert.alert(
            "Payment not completed",
            statusData.message ||
              statusData.error_message ||
              "The M-Pesa payment was not completed."
          );

          return;
        }

        // Anything else (PENDING, QUEUED, no data yet) — keep polling.
      }

      Alert.alert(
        "Still waiting for confirmation",
        "We haven't heard back yet. Check your Transactions list shortly — SafeSync will update your balance as soon as the payment is confirmed."
      );
    } finally {
      setIsConfirming(false);
    }
  };


  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {

      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    } catch (error) {
      console.error("Wallet refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePayHeroStkPush = async () => {
    if (isProcessing) {
      return;
    }

    const cleanPhone = normalizeKenyanPhone(phoneNumber);

    if (!cleanPhone) {
      Alert.alert(
        "Invalid phone number",
        "Enter a valid Kenyan M-Pesa number, for example 0712345678 or +254712345678."
      );

      return;
    }

    /*
     * Validate amount.
     */
    const numericAmount = Number(
      amount.replace(/,/g, "").trim()
    );

    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      Alert.alert(
        "Invalid amount",
        "Enter an amount of at least KSh 1."
      );

      return;
    }

    /*
     * Only whole KSh amounts.
     */
    if (!Number.isInteger(numericAmount)) {
      Alert.alert(
        "Invalid amount",
        "The deposit amount must be a whole number of Kenyan shillings."
      );

      return;
    }

    setIsProcessing(true);

    try {
      /*
       * --------------------------------------------------------------
       * GET SUPABASE SESSION
       * --------------------------------------------------------------
       *
       * Supabase Auth is the authentication authority.
       */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          sessionError.message ||
            "Unable to retrieve your authentication session."
        );
      }

      if (!session?.access_token) {
        Alert.alert(
          "Session expired",
          "Please sign in again before making a wallet deposit."
        );

        return;
      }

      /*
       * --------------------------------------------------------------
       * SAFE SYNC PAYMENT REFERENCE
       * --------------------------------------------------------------
       */

      const externalReference = `SAFE-${Date.now()}`;

      const response = await fetch(PAYHERO_STK_ENDPOINT, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          amount: numericAmount,

          /*
           * PayHero should receive the Kenyan international format.
           */
          phone_number: cleanPhone,

          /*
           * Used to correlate the payment throughout SafeSync.
           */
          external_reference: externalReference,
        }),
      });

      /*
       * --------------------------------------------------------------
       * PARSE RESPONSE
       * --------------------------------------------------------------
       */

      let data: PayHeroResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      /*
       * --------------------------------------------------------------
       * HANDLE HTTP ERROR
       * --------------------------------------------------------------
       */

      if (!response.ok) {
        const errorMessage =
          data.error_message ||
          data.message ||
          data.error ||
          "The payment request could not be initiated.";

        throw new Error(errorMessage);
      }

      /*
       * --------------------------------------------------------------
       * EXTRACT PAYMENT REFERENCE
       * --------------------------------------------------------------
       */

      const reference =
        data.reference ||
        data.transaction_id ||
        data.CheckoutRequestID ||
        data.checkout_request_id ||
        data.external_reference ||
        externalReference;

      const status = String(
        data.status || ""
      ).toUpperCase();

      /*
       * --------------------------------------------------------------
       * HANDLE EXPLICIT FAILURE
       * --------------------------------------------------------------
       */

      if (
        data.success === false ||
        status === "FAILED" ||
        status === "CANCELLED" ||
        status === "REJECTED"
      ) {
        throw new Error(
          data.message ||
            data.error_message ||
            "PayHero could not initiate the M-Pesa payment."
        );
      }

      /*
       * --------------------------------------------------------------
       * SUCCESS / QUEUED
       * --------------------------------------------------------------
       *
       * At this point the STK request has been accepted/initiated.
       *
       * It does NOT mean that money has been received yet.
       */

      Alert.alert(
        "M-Pesa request sent",
        `An M-Pesa prompt has been sent to ${formatPhoneForDisplay(
          cleanPhone
        )}.\n\nEnter your M-Pesa PIN to complete the payment.\n\nReference: ${reference}`,
        [
          {
            text: "OK",
            onPress: () => {
              setAmount("");
            },
          },
        ]
      );

      /*
       * The STK push only means PayHero accepted the request — it
       * does not mean the money has arrived. The actual confirmation
       * comes later, as a webhook callback that PayHero sends to
       * FastAPI (never to this app). So we ask FastAPI what happened,
       * repeatedly, until it knows.
       */
      pollPaymentStatus(reference, session.access_token);
    } catch (error) {
      console.error(
        "SafeSync STK Push error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Could not connect to the payment service.";

      Alert.alert(
        "Payment failed",
        message
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /*
   * ----------------------------------------------------------------------
   * RECEIPTS
   * ----------------------------------------------------------------------
   */

  const handleDownloadReceipts = () => {
    Alert.alert(
      "Receipts",
      "Receipt history will be available once wallet transactions are connected to the SafeSync finance API."
    );
  };

  /*
   * ----------------------------------------------------------------------
   * VIEW ALL TRANSACTIONS
   * ----------------------------------------------------------------------
   */

  const handleViewAllTransactions = () => {
    Alert.alert(
      "Transaction history",
      "Full transaction history will be connected to the SafeSync finance API."
    );
  };

  /*
   * ----------------------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------------------
   */

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#DC2626"
            />
          }
        >
          {/* ============================================================
              HEADER
          ============================================================ */}

          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.eyebrow}>
                SAFESYNC FINANCE
              </Text>

              <Text style={styles.pageTitle}>
                Wallet
              </Text>

              <Text style={styles.pageSubtitle}>
                Keep funds available so emergency dispatch is never
                delayed by payment.
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name="wallet-outline"
                size={23}
                color="#DC2626"
              />
            </View>
          </View>

          {/* ============================================================
              BALANCE CARD
          ============================================================ */}

          <View style={styles.balanceCard}>
            <View style={styles.balanceTopRow}>
              <View>
                <Text style={styles.balanceLabel}>
                  AVAILABLE BALANCE
                </Text>

                <Text style={styles.balanceAmount}>
                  {formatCurrency(balance)}
                </Text>
              </View>

              <View style={styles.balanceIcon}>
                <Ionicons
                  name="wallet"
                  size={22}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <View style={styles.balanceDivider} />

            <View style={styles.balanceBottomRow}>
              <View style={styles.balanceStatus}>
                <View style={styles.statusDot} />

                <Text style={styles.balanceStatusText}>
                  Wallet ready
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.receiptButton}
                onPress={handleDownloadReceipts}
              >
                <Ionicons
                  name="receipt-outline"
                  size={16}
                  color="#FFFFFF"
                />

                <Text style={styles.receiptButtonText}>
                  Receipts
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ============================================================
              ADD MONEY
          ============================================================ */}

          <View style={styles.panel}>
            <View style={styles.sectionIntro}>
              <View style={styles.sectionIconBlue}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={19}
                  color="#DC2626"
                />
              </View>

              <View style={styles.sectionIntroText}>
                <Text style={styles.panelTitle}>
                  Add money
                </Text>

                <Text style={styles.panelSubtitle}>
                  Deposit securely through M-Pesa using an STK push.
                </Text>
              </View>
            </View>

            <View style={styles.formContainer}>
              {/* PHONE NUMBER */}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  M-Pesa phone number
                </Text>

                <View style={styles.inputWrapper}>
                  <View style={styles.inputPrefix}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={18}
                      color="#64748B"
                    />
                  </View>

                  <TextInput
                    style={styles.input}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="0712 345 678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isProcessing}
                  />
                </View>

                {phoneNumber.length > 0 &&
                  !normalizedPhone && (
                    <Text style={styles.inputError}>
                      Enter a valid Kenyan M-Pesa number.
                    </Text>
                  )}
              </View>

              {/* AMOUNT */}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Deposit amount
                </Text>

                <View style={styles.inputWrapper}>
                  <View style={styles.currencyPrefix}>
                    <Text style={styles.currencyPrefixText}>
                      KSh
                    </Text>
                  </View>

                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={(value) => {
                      setAmount(
                        value.replace(/[^0-9]/g, "")
                      );
                    }}
                    placeholder="Enter amount"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    editable={!isProcessing}
                  />
                </View>
              </View>

              {/* QUICK AMOUNTS */}

              <View>
                <Text style={styles.quickAmountLabel}>
                  QUICK AMOUNTS
                </Text>

                <View style={styles.quickAmountGrid}>
                  {QUICK_AMOUNTS.map((value) => {
                    const selected =
                      parsedAmount === value;

                    return (
                      <TouchableOpacity
                        key={value}
                        activeOpacity={0.8}
                        disabled={isProcessing}
                        style={[
                          styles.quickAmount,
                          selected &&
                            styles.quickAmountSelected,
                        ]}
                        onPress={() =>
                          handleQuickAmount(value)
                        }
                      >
                        <Text
                          style={[
                            styles.quickAmountText,
                            selected &&
                              styles.quickAmountTextSelected,
                          ]}
                        >
                          {value.toLocaleString(
                            "en-KE"
                          )}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* PAYMENT SUMMARY */}

              <View style={styles.paymentSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Deposit
                  </Text>

                  <Text style={styles.summaryValue}>
                    {formatCurrency(parsedAmount)}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Payment method
                  </Text>

                  <View style={styles.summaryMethod}>
                    <View style={styles.miniMpesaIcon}>
                      <Ionicons
                        name="phone-portrait"
                        size={13}
                        color="#FFFFFF"
                      />
                    </View>

                    <Text style={styles.summaryMethodText}>
                      M-Pesa
                    </Text>
                  </View>
                </View>
              </View>

              {/* PAY BUTTON */}

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!canSubmit}
                onPress={handlePayHeroStkPush}
                style={[
                  styles.payButton,
                  !canSubmit &&
                    styles.payButtonDisabled,
                ]}
              >
                {isProcessing || isConfirming ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />

                    <Text style={styles.payButtonText}>
                      {isProcessing
                        ? "Sending STK Push..."
                        : "Waiting for confirmation..."}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text style={styles.payButtonText}>
                      Pay with M-Pesa
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* SECURITY MESSAGE */}

              <View style={styles.securityNote}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color="#64748B"
                />

                <Text style={styles.securityText}>
                  Your M-Pesa PIN is entered only on the official
                  M-Pesa prompt. SafeSync does not collect your PIN.
                </Text>
              </View>
            </View>
          </View>

          {/* ============================================================
              AUTOMATIC TOP-UP
          ============================================================ */}

          {isSuperAdmin &&
            isResponderOrg && (
              <View style={styles.panel}>
                <View style={styles.sectionIntro}>
                  <View style={styles.sectionIconPurple}>
                    <Ionicons
                      name="repeat-outline"
                      size={19}
                      color="#7C3AED"
                    />
                  </View>

                  <View style={styles.sectionIntroText}>
                    <Text style={styles.panelTitle}>
                      Automatic top-up
                    </Text>

                    <Text style={styles.panelSubtitle}>
                      Configure your organization's automatic funding
                      plan.
                    </Text>
                  </View>
                </View>

                <View style={styles.tierContainer}>
                  {/* SEMI PLAN */}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.tierCard,
                      selectedTopUpTier ===
                        "semi" &&
                        styles.tierCardActive,
                    ]}
                    onPress={() =>
                      setSelectedTopUpTier(
                        "semi"
                      )
                    }
                  >
                    <View
                      style={[
                        styles.radio,
                        selectedTopUpTier ===
                          "semi" &&
                          styles.radioActive,
                      ]}
                    >
                      {selectedTopUpTier ===
                        "semi" && (
                        <View
                          style={
                            styles.radioInner
                          }
                        />
                      )}
                    </View>

                    <Text
                      style={[
                        styles.tierTitle,
                        selectedTopUpTier ===
                          "semi" &&
                          styles.tierTitleActive,
                      ]}
                    >
                      Semi Plan
                    </Text>

                    <Text
                      style={[
                        styles.tierAmount,
                        selectedTopUpTier ===
                          "semi" &&
                          styles.tierAmountActive,
                      ]}
                    >
                      KSh 6,000
                    </Text>

                    <Text
                      style={styles.tierDescription}
                    >
                      Automated funding
                    </Text>
                  </TouchableOpacity>

                  {/* ANNUAL PLAN */}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.tierCard,
                      selectedTopUpTier ===
                        "annual" &&
                        styles.tierCardActive,
                    ]}
                    onPress={() =>
                      setSelectedTopUpTier(
                        "annual"
                      )
                    }
                  >
                    <View
                      style={[
                        styles.radio,
                        selectedTopUpTier ===
                          "annual" &&
                          styles.radioActive,
                      ]}
                    >
                      {selectedTopUpTier ===
                        "annual" && (
                        <View
                          style={
                            styles.radioInner
                          }
                        />
                      )}
                    </View>

                    <Text
                      style={[
                        styles.tierTitle,
                        selectedTopUpTier ===
                          "annual" &&
                          styles.tierTitleActive,
                      ]}
                    >
                      Annual Plan
                    </Text>

                    <Text
                      style={[
                        styles.tierAmount,
                        selectedTopUpTier ===
                          "annual" &&
                          styles.tierAmountActive,
                      ]}
                    >
                      KSh 12,000
                    </Text>

                    <Text
                      style={styles.tierDescription}
                    >
                      Automated funding
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* LOW BALANCE ALERTS */}

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.alertSetting}
                  onPress={() =>
                    setLowBalanceAlerts(
                      (current) => !current
                    )
                  }
                >
                  <View style={styles.alertIcon}>
                    <Ionicons
                      name="notifications-outline"
                      size={17}
                      color="#64748B"
                    />
                  </View>

                  <View
                    style={styles.alertTextContainer}
                  >
                    <Text style={styles.alertTitle}>
                      Low balance alerts
                    </Text>

                    <Text
                      style={styles.alertSubtitle}
                    >
                      Notify administrators when wallet
                      funds are low.
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.toggle,
                      lowBalanceAlerts &&
                        styles.toggleActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        lowBalanceAlerts &&
                          styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

          {/* ============================================================
              TRANSACTION HISTORY
          ============================================================ */}

          <View style={styles.panel}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.panelTitle}>
                  Recent transactions
                </Text>

                <Text style={styles.panelSubtitle}>
                  Your latest wallet activity.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={
                  handleViewAllTransactions
                }
              >
                <Text style={styles.viewAllText}>
                  View all
                </Text>
              </TouchableOpacity>
            </View>

            {transactions.length === 0 ? (
              <View
                style={styles.emptyTransactions}
              >
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={26}
                    color="#94A3B8"
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No transactions yet
                </Text>

                <Text style={styles.emptyText}>
                  Your wallet deposits and emergency charges
                  will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.transactionList}>
                {transactions.map(
                  (transaction) => (
                    <View
                      key={transaction.id}
                      style={
                        styles.transactionRow
                      }
                    >
                      <View
                        style={[
                          styles.transactionIcon,
                          transaction.kind ===
                            "credit"
                            ? styles.creditIcon
                            : styles.debitIcon,
                        ]}
                      >
                        <Ionicons
                          name={
                            transaction.kind ===
                            "credit"
                              ? "arrow-down"
                              : "arrow-up"
                          }
                          size={17}
                          color={
                            transaction.kind ===
                            "credit"
                              ? "#059669"
                              : "#DC2626"
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.transactionDetails
                        }
                      >
                        <Text
                          style={
                            styles.transactionLabel
                          }
                          numberOfLines={1}
                        >
                          {transaction.label}
                        </Text>

                        <Text
                          style={
                            styles.transactionDate
                          }
                          numberOfLines={1}
                        >
                          {transaction.date} ·{" "}
                          {transaction.id}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.transactionAmountContainer
                        }
                      >
                        <Text
                          style={[
                            styles.transactionAmount,
                            transaction.kind ===
                              "credit" &&
                              styles.creditAmount,
                          ]}
                        >
                          {transaction.kind ===
                          "credit"
                            ? "+"
                            : "-"}
                          {transaction.amount}
                        </Text>

                        {transaction.status && (
                          <Text
                            style={
                              styles.transactionStatus
                            }
                          >
                            {transaction.status}
                          </Text>
                        )}
                      </View>
                    </View>
                  )
                )}
              </View>
            )}
          </View>

          {/* ============================================================
              PAYMENT METHOD
          ============================================================ */}

          <View style={styles.panel}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.panelTitle}>
                  Payment method
                </Text>

                <Text style={styles.panelSubtitle}>
                  M-Pesa is currently your wallet deposit channel.
                </Text>
              </View>

              <View style={styles.secureBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={13}
                  color="#059669"
                />

                <Text
                  style={styles.secureBadgeText}
                >
                  Secure
                </Text>
              </View>
            </View>

            <View style={styles.paymentMethod}>
              <View style={styles.paymentIcon}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color="#16A34A"
                />
              </View>

              <View style={styles.methodDetails}>
                <Text style={styles.methodLabel}>
                  M-PESA
                </Text>

                <Text style={styles.methodDetail}>
                  {displayPhone ||
                    "No number selected"}
                </Text>
              </View>

              <View style={styles.defaultBadge}>
                <Text
                  style={styles.defaultBadgeText}
                >
                  DEFAULT
                </Text>
              </View>
            </View>
          </View>

          {/* ============================================================
              PAYMENT INFORMATION
          ============================================================ */}

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#DC2626"
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                How wallet deposits work
              </Text>

              <Text style={styles.infoText}>
                Enter your M-Pesa number and amount. SafeSync sends an
                STK push through M-Pesa. After you enter your M-Pesa
                PIN, M-Pesa confirms the payment to SafeSync
                . Your wallet is credited only after the
                payment has been successfully confirmed.
              </Text>
            </View>
          </View>

          {/* ============================================================
              BOTTOM SPACE
          ============================================================ */}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },

  /*
  |--------------------------------------------------------------------------
  | HEADER
  |--------------------------------------------------------------------------
  */

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 16,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.6,
    color: "#DC2626",
    marginBottom: 5,
  },

  pageTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    color: "#0F172A",
  },

  pageSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    marginTop: 5,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  /*
  |--------------------------------------------------------------------------
  | BALANCE CARD
  |--------------------------------------------------------------------------
  */

  balanceCard: {
    backgroundColor: "#DC2626",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#B91C1C",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 7,
  },

  balanceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceLabel: {
    color: "#FECACA",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "900",
    marginTop: 7,
  },

  balanceIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.18)",
  },

  balanceDivider: {
    height: 1,
    backgroundColor:
      "rgba(255,255,255,0.18)",
    marginVertical: 17,
  },

  balanceBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceStatus: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: "#86EFAC",
    marginRight: 7,
  },

  balanceStatusText: {
    color: "#FECACA",
    fontSize: 11,
    fontWeight: "700",
  },

  receiptButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  receiptButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  /*
  |--------------------------------------------------------------------------
  | PANELS
  |--------------------------------------------------------------------------
  */

  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 21,
    padding: 17,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  sectionIntro: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionIconBlue: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionIconPurple: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionIntroText: {
    flex: 1,
  },

  panelTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  panelSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
    marginTop: 3,
  },

  /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */

  formContainer: {
    marginTop: 17,
    gap: 14,
  },

  inputGroup: {
    gap: 7,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },

  inputWrapper: {
    height: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
  },

  inputPrefix: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  currencyPrefix: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },

  currencyPrefixText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#64748B",
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 4,
    paddingRight: 13,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },

  inputError: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "600",
  },

  quickAmountLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#94A3B8",
    marginBottom: 8,
  },

  quickAmountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  quickAmount: {
    minWidth: 62,
    paddingHorizontal: 11,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  quickAmountSelected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#DC2626",
  },

  quickAmountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },

  quickAmountTextSelected: {
    color: "#DC2626",
  },

  /*
  |--------------------------------------------------------------------------
  | PAYMENT SUMMARY
  |--------------------------------------------------------------------------
  */

  paymentSummary: {
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 13,
    gap: 11,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },

  summaryValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "900",
  },

  summaryMethod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  miniMpesaIcon: {
    width: 23,
    height: 23,
    borderRadius: 7,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryMethodText: {
    fontSize: 11,
    color: "#0F172A",
    fontWeight: "800",
  },

  /*
  |--------------------------------------------------------------------------
  | PAY BUTTON
  |--------------------------------------------------------------------------
  */

  payButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
    shadowColor: "#DC2626",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 4,
  },

  payButtonDisabled: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },

  payButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingHorizontal: 2,
  },

  securityText: {
    flex: 1,
    color: "#64748B",
    fontSize: 10,
    lineHeight: 15,
  },

  /*
  |--------------------------------------------------------------------------
  | AUTOMATIC TOP-UP
  |--------------------------------------------------------------------------
  */

  tierContainer: {
    flexDirection: "row",
    gap: 9,
    marginTop: 15,
  },

  tierCard: {
    flex: 1,
    minHeight: 126,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },

  tierCardActive: {
    borderColor: "#7C3AED",
    backgroundColor: "#F5F3FF",
  },

  radio: {
    width: 18,
    height: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  radioActive: {
    borderColor: "#7C3AED",
  },

  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 9,
    backgroundColor: "#7C3AED",
  },

  tierTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },

  tierTitleActive: {
    color: "#6D28D9",
  },

  tierAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 4,
  },

  tierAmountActive: {
    color: "#7C3AED",
  },

  tierDescription: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 3,
  },

  alertSetting: {
    minHeight: 62,
    marginTop: 12,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  alertTextContainer: {
    flex: 1,
  },

  alertTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },

  alertSubtitle: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 3,
  },

  toggle: {
    width: 40,
    height: 23,
    borderRadius: 20,
    backgroundColor: "#CBD5E1",
    padding: 3,
    justifyContent: "center",
  },

  toggleActive: {
    backgroundColor: "#DC2626",
  },

  toggleThumb: {
    width: 17,
    height: 17,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
  },

  toggleThumbActive: {
    alignSelf: "flex-end",
  },

  /*
  |--------------------------------------------------------------------------
  | TRANSACTIONS
  |--------------------------------------------------------------------------
  */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  viewAllText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },

  emptyTransactions: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 27,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
  },

  emptyText: {
    fontSize: 10,
    lineHeight: 16,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },

  transactionList: {
    marginTop: 12,
  },

  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  transactionIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
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
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },

  transactionDate: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 3,
  },

  transactionAmountContainer: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  transactionAmount: {
    fontSize: 12,
    fontWeight: "900",
    color: "#DC2626",
  },

  creditAmount: {
    color: "#059669",
  },

  transactionStatus: {
    fontSize: 8,
    color: "#94A3B8",
    marginTop: 2,
    textTransform: "uppercase",
    fontWeight: "700",
  },

  /*
  |--------------------------------------------------------------------------
  | PAYMENT METHOD
  |--------------------------------------------------------------------------
  */

  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },

  secureBadgeText: {
    fontSize: 9,
    color: "#047857",
    fontWeight: "800",
  },

  paymentMethod: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    paddingHorizontal: 12,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  methodDetails: {
    flex: 1,
  },

  methodLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },

  methodDetail: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },

  defaultBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  defaultBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#475569",
  },

  /*
  |--------------------------------------------------------------------------
  | INFORMATION CARD
  |--------------------------------------------------------------------------
  */

  infoCard: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    padding: 13,
    marginBottom: 15,
  },

  infoIcon: {
    marginRight: 10,
    marginTop: 1,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#7F1D1D",
  },

  infoText: {
    fontSize: 10,
    lineHeight: 16,
    color: "#475569",
    marginTop: 4,
  },
});