import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

/*
|--------------------------------------------------------------------------
| WHO PAYS FOR WHAT
|--------------------------------------------------------------------------
|
|  Public user          -> has a wallet and tops it up (M-Pesa or bank transfer)
|  Client organisation  -> NO wallet. The super admin pays for a subscription.
|  Service provider     -> NO wallet. The super admin pays for a subscription.
|
| Subscription prices are PER BRANCH. The API returns each plan already
| multiplied by the organisation's branch count (total + a summary line), so
| the app only displays it and never does the maths itself.
|
| Both payment methods go: App -> FastAPI -> PayHero. PayHero calls FastAPI's
| webhook, never the app, so the app polls FastAPI for the final status.
| EXPO_PUBLIC_API_URL already includes /api/v1.
*/

const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL || "https://api.safesync.co.ke/api/v1"
).replace(/\/+$/, "");

const PAYMENTS_URL = `${API_BASE}/payments`;

// An STK prompt is answered in seconds. A bank transfer can take minutes.
const POLLING = {
  mpesa: { intervalMs: 3000, maxAttempts: 20 }, // ~1 minute
  bank: { intervalMs: 6000, maxAttempts: 50 }, // ~5 minutes
} as const;

// The tab bar and the global emergency button float over the screen.
const BOTTOM_CLEARANCE = 170;

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type PaymentMethod = "mpesa" | "bank";
type PaymentKind = "deposit" | "subscription";

type Transaction = {
  id: string;
  label: string;
  date: string;
  amount: string;
  kind: "credit" | "debit";
  reference?: string | null;
};

type PaymentProfile = {
  account_kind: "public" | "organisation";
  organization_id?: string | null;
  organization_type?: "client" | "service_provider" | null;
  is_super_admin: boolean;
  first_deposit_required: boolean;
  first_deposit_amount: number;
  min_topup: number;
  max_deposit: number;
  mpesa_max_amount: number;
  bank_transfer_enabled: boolean;
};

type WalletOut = { balance: number; reserved: number; currency: string };

type WalletTransactionOut = {
  id: string;
  kind: "credit" | "debit";
  label: string;
  amount: number;
  balance_after: number;
  reference?: string | null;
  created_at: string;
};

type Plan = {
  code: string;
  name: string;
  description?: string | null;
  unit_price: number; // per branch
  duration_months: number;
  branch_count: number;
  total: number; // unit_price x branch_count
  summary: string; // "Total KSh 48,000 for 4 branches for 1 year (KSh 12,000 per branch)"
};

type Subscription = {
  plan_code: string;
  plan_name: string;
  status: "active" | "grace" | "expired";
  started_at: string;
  ends_at: string;
  grace_ends_at: string;
  branch_count?: number | null;
};

type BankInstructions = {
  bank_name?: string | null;
  paybill_number?: string | null;
  account_number: string;
  account_name?: string | null;
  amount: number;
  expires_at: string;
  note?: string | null;
};

type DepositCreated = {
  reference: string;
  status: string;
  method: PaymentMethod;
  expires_at?: string | null;
  bank?: BankInstructions | null;
};

type DepositStatus = {
  status: string; // "PENDING" | "SUCCESS" | "FAILED"
  receipt?: string | null;
  reason?: string | null;
};

type PendingBank = {
  reference: string;
  kind: PaymentKind;
  bank: BankInstructions;
};

// FastAPI: string for HTTPException, array for 422 validation errors.
type ApiErrorResponse = { detail?: string | { msg: string }[] };

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// Alert.alert with a message does nothing on web.
function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function normalizeKenyanPhone(phone: string): string | null {
  let value = phone.trim().replace(/[\s()-]/g, "");
  if (!value) return null;

  if (value.startsWith("+254")) value = value.substring(1);

  if (value.startsWith("254")) return value.length === 12 ? value : null;

  if (value.startsWith("07") || value.startsWith("01")) {
    return value.length === 10 ? `254${value.substring(1)}` : null;
  }

  return null;
}

function formatCurrency(amount: number) {
  return `KSh ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatWholeCurrency(amount: number) {
  return `KSh ${Math.round(amount).toLocaleString("en-KE")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationLabel(months: number) {
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "1 year" : `${years} years`;
  }
  return `${months} months`;
}

function extractErrorMessage(detail: ApiErrorResponse["detail"], fallback: string) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item.msg).join("\n");
  }
  return fallback;
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || "Unable to retrieve your authentication session.");
  }

  return session?.access_token ?? null;
}

async function apiRequest<T>(
  url: string,
  token: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const hasBody = init.body !== undefined;

  const response = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });

  if (!response.ok) {
    let message = "Request failed.";
    try {
      const body: ApiErrorResponse = await response.json();
      message = extractErrorMessage(body.detail, message);
    } catch {
      // Non-JSON error body: keep the generic message.
    }
    throw new Error(message);
  }

  return response.json();
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <View style={styles.bankRow}>
      <Text style={styles.bankLabel}>{label}</Text>
      <Text style={styles.bankValue} selectable>
        {value}
      </Text>
    </View>
  );
}

export default function Wallet() {
  /*
   * ACCOUNT / DATA STATE
   */

  const [profile, setProfile] = useState<PaymentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Public user
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Organisation (client or service provider)
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);

  /*
   * PAYMENT STATE
   */

  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");

  const [pendingBank, setPendingBank] = useState<PendingBank | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false); // waiting on an STK prompt
  const [isChecking, setIsChecking] = useState(false); // manual bank status check
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mounted = useRef(true);
  const pollId = useRef(0); // lets a new payment cancel an older poll

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pollId.current += 1;
    };
  }, []);

  /*
   * DERIVED VALUES
   */

  const isPublic = profile?.account_kind === "public";
  const isOrganisation = profile?.account_kind === "organisation";
  const isClientOrg = isOrganisation && profile?.organization_type === "client";
  const canPaySubscription = isOrganisation && !!profile?.is_super_admin;
  const firstDeposit = !!profile?.first_deposit_required;

  const bankEnabled = !!profile?.bank_transfer_enabled;
  const activeMethod: PaymentMethod = bankEnabled ? method : "mpesa";

  const normalizedPhone = useMemo(() => normalizeKenyanPhone(phoneNumber), [phoneNumber]);

  const parsedAmount = useMemo(() => {
    const cleaned = amount.replace(/,/g, "").trim();
    if (!cleaned) return 0;
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : 0;
  }, [amount]);

  const amountError = useMemo(() => {
    if (!parsedAmount || !profile) return null;

    if (firstDeposit && parsedAmount !== profile.first_deposit_amount) {
      return `Your first deposit must be exactly KSh ${profile.first_deposit_amount}.`;
    }
    if (!firstDeposit && parsedAmount < profile.min_topup) {
      return `Minimum deposit is KSh ${profile.min_topup}.`;
    }
    if (parsedAmount > profile.max_deposit) {
      return `Maximum deposit is KSh ${profile.max_deposit.toLocaleString("en-KE")}.`;
    }
    if (activeMethod === "mpesa" && parsedAmount > profile.mpesa_max_amount) {
      return `M-Pesa limits a single payment to KSh ${profile.mpesa_max_amount.toLocaleString("en-KE")}.`;
    }
    return null;
  }, [parsedAmount, firstDeposit, profile, activeMethod]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === selectedPlanCode) || null,
    [plans, selectedPlanCode]
  );

  // M-Pesa caps a single payment. A big multi-branch subscription may exceed it.
  const subscriptionTooLargeForMpesa =
    !!selectedPlan &&
    !!profile &&
    activeMethod === "mpesa" &&
    selectedPlan.total > profile.mpesa_max_amount;

  const busy = isProcessing || isConfirming;
  const phoneReady = activeMethod === "bank" || !!normalizedPhone;

  const canSubmitDeposit =
    isPublic &&
    phoneReady &&
    parsedAmount >= 1 &&
    Number.isInteger(parsedAmount) &&
    !amountError &&
    !busy;

  const canSubmitSubscription =
    canPaySubscription &&
    phoneReady &&
    !!selectedPlan &&
    !subscriptionTooLargeForMpesa &&
    !busy;

  /*
   * LOAD DATA
   */

  const loadData = useCallback(async () => {
    try {
      const token = await getAccessToken();

      if (!token) {
        if (mounted.current) setLoadError("Please sign in again to view your payments.");
        return;
      }

      const profileData = await apiRequest<PaymentProfile>(`${PAYMENTS_URL}/profile`, token);

      if (profileData.account_kind === "public") {
        const [wallet, txns] = await Promise.all([
          apiRequest<WalletOut>(`${PAYMENTS_URL}/wallet`, token),
          apiRequest<WalletTransactionOut[]>(
            `${PAYMENTS_URL}/wallet/transactions?limit=10`,
            token
          ),
        ]);

        if (!mounted.current) return;

        setBalance(wallet.balance);
        setTransactions(
          txns.map((item) => ({
            id: item.id,
            label: item.label,
            kind: item.kind,
            reference: item.reference,
            date: formatDate(item.created_at),
            amount: formatCurrency(item.amount),
          }))
        );
      } else {
        // Client and service provider organisations both subscribe to a plan.
        const [planList, currentSubscription] = await Promise.all([
          apiRequest<Plan[]>(`${PAYMENTS_URL}/plans`, token),
          apiRequest<Subscription | null>(`${PAYMENTS_URL}/subscription`, token),
        ]);

        if (!mounted.current) return;

        setPlans(planList);
        setSubscription(currentSubscription);
        setSelectedPlanCode((current) =>
          current && planList.some((plan) => plan.code === current)
            ? current
            : planList[0]?.code || null
        );
      }

      if (!mounted.current) return;

      setProfile(profileData);
      setProfileLoaded(true);
      setLoadError(null);

      // The first deposit has one fixed amount: prefill it.
      if (profileData.first_deposit_required) {
        setAmount((current) => current || String(profileData.first_deposit_amount));
      }
    } catch (error) {
      console.error("Wallet load error:", error);

      if (mounted.current) {
        setLoadError(
          error instanceof Error ? error.message : "Could not load your payment details."
        );
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      if (mounted.current) setIsRefreshing(false);
    }
  };

  /*
   * PAYMENT STATUS
   */

  const fetchStatus = async (reference: string): Promise<DepositStatus | null> => {
    try {
      const token = await getAccessToken(); // fresh each time: bank polls run for minutes
      if (!token) return null;
      return await apiRequest<DepositStatus>(
        `${PAYMENTS_URL}/deposit/${encodeURIComponent(reference)}`,
        token
      );
    } catch {
      return null; // transient error or not visible yet: keep waiting
    }
  };

  // Returns true when the payment has reached a final state.
  const applyStatus = (result: DepositStatus, kind: PaymentKind): boolean => {
    const status = String(result.status || "").toUpperCase();

    if (status === "SUCCESS") {
      const receiptText = result.receipt ? ` (receipt ${result.receipt})` : "";
      setPendingBank(null);
      notify(
        "Payment confirmed",
        kind === "subscription"
          ? `Your payment was confirmed${receiptText} and your subscription is now active.`
          : `Your payment was confirmed${receiptText} and your wallet has been credited.`
      );
      loadData();
      return true;
    }

    if (status === "FAILED") {
      setPendingBank(null);
      notify("Payment not completed", result.reason || "The payment was not completed.");
      return true;
    }

    return false; // PENDING
  };

  const pollPaymentStatus = async (
    reference: string,
    kind: PaymentKind,
    via: PaymentMethod
  ) => {
    const myId = ++pollId.current;
    const { intervalMs, maxAttempts } = POLLING[via];

    if (via === "mpesa") setIsConfirming(true);

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));

        if (!mounted.current || pollId.current !== myId) return;

        const result = await fetchStatus(reference);
        if (result && applyStatus(result, kind)) return;
      }

      if (mounted.current && pollId.current === myId) {
        notify(
          via === "bank" ? "Waiting for your bank" : "Still waiting for confirmation",
          via === "bank"
            ? "We haven't received the transfer yet. Keep the details on screen: it updates once your bank confirms, or tap “Check payment status”."
            : "We haven't heard back yet. Pull down to refresh shortly. SafeSync updates as soon as the payment is confirmed."
        );
      }
    } finally {
      if (mounted.current && pollId.current === myId && via === "mpesa") {
        setIsConfirming(false);
      }
    }
  };

  const handleCheckBankStatus = async () => {
    if (!pendingBank || isChecking) return;

    setIsChecking(true);
    try {
      const result = await fetchStatus(pendingBank.reference);

      if (!result) {
        notify("Couldn't check", "Please check your connection and try again.");
      } else if (!applyStatus(result, pendingBank.kind)) {
        notify(
          "Not received yet",
          "Your bank hasn't confirmed the transfer yet. This can take a few minutes."
        );
      }
    } finally {
      if (mounted.current) setIsChecking(false);
    }
  };

  /*
   * SUBMIT A PAYMENT (shared by deposits and subscriptions)
   *
   * Returns true when the request was accepted. For M-Pesa that only means
   * PayHero accepted the STK push. For a bank transfer it means we now have
   * details for the customer to pay to. Neither means money has arrived.
   */

  const submitPayment = async (
    path: string,
    body: Record<string, unknown>,
    kind: PaymentKind
  ): Promise<boolean> => {
    if (isProcessing) return false;

    setIsProcessing(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        notify("Session expired", "Please sign in again before making a payment.");
        return false;
      }

      const data = await apiRequest<DepositCreated>(`${PAYMENTS_URL}${path}`, token, {
        method: "POST",
        body: {
          ...body,
          method: activeMethod,
          ...(activeMethod === "mpesa" ? { phone_number: normalizedPhone } : {}),
        },
      });

      if (data.method === "bank" && data.bank) {
        setPendingBank({ reference: data.reference, kind, bank: data.bank });
        void pollPaymentStatus(data.reference, kind, "bank");
      } else {
        setPendingBank(null);
        notify(
          "M-Pesa request sent",
          `An M-Pesa prompt has been sent to +${normalizedPhone}.\n\nEnter your M-Pesa PIN to complete the payment.\n\nReference: ${data.reference}`
        );
        void pollPaymentStatus(data.reference, kind, "mpesa");
      }

      return true;
    } catch (error) {
      console.error("SafeSync payment error:", error);

      notify(
        "Payment failed",
        error instanceof Error ? error.message : "Could not connect to the payment service."
      );

      return false;
    } finally {
      if (mounted.current) setIsProcessing(false);
    }
  };

  const requirePhoneIfMpesa = (): boolean => {
    if (activeMethod === "mpesa" && !normalizedPhone) {
      notify(
        "Invalid phone number",
        "Enter a valid Kenyan M-Pesa number, for example 0712345678 or +254712345678."
      );
      return false;
    }
    return true;
  };

  const handleDeposit = async () => {
    if (!requirePhoneIfMpesa()) return;

    if (amountError || parsedAmount < 1 || !Number.isInteger(parsedAmount)) {
      notify("Invalid amount", amountError || "Enter a whole amount of at least KSh 1.");
      return;
    }

    const started = await submitPayment("/deposit", { amount: parsedAmount }, "deposit");

    if (started && !firstDeposit) setAmount("");
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      notify("Choose a plan", "Select a subscription plan to continue.");
      return;
    }

    if (subscriptionTooLargeForMpesa && profile) {
      notify(
        "Amount too large for M-Pesa",
        `M-Pesa limits a single payment to KSh ${profile.mpesa_max_amount.toLocaleString(
          "en-KE"
        )}. Please pay by bank transfer.`
      );
      return;
    }

    if (!requirePhoneIfMpesa()) return;

    await submitPayment("/subscribe", { plan_code: selectedPlan.code }, "subscription");
  };

  const handleDownloadReceipts = () => {
    notify(
      "Receipts",
      "Receipt history will be available once receipts are connected to the SafeSync finance API."
    );
  };

  const handleViewAllTransactions = () => {
    notify(
      "Transaction history",
      "Full transaction history will be connected to the SafeSync finance API."
    );
  };

  /*
   * SHARED UI PIECES
   */

  const methodSelector = bankEnabled ? (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Payment method</Text>

      <View style={styles.methodRow}>
        {(
          [
            { key: "mpesa", label: "M-Pesa", icon: "phone-portrait-outline" },
            { key: "bank", label: "Bank transfer", icon: "business-outline" },
          ] as const
        ).map((option) => {
          const active = activeMethod === option.key;

          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.8}
              disabled={busy}
              style={[styles.methodOption, active && styles.methodOptionActive]}
              onPress={() => setMethod(option.key)}
            >
              <Ionicons
                name={option.icon}
                size={17}
                color={active ? "#DC2626" : "#64748B"}
              />
              <Text
                style={[styles.methodOptionText, active && styles.methodOptionTextActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  ) : null;

  const phoneField =
    activeMethod === "mpesa" ? (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>M-Pesa phone number</Text>

        <View style={styles.inputWrapper}>
          <View style={styles.inputPrefix}>
            <Ionicons name="phone-portrait-outline" size={18} color="#64748B" />
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
            editable={!busy}
          />
        </View>

        {phoneNumber.length > 0 && !normalizedPhone && (
          <Text style={styles.inputError}>Enter a valid Kenyan M-Pesa number.</Text>
        )}
      </View>
    ) : null;

  const securityNote = (
    <View style={styles.securityNote}>
      <Ionicons name="shield-checkmark-outline" size={15} color="#64748B" />

      <Text style={styles.securityText}>
        {activeMethod === "mpesa"
          ? "Your M-Pesa PIN is entered only on the official M-Pesa prompt. SafeSync does not collect your PIN."
          : "You pay from your own banking app. SafeSync never asks for your banking login or PIN."}
      </Text>
    </View>
  );

  const renderPayButton = (label: string, onPress: () => void, enabled: boolean) => (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!enabled}
      onPress={onPress}
      style={[styles.payButton, !enabled && styles.payButtonDisabled]}
    >
      {busy ? (
        <>
          <ActivityIndicator size="small" color="#FFFFFF" />

          <Text style={styles.payButtonText}>
            {isProcessing
              ? activeMethod === "bank"
                ? "Getting transfer details..."
                : "Sending STK Push..."
              : "Waiting for confirmation..."}
          </Text>
        </>
      ) : (
        <>
          <Ionicons
            name={activeMethod === "bank" ? "business-outline" : "phone-portrait-outline"}
            size={19}
            color="#FFFFFF"
          />

          <Text style={styles.payButtonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  const payLabel = activeMethod === "bank" ? "Get bank transfer details" : "Pay with M-Pesa";

  const bankCard = pendingBank ? (
    <View style={styles.bankCard}>
      <Text style={styles.bankTitle}>Pay by bank transfer</Text>

      <DetailRow label="Bank" value={pendingBank.bank.bank_name} />
      <DetailRow label="Paybill / business number" value={pendingBank.bank.paybill_number} />
      <DetailRow label="Account number" value={pendingBank.bank.account_number} />
      <DetailRow label="Account name" value={pendingBank.bank.account_name} />
      <DetailRow label="Amount" value={formatWholeCurrency(pendingBank.bank.amount)} />
      <DetailRow
        label="Valid until"
        value={formatDateTime(pendingBank.bank.expires_at)}
      />

      {!!pendingBank.bank.note && (
        <Text style={styles.bankNote}>{pendingBank.bank.note}</Text>
      )}

      <View style={styles.waitingRow}>
        <ActivityIndicator size="small" color="#DC2626" />
        <Text style={styles.waitingText}>Waiting for your bank to confirm the transfer…</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        disabled={isChecking}
        style={[styles.checkButton, isChecking && styles.payButtonDisabled]}
        onPress={handleCheckBankStatus}
      >
        {isChecking ? (
          <ActivityIndicator size="small" color="#DC2626" />
        ) : (
          <Text style={styles.checkButtonText}>Check payment status</Text>
        )}
      </TouchableOpacity>
    </View>
  ) : null;

  /*
   * RENDER
   */

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          {/* HEADER */}

          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.eyebrow}>SAFESYNC FINANCE</Text>

              <Text style={styles.pageTitle}>{isOrganisation ? "Subscription" : "Wallet"}</Text>

              <Text style={styles.pageSubtitle}>
                {isOrganisation
                  ? isClientOrg
                    ? "Keep your organisation subscribed so all your branches stay connected to SafeSync."
                    : "Keep your organisation subscribed so your responders stay active."
                  : "Keep funds available so emergency dispatch is never delayed by payment."}
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name={isOrganisation ? "ribbon-outline" : "wallet-outline"}
                size={23}
                color="#DC2626"
              />
            </View>
          </View>

          {/* LOADING / ERROR (before we know which account this is) */}

          {!profileLoaded && (
            <View style={styles.panel}>
              <View style={styles.emptyTransactions}>
                {loadError ? (
                  <>
                    <View style={styles.emptyIcon}>
                      <Ionicons name="cloud-offline-outline" size={26} color="#94A3B8" />
                    </View>

                    <Text style={styles.emptyTitle}>Could not load payment details</Text>

                    <Text style={styles.emptyText}>{loadError} Pull down to try again.</Text>
                  </>
                ) : (
                  <ActivityIndicator size="small" color="#DC2626" />
                )}
              </View>
            </View>
          )}

          {/* ==========================================================
              PUBLIC USER: WALLET
          ========================================================== */}

          {profileLoaded && isPublic && (
            <>
              <View style={styles.balanceCard}>
                <View style={styles.balanceTopRow}>
                  <View>
                    <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
                    <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
                  </View>

                  <View style={styles.balanceIcon}>
                    <Ionicons name="wallet" size={22} color="#FFFFFF" />
                  </View>
                </View>

                <View style={styles.balanceDivider} />

                <View style={styles.balanceBottomRow}>
                  <View style={styles.balanceStatus}>
                    <View style={styles.statusDot} />
                    <Text style={styles.balanceStatusText}>Wallet ready</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.receiptButton}
                    onPress={handleDownloadReceipts}
                  >
                    <Ionicons name="receipt-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.receiptButtonText}>Receipts</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ADD MONEY */}

              <View style={styles.panel}>
                <View style={styles.sectionIntro}>
                  <View style={styles.sectionIconBlue}>
                    <Ionicons name="add-circle-outline" size={20} color="#DC2626" />
                  </View>

                  <View style={styles.sectionIntroText}>
                    <Text style={styles.panelTitle}>Add money</Text>

                    <Text style={styles.panelSubtitle}>
                      {firstDeposit && profile
                        ? `Your first deposit is KSh ${profile.first_deposit_amount}.`
                        : "Top up your wallet by M-Pesa or bank transfer."}
                    </Text>
                  </View>
                </View>

                <View style={styles.formContainer}>
                  {methodSelector}
                  {phoneField}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Deposit amount</Text>

                    <View style={styles.inputWrapper}>
                      <View style={styles.currencyPrefix}>
                        <Text style={styles.currencyPrefixText}>KSh</Text>
                      </View>

                      <TextInput
                        style={styles.input}
                        value={amount}
                        onChangeText={(value) => setAmount(value.replace(/[^0-9]/g, ""))}
                        placeholder="Enter amount"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        editable={!busy && !(firstDeposit && !!amount)}
                      />
                    </View>

                    {!!amountError && <Text style={styles.inputError}>{amountError}</Text>}
                  </View>

                  {!firstDeposit && (
                    <View>
                      <Text style={styles.quickAmountLabel}>QUICK AMOUNTS</Text>

                      <View style={styles.quickAmountGrid}>
                        {QUICK_AMOUNTS.map((value) => {
                          const selected = parsedAmount === value;

                          return (
                            <TouchableOpacity
                              key={value}
                              activeOpacity={0.8}
                              disabled={busy}
                              style={[styles.quickAmount, selected && styles.quickAmountSelected]}
                              onPress={() => setAmount(String(value))}
                            >
                              <Text
                                style={[
                                  styles.quickAmountText,
                                  selected && styles.quickAmountTextSelected,
                                ]}
                              >
                                {value.toLocaleString("en-KE")}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  <View style={styles.paymentSummary}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Deposit</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(parsedAmount)}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Payment method</Text>
                      <Text style={styles.summaryMethodText}>
                        {activeMethod === "bank" ? "Bank transfer" : "M-Pesa"}
                      </Text>
                    </View>
                  </View>

                  {renderPayButton(payLabel, handleDeposit, canSubmitDeposit)}

                  {bankCard}
                  {securityNote}
                </View>
              </View>

              {/* TRANSACTION HISTORY */}

              <View style={styles.panel}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.panelTitle}>Recent transactions</Text>
                    <Text style={styles.panelSubtitle}>Your latest wallet activity.</Text>
                  </View>

                  <TouchableOpacity activeOpacity={0.7} onPress={handleViewAllTransactions}>
                    <Text style={styles.viewAllText}>View all</Text>
                  </TouchableOpacity>
                </View>

                {transactions.length === 0 ? (
                  <View style={styles.emptyTransactions}>
                    <View style={styles.emptyIcon}>
                      <Ionicons name="receipt-outline" size={26} color="#94A3B8" />
                    </View>

                    <Text style={styles.emptyTitle}>No transactions yet</Text>

                    <Text style={styles.emptyText}>
                      Your wallet deposits and emergency charges will appear here.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.transactionList}>
                    {transactions.map((transaction) => (
                      <View key={transaction.id} style={styles.transactionRow}>
                        <View
                          style={[
                            styles.transactionIcon,
                            transaction.kind === "credit" ? styles.creditIcon : styles.debitIcon,
                          ]}
                        >
                          <Ionicons
                            name={transaction.kind === "credit" ? "arrow-down" : "arrow-up"}
                            size={17}
                            color={transaction.kind === "credit" ? "#059669" : "#DC2626"}
                          />
                        </View>

                        <View style={styles.transactionDetails}>
                          <Text style={styles.transactionLabel} numberOfLines={1}>
                            {transaction.label}
                          </Text>

                          <Text style={styles.transactionDate} numberOfLines={1}>
                            {transaction.date}
                            {transaction.reference ? ` · ${transaction.reference}` : ""}
                          </Text>
                        </View>

                        <View style={styles.transactionAmountContainer}>
                          <Text
                            style={[
                              styles.transactionAmount,
                              transaction.kind === "credit" && styles.creditAmount,
                            ]}
                          >
                            {transaction.kind === "credit" ? "+" : "-"}
                            {transaction.amount}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons name="information-circle-outline" size={20} color="#DC2626" />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>How wallet deposits work</Text>

                  <Text style={styles.infoText}>
                    Pay with M-Pesa or by bank transfer. Your wallet is credited only after the
                    payment has been confirmed, never before.
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* ==========================================================
              ORGANISATION (CLIENT OR SERVICE PROVIDER): SUBSCRIPTION
              No wallet, no deposit form. Priced per branch.
          ========================================================== */}

          {profileLoaded && isOrganisation && (
            <>
              <View style={styles.balanceCard}>
                <View style={styles.balanceTopRow}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.balanceLabel}>CURRENT PLAN</Text>

                    <Text style={styles.balanceAmount}>
                      {subscription ? subscription.plan_name : "No plan"}
                    </Text>
                  </View>

                  <View style={styles.balanceIcon}>
                    <Ionicons name="ribbon" size={22} color="#FFFFFF" />
                  </View>
                </View>

                <View style={styles.balanceDivider} />

                <View style={styles.balanceBottomRow}>
                  <View style={styles.balanceStatus}>
                    <View
                      style={[
                        styles.statusDot,
                        subscription?.status !== "active" && { backgroundColor: "#FDE68A" },
                      ]}
                    />

                    <Text style={styles.balanceStatusText}>
                      {!subscription
                        ? "Not subscribed"
                        : subscription.status === "active"
                        ? `Active until ${formatDate(subscription.ends_at)}${
                            subscription.branch_count
                              ? ` · ${subscription.branch_count} ${
                                  subscription.branch_count === 1 ? "branch" : "branches"
                                }`
                              : ""
                          }`
                        : subscription.status === "grace"
                        ? `Grace period until ${formatDate(subscription.grace_ends_at)}`
                        : `Expired on ${formatDate(subscription.grace_ends_at)}`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.receiptButton}
                    onPress={handleDownloadReceipts}
                  >
                    <Ionicons name="receipt-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.receiptButtonText}>Receipts</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* NOT THE SUPER ADMIN */}

              {!canPaySubscription && (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Super admin only</Text>

                  <Text style={styles.panelSubtitle}>
                    Only your organisation's super admin can pay for or change the subscription.
                  </Text>
                </View>
              )}

              {/* SUPER ADMIN: PICK A PLAN AND PAY */}

              {canPaySubscription && (
                <View style={styles.panel}>
                  <View style={styles.sectionIntro}>
                    <View style={styles.sectionIconPurple}>
                      <Ionicons name="ribbon-outline" size={19} color="#7C3AED" />
                    </View>

                    <View style={styles.sectionIntroText}>
                      <Text style={styles.panelTitle}>
                        {subscription ? "Renew or change plan" : "Choose a plan"}
                      </Text>

                      <Text style={styles.panelSubtitle}>
                        Prices are per branch. The total below is for all your branches.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tierContainer}>
                    {plans.map((plan) => {
                      const active = selectedPlanCode === plan.code;

                      return (
                        <TouchableOpacity
                          key={plan.code}
                          activeOpacity={0.8}
                          disabled={busy}
                          style={[styles.tierCard, active && styles.tierCardActive]}
                          onPress={() => setSelectedPlanCode(plan.code)}
                        >
                          <View style={[styles.radio, active && styles.radioActive]}>
                            {active && <View style={styles.radioInner} />}
                          </View>

                          <Text style={[styles.tierTitle, active && styles.tierTitleActive]}>
                            {plan.name}
                          </Text>

                          <Text style={[styles.tierAmount, active && styles.tierAmountActive]}>
                            {formatWholeCurrency(plan.unit_price)}
                          </Text>

                          <Text style={styles.tierDescription}>
                            per branch · {durationLabel(plan.duration_months)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {plans.length === 0 && (
                    <Text style={[styles.panelSubtitle, { marginTop: 14 }]}>
                      No plans are available right now. Pull down to refresh.
                    </Text>
                  )}

                  {/* TOTAL FOR ALL BRANCHES */}

                  {selectedPlan && (
                    <View style={styles.totalNote}>
                      <Ionicons name="calculator-outline" size={16} color="#6D28D9" />
                      <Text style={styles.totalNoteText}>{selectedPlan.summary}</Text>
                    </View>
                  )}

                  <View style={styles.formContainer}>
                    {methodSelector}
                    {phoneField}

                    <View style={styles.paymentSummary}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Plan</Text>
                        <Text style={styles.summaryValue}>
                          {selectedPlan
                            ? `${selectedPlan.name} (${durationLabel(selectedPlan.duration_months)})`
                            : "—"}
                        </Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Branches</Text>
                        <Text style={styles.summaryValue}>
                          {selectedPlan
                            ? `${selectedPlan.branch_count} × ${formatWholeCurrency(
                                selectedPlan.unit_price
                              )}`
                            : "—"}
                        </Text>
                      </View>

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Amount to pay</Text>
                        <Text style={styles.summaryValue}>
                          {selectedPlan ? formatWholeCurrency(selectedPlan.total) : "—"}
                        </Text>
                      </View>
                    </View>

                    {subscriptionTooLargeForMpesa && profile && (
                      <View style={styles.warningBox}>
                        <Text style={styles.warningText}>
                          M-Pesa limits a single payment to KSh{" "}
                          {profile.mpesa_max_amount.toLocaleString("en-KE")}.{" "}
                          {bankEnabled
                            ? "Choose bank transfer to pay this amount."
                            : "Please contact SafeSync support to arrange payment."}
                        </Text>
                      </View>
                    )}

                    {renderPayButton(payLabel, handleSubscribe, canSubmitSubscription)}

                    {bankCard}
                    {securityNote}
                  </View>
                </View>
              )}

              <View style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons name="information-circle-outline" size={20} color="#DC2626" />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>How subscription payments work</Text>

                  <Text style={styles.infoText}>
                    Your super admin picks a plan and pays with M-Pesa or bank transfer. The price
                    is per branch, so the total depends on how many branches you have. Your
                    subscription is activated only after the payment is confirmed.
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={{ height: BOTTOM_CLEARANCE }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  keyboardContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 30 },

  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 },
  headerTextContainer: { flex: 1, paddingRight: 16 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.6, color: "#DC2626", marginBottom: 5 },
  pageTitle: { fontSize: 30, lineHeight: 36, fontWeight: "900", color: "#0F172A" },
  pageSubtitle: { fontSize: 13, lineHeight: 19, color: "#64748B", marginTop: 5 },
  headerIcon: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: "#FEF2F2",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FECACA",
  },

  balanceCard: {
    backgroundColor: "#DC2626", borderRadius: 24, padding: 20, marginBottom: 16,
    shadowColor: "#B91C1C", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 14, elevation: 7,
  },
  balanceTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  balanceLabel: { color: "#FECACA", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  balanceAmount: { color: "#FFFFFF", fontSize: 34, lineHeight: 42, fontWeight: "900", marginTop: 7 },
  balanceIcon: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  balanceDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginVertical: 17 },
  balanceBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  balanceStatus: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 10 },
  statusDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: "#86EFAC", marginRight: 7 },
  balanceStatusText: { color: "#FECACA", fontSize: 11, fontWeight: "700", flexShrink: 1 },
  receiptButton: {
    minHeight: 34, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  receiptButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },

  panel: { backgroundColor: "#FFFFFF", borderRadius: 21, padding: 17, marginBottom: 15, borderWidth: 1, borderColor: "#E2E8F0" },
  sectionIntro: { flexDirection: "row", alignItems: "center" },
  sectionIconBlue: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: "#FEF2F2",
    alignItems: "center", justifyContent: "center", marginRight: 11,
  },
  sectionIconPurple: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: "#F5F3FF",
    alignItems: "center", justifyContent: "center", marginRight: 11,
  },
  sectionIntroText: { flex: 1 },
  panelTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  panelSubtitle: { fontSize: 12, lineHeight: 18, color: "#64748B", marginTop: 3 },
  formContainer: { marginTop: 17, gap: 14 },

  inputGroup: { gap: 7 },
  inputLabel: { fontSize: 11, fontWeight: "800", color: "#334155" },
  inputWrapper: {
    height: 50, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 13,
    backgroundColor: "#F8FAFC", flexDirection: "row", alignItems: "center",
  },
  inputPrefix: { width: 46, alignItems: "center", justifyContent: "center" },
  currencyPrefix: { width: 52, alignItems: "center", justifyContent: "center" },
  currencyPrefixText: { fontSize: 12, fontWeight: "900", color: "#64748B" },
  input: { flex: 1, height: "100%", paddingHorizontal: 4, paddingRight: 13, fontSize: 14, color: "#0F172A", fontWeight: "600" },
  inputError: { color: "#DC2626", fontSize: 10, fontWeight: "600" },

  methodRow: { flexDirection: "row", gap: 9 },
  methodOption: {
    flex: 1, height: 46, borderRadius: 13, borderWidth: 1, borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
  },
  methodOptionActive: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  methodOptionText: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  methodOptionTextActive: { color: "#DC2626" },

  quickAmountLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2, color: "#94A3B8", marginBottom: 8 },
  quickAmountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickAmount: {
    minWidth: 62, paddingHorizontal: 11, height: 34, borderRadius: 9, backgroundColor: "#F8FAFC",
    borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center",
  },
  quickAmountSelected: { backgroundColor: "#FEF2F2", borderColor: "#DC2626" },
  quickAmountText: { fontSize: 11, fontWeight: "800", color: "#475569" },
  quickAmountTextSelected: { color: "#DC2626" },

  paymentSummary: { borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", padding: 13, gap: 11 },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  summaryLabel: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  summaryValue: { fontSize: 13, color: "#0F172A", fontWeight: "900", flexShrink: 1, textAlign: "right" },
  summaryMethodText: { fontSize: 11, color: "#0F172A", fontWeight: "800" },

  payButton: {
    minHeight: 52, borderRadius: 14, backgroundColor: "#DC2626", flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2,
    shadowColor: "#DC2626", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 9, elevation: 4,
  },
  payButtonDisabled: { backgroundColor: "#94A3B8", shadowOpacity: 0, elevation: 0 },
  payButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },

  securityNote: { flexDirection: "row", alignItems: "flex-start", gap: 7, paddingHorizontal: 2 },
  securityText: { flex: 1, color: "#64748B", fontSize: 10, lineHeight: 15 },

  bankCard: { borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", padding: 14, gap: 10 },
  bankTitle: { fontSize: 13, fontWeight: "900", color: "#0F172A" },
  bankRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  bankLabel: { fontSize: 11, color: "#64748B", fontWeight: "600", flexShrink: 1 },
  bankValue: { fontSize: 13, color: "#0F172A", fontWeight: "900", flexShrink: 1, textAlign: "right" },
  bankNote: { fontSize: 10, lineHeight: 15, color: "#64748B" },
  waitingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  waitingText: { flex: 1, fontSize: 11, color: "#475569", fontWeight: "600" },
  checkButton: {
    height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: "#DC2626",
    alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF",
  },
  checkButtonText: { color: "#DC2626", fontSize: 13, fontWeight: "800" },

  tierContainer: { flexDirection: "row", gap: 9, marginTop: 15 },
  tierCard: { flex: 1, minHeight: 126, padding: 13, borderRadius: 15, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  tierCardActive: { borderColor: "#7C3AED", backgroundColor: "#F5F3FF" },
  radio: {
    width: 18, height: 18, borderRadius: 18, borderWidth: 1.5, borderColor: "#CBD5E1",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  radioActive: { borderColor: "#7C3AED" },
  radioInner: { width: 9, height: 9, borderRadius: 9, backgroundColor: "#7C3AED" },
  tierTitle: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  tierTitleActive: { color: "#6D28D9" },
  tierAmount: { fontSize: 16, fontWeight: "900", color: "#0F172A", marginTop: 4 },
  tierAmountActive: { color: "#7C3AED" },
  tierDescription: { fontSize: 9, color: "#94A3B8", marginTop: 3 },

  totalNote: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 11,
    borderRadius: 12, backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE",
  },
  totalNoteText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: "700", color: "#5B21B6" },
  warningBox: { padding: 11, borderRadius: 12, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  warningText: { fontSize: 11, lineHeight: 16, color: "#92400E", fontWeight: "600" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  viewAllText: { color: "#DC2626", fontSize: 11, fontWeight: "800", marginTop: 2 },

  emptyTransactions: { alignItems: "center", justifyContent: "center", paddingVertical: 27, paddingHorizontal: 20 },
  emptyIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyTitle: { fontSize: 12, fontWeight: "800", color: "#475569" },
  emptyText: { fontSize: 10, lineHeight: 16, color: "#94A3B8", textAlign: "center", marginTop: 4 },

  transactionList: { marginTop: 12 },
  transactionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  transactionIcon: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 11 },
  creditIcon: { backgroundColor: "#ECFDF5" },
  debitIcon: { backgroundColor: "#FEF2F2" },
  transactionDetails: { flex: 1, minWidth: 0 },
  transactionLabel: { fontSize: 12, fontWeight: "800", color: "#0F172A" },
  transactionDate: { fontSize: 9, color: "#94A3B8", marginTop: 3 },
  transactionAmountContainer: { alignItems: "flex-end", marginLeft: 8 },
  transactionAmount: { fontSize: 12, fontWeight: "900", color: "#DC2626" },
  creditAmount: { color: "#059669" },

  infoCard: {
    flexDirection: "row", backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 16, padding: 13, marginBottom: 15,
  },
  infoIcon: { marginRight: 10, marginTop: 1 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 11, fontWeight: "900", color: "#7F1D1D" },
  infoText: { fontSize: 10, lineHeight: 16, color: "#475569", marginTop: 4 },
});