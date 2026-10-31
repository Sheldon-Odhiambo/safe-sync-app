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
  Modal,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import * as Sharing from "expo-sharing";
// SDK 54+: the callback API (downloadAsync, cacheDirectory) lives in /legacy.
// On SDK 53 or older, change this to: import * as FileSystem from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "@/lib/supabase";

const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL || "https://api.safesync.co.ke/api/v1"
).replace(/\/+$/, "");

const PAYMENTS_URL = `${API_BASE}/payments`;

// M-Pesa prompts and card confirmations usually land within seconds.
const POLLING = { intervalMs: 3000, maxAttempts: 40 } as const; // ~2 minutes

const COLLAPSED_ROWS = 5; // rows shown before "View all"
const FIRST_PAGE = 10;
const PAGE_SIZE = 20;

// The tab bar and the global emergency button float over the screen.
const BOTTOM_CLEARANCE = 170;

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type PaymentKind = "deposit" | "subscription";
type AccountKind = "public" | "organisation";
type Method = "mpesa" | "card";
type NextAction =
  | "send_pin"
  | "send_otp"
  | "send_phone"
  | "send_birthday"
  | "open_url"
  | "pay_offline";

type Row = {
  id: string;
  label: string;
  date: string;
  amount: string;
  kind: "credit" | "debit" | "payment";
  reference?: string | null; // set => a receipt can be downloaded
};

type PaymentProfile = {
  account_kind: AccountKind;
  organization_id?: string | null;
  organization_type?: "client" | "service_provider" | null;
  is_super_admin: boolean;
  first_deposit_required: boolean;
  first_deposit_amount: number; // the MINIMUM for a first deposit
  min_topup: number;
  max_deposit: number;
  methods?: Method[];
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

type PaymentHistoryItem = {
  reference: string;
  label: string;
  amount: number;
  purpose: string;
  paid_at: string;
};

type Plan = {
  code: string;
  name: string;
  description?: string | null;
  unit_price: number; // per branch
  duration_months: number;
  branch_count: number;
  total: number; // unit_price x branch_count
  summary: string;
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

type PromoPreview = {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
};

type ChargeResponse = {
  reference: string;
  status: string; // "PENDING" | "SUCCESS" | "FAILED"
  method: Method;
  next_action?: NextAction | null;
  display_text?: string | null;
  url?: string | null;
  expires_at?: string | null;
  receipt?: string | null;
  reason?: string | null;
};

type DepositStatus = {
  status: string; // "PENDING" | "SUCCESS" | "FAILED"
  receipt?: string | null;
  reason?: string | null;
};

type PendingPayment = {
  reference: string;
  kind: PaymentKind;
  amount: number;
  method: Method;
  nextAction: NextAction | null;
  displayText: string | null;
  url: string | null;
};

type CardInput = { number: string; expiry: string; cvv: string };

// FastAPI: string for HTTPException, array for 422 validation errors.
type ApiErrorResponse = { detail?: string | { msg: string }[] };

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

const STEP_FOR_ACTION = {
  send_pin: "pin",
  send_otp: "otp",
  send_phone: "phone",
  send_birthday: "birthday",
} as const;

// Alert.alert with a message does nothing on web.
function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
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

function durationLabel(months: number) {
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "1 year" : `${years} years`;
  }
  return `${months} months`;
}

// Plans whose code contains "exclusive" (e.g. sp_exclusive_6m) get the Exclusive badge.
const isExclusive = (plan: Plan) => plan.code.toLowerCase().includes("exclusive");

function extractErrorMessage(detail: ApiErrorResponse["detail"], fallback: string) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item.msg.replace(/^Value error, /, "")).join("\n");
  }
  return fallback;
}

/* ---- card / phone input helpers ---- */

function luhnOk(digits: string) {
  let total = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    total += d;
  }
  return total % 10 === 0;
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function parseExpiry(expiry: string): { month: number; year: number } | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return null;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { month, year };
}

function expiryInPast(month: number, year: number) {
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
}

// "0712 345 678" / "712345678" / "+254712345678" -> "+254712345678", or null if invalid.
function normalisePhone(raw: string): string | null {
  let digits = raw.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  if (/^0[17]\d{8}$/.test(digits)) digits = `254${digits.slice(1)}`;
  else if (/^[17]\d{8}$/.test(digits)) digits = `254${digits}`;
  return /^254[17]\d{8}$/.test(digits) ? `+${digits}` : null;
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

// One page of rows: the wallet ledger for public users, successful payments for organisations.
async function fetchRows(
  token: string,
  kind: AccountKind,
  offset: number,
  limit: number
): Promise<Row[]> {
  if (kind === "public") {
    const txns = await apiRequest<WalletTransactionOut[]>(
      `${PAYMENTS_URL}/wallet/transactions?limit=${limit}&offset=${offset}`,
      token
    );
    return txns.map((item) => ({
      id: item.id,
      label: item.label,
      kind: item.kind,
      reference: item.kind === "credit" ? item.reference : null, // receipts are for money paid in
      date: formatDate(item.created_at),
      amount: formatCurrency(item.amount),
    }));
  }

  const items = await apiRequest<PaymentHistoryItem[]>(
    `${PAYMENTS_URL}/history?limit=${limit}&offset=${offset}`,
    token
  );
  return items.map((item) => ({
    id: item.reference,
    label: item.label,
    kind: "payment" as const,
    reference: item.reference,
    date: formatDate(item.paid_at),
    amount: formatCurrency(item.amount),
  }));
}

const EMPTY_CARD: CardInput = { number: "", expiry: "", cvv: "" };

export default function Wallet() {
  const router = useRouter();
  // Sent by the emergency screen when the wallet is short:
  //   needed   = exact shortfall in KSh, returnTo = "emergency"
  const params = useLocalSearchParams<{ needed?: string; returnTo?: string }>();
  const neededParam = Math.ceil(Number(params.needed) || 0);
  const returnToEmergency = params.returnTo === "emergency";

  // Unpaid cancellation fee / fare; taken from the next top-up automatically.
  const [amountOwed, setAmountOwed] = useState(0);

  /*
   * ACCOUNT / DATA STATE
   */

  const [profile, setProfile] = useState<PaymentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Public user
  const [balance, setBalance] = useState(0);

  // Organisation (client or service provider)
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);

  // Transactions (public) / payment history (organisation)
  const [rows, setRows] = useState<Row[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [downloadingRef, setDownloadingRef] = useState<string | null>(null);

  /*
   * PAYMENT STATE
   */

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("mpesa");
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);

  // Promo code (organisation subscriptions)
  const [showPromo, setShowPromo] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoPreview | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [challengeValue, setChallengeValue] = useState("");
  const [webUrl, setWebUrl] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false); // polling for the result
  const [isChecking, setIsChecking] = useState(false); // manual status check
  const [isStepBusy, setIsStepBusy] = useState(false); // submitting PIN / OTP
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mounted = useRef(true);
  const pollId = useRef(0); // lets a new payment cancel an older poll
  const scrollRef = useRef<ScrollView>(null);
  const historyY = useRef(0);

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

  // The lowest amount the user may deposit right now. A first deposit has its own
  // minimum; any amount at or above the minimum (up to the maximum) is allowed.
  const minDeposit = profile
    ? firstDeposit
      ? profile.first_deposit_amount
      : profile.min_topup
    : 0;

  // Organisations pay by bank card only; public users choose.
  const activeMethod: Method = isOrganisation ? "card" : method;

  // Prefill the top-up with only what is missing (never below the minimum).
  const prefilled = useRef(false);
  useEffect(() => {
    if (!profile || !isPublic || prefilled.current || !neededParam) return;
    prefilled.current = true;
    const value = profile.first_deposit_required
      ? Math.max(neededParam, profile.first_deposit_amount)
      : Math.max(neededParam, profile.min_topup);
    setAmount(String(value));
  }, [profile, isPublic, neededParam]);

  useEffect(() => {
    if (!isPublic) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const debt = await apiRequest<{ amount_owed: number }>(
          `${PAYMENTS_URL}/wallet/debt`,
          token
        );
        if (!cancelled && mounted.current) setAmountOwed(Number(debt.amount_owed) || 0);
      } catch {
        /* the banner is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPublic, rows]);

  const parsedAmount = useMemo(() => {
    const cleaned = amount.replace(/,/g, "").trim();
    if (!cleaned) return 0;
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : 0;
  }, [amount]);

  const amountError = useMemo(() => {
    if (!parsedAmount || !profile) return null;

    if (parsedAmount < minDeposit) {
      return firstDeposit
        ? `Your first minimum deposit is KSh ${minDeposit.toLocaleString("en-KE")}.`
        : `Minimum deposit is KSh ${minDeposit.toLocaleString("en-KE")}.`;
    }
    if (parsedAmount > profile.max_deposit) {
      return `Maximum deposit is KSh ${profile.max_deposit.toLocaleString("en-KE")}.`;
    }
    return null;
  }, [parsedAmount, firstDeposit, minDeposit, profile]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === selectedPlanCode) || null,
    [plans, selectedPlanCode]
  );

  // What the customer will actually be charged (the server recomputes this).
  const payableTotal = selectedPlan ? (promo ? promo.final_amount : selectedPlan.total) : 0;

  /* ---- card validation ---- */

  const cardDigits = card.number.replace(/\D/g, "");
  const cardNumberError =
    cardDigits.length >= 13 && (cardDigits.length < 13 || !luhnOk(cardDigits))
      ? "That card number doesn't look right."
      : null;

  const parsedExpiry = parseExpiry(card.expiry);
  const expiryError =
    card.expiry.length === 5 && (!parsedExpiry || expiryInPast(parsedExpiry.month, parsedExpiry.year))
      ? "Check the expiry date."
      : null;

  const cardValid =
    cardDigits.length >= 13 &&
    luhnOk(cardDigits) &&
    !!parsedExpiry &&
    !expiryInPast(parsedExpiry.month, parsedExpiry.year) &&
    /^\d{3,4}$/.test(card.cvv);

  const normalisedPhone = normalisePhone(phone);
  const phoneError =
    phone.replace(/\D/g, "").length >= 10 && !normalisedPhone
      ? "Enter a valid M-Pesa number, e.g. 0712 345 678."
      : null;

  const methodReady = activeMethod === "mpesa" ? !!normalisedPhone : cardValid;

  const busy = isProcessing || isConfirming || isStepBusy;

  const canSubmitDeposit =
    isPublic &&
    parsedAmount >= 1 &&
    Number.isInteger(parsedAmount) &&
    !amountError &&
    methodReady &&
    !busy &&
    !pending;

  const canSubmitSubscription =
    canPaySubscription && !!selectedPlan && cardValid && !busy && !pending;

  const visibleRows = showAll ? rows : rows.slice(0, COLLAPSED_ROWS);
  const canExpand = rows.length > COLLAPSED_ROWS || hasMore;

  // Quick amounts below the minimum are hidden.
  const quickAmounts = QUICK_AMOUNTS.filter((value) => value >= minDeposit);

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

      const firstRows = await fetchRows(token, profileData.account_kind, 0, FIRST_PAGE);

      if (profileData.account_kind === "public") {
        const wallet = await apiRequest<WalletOut>(`${PAYMENTS_URL}/wallet`, token);
        if (!mounted.current) return;
        setBalance(wallet.balance);
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

      setRows(firstRows);
      setHasMore(firstRows.length === FIRST_PAGE);
      setProfile(profileData);
      setProfileLoaded(true);
      setLoadError(null);

      // Start the field at the first-deposit minimum; the user can raise it.
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
   * TRANSACTIONS: VIEW ALL / LOAD MORE
   */

  const loadMore = async () => {
    if (!profile || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const next = await fetchRows(token, profile.account_kind, rows.length, PAGE_SIZE);
      if (!mounted.current) return;
      setRows((current) => [...current, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (error) {
      notify(
        "Couldn't load more",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      if (mounted.current) setIsLoadingMore(false);
    }
  };

  const handleToggleViewAll = () => {
    if (showAll) {
      setShowAll(false);
      return;
    }
    setShowAll(true);
    if (hasMore && rows.length <= FIRST_PAGE) void loadMore();
  };

  // The "Receipts" button in the header card jumps to the list.
  const handleOpenReceipts = () => {
    setShowAll(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(historyY.current - 12, 0), animated: true });
    }, 50);
  };

  /*
   * RECEIPT DOWNLOAD
   */

  const handleDownloadReceipt = async (reference: string) => {
    if (downloadingRef) return;
    setDownloadingRef(reference);

    try {
      const token = await getAccessToken();
      if (!token) {
        notify("Session expired", "Please sign in again to download your receipt.");
        return;
      }

      const url = `${PAYMENTS_URL}/receipts/${encodeURIComponent(reference)}`;

      if (Platform.OS === "web") {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error("Receipt not available.");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `SafeSync-receipt-${reference}.pdf`;
        link.click();
        URL.revokeObjectURL(objectUrl);
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}SafeSync-receipt-${reference}.pdf`;
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status !== 200) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        throw new Error(
          result.status === 404 ? "Receipt not available." : "Could not download the receipt."
        );
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          dialogTitle: "SafeSync receipt",
          UTI: "com.adobe.pdf",
        });
      } else {
        notify("Receipt saved", `Saved to ${result.uri}`);
      }
    } catch (error) {
      console.error("Receipt download error:", error);
      notify(
        "Receipt unavailable",
        error instanceof Error ? error.message : "Could not download the receipt."
      );
    } finally {
      if (mounted.current) setDownloadingRef(null);
    }
  };

  /*
   * PAYMENT STATUS
   */

  const fetchStatus = async (reference: string): Promise<DepositStatus | null> => {
    try {
      const token = await getAccessToken(); // fresh each time: polls can run for minutes
      if (!token) return null;
      return await apiRequest<DepositStatus>(
        `${PAYMENTS_URL}/deposit/${encodeURIComponent(reference)}`,
        token
      );
    } catch {
      return null; // transient error: keep waiting
    }
  };

  // Returns true when the payment has reached a final state.
  const applyStatus = (result: DepositStatus, kind: PaymentKind): boolean => {
    const status = String(result.status || "").toUpperCase();

    if (status === "SUCCESS") {
      const receiptText = result.receipt ? ` (receipt ${result.receipt})` : "";
      setPending(null);
      setWebUrl(null);
      if (kind === "subscription") {
        setPromo(null);
        setPromoInput("");
        setPromoError(null);
        setShowPromo(false);
      }
      notify(
        "Payment confirmed",
        kind === "subscription"
          ? `Your payment was confirmed${receiptText} and your subscription is now active. You can download the receipt below.`
          : `Your payment was confirmed${receiptText} and your wallet has been credited. You can download the receipt below.`
      );
      loadData();
      if (kind === "deposit" && returnToEmergency && router.canGoBack()) {
        router.back(); // straight back to the emergency request
      }
      return true;
    }

    if (status === "FAILED") {
      setPending(null);
      setWebUrl(null);
      notify("Payment not completed", result.reason || "The payment was not completed.");
      return true;
    }

    return false; // PENDING
  };

  const pollPaymentStatus = async (reference: string, kind: PaymentKind) => {
    const myId = ++pollId.current;
    setIsConfirming(true);

    try {
      for (let attempt = 0; attempt < POLLING.maxAttempts; attempt += 1) {
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, POLLING.intervalMs));

        if (!mounted.current || pollId.current !== myId) return;

        const result = await fetchStatus(reference);
        if (result && applyStatus(result, kind)) return;
      }

      if (mounted.current && pollId.current === myId) {
        notify(
          "Still waiting for confirmation",
          "We haven't received the confirmation yet. If you completed the payment, it will appear shortly: pull down to refresh, or tap “Check payment status”."
        );
      }
    } finally {
      if (mounted.current && pollId.current === myId) setIsConfirming(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!pending || isChecking) return;

    setIsChecking(true);
    try {
      const result = await fetchStatus(pending.reference);

      if (!result) {
        notify("Couldn't check", "Please check your connection and try again.");
      } else if (!applyStatus(result, pending.kind)) {
        notify("Not confirmed yet", "The payment hasn't been confirmed yet.");
      }
    } finally {
      if (mounted.current) setIsChecking(false);
    }
  };

  // Stops waiting. The server expires the payment on its own.
  const handleCancelPending = () => {
    pollId.current += 1;
    setIsConfirming(false);
    setPending(null);
    setWebUrl(null);
    setChallengeValue("");
  };

  /*
   * CHARGE RESPONSES (shared by deposits, subscriptions and card challenges)
   */

  const handleCharge = (resp: ChargeResponse, kind: PaymentKind, chargedAmount: number) => {
    const status = String(resp.status || "").toUpperCase();

    if (status !== "PENDING") {
      applyStatus({ status, receipt: resp.receipt, reason: resp.reason }, kind);
      return;
    }

    const next = resp.next_action ?? null;

    setPending({
      reference: resp.reference,
      kind,
      amount: chargedAmount,
      method: resp.method,
      nextAction: next,
      displayText: resp.display_text ?? null,
      url: resp.url ?? null,
    });
    setChallengeValue("");

    // Bank 3-D Secure page: shown inside the app.
    if (next === "open_url" && resp.url) {
      if (Platform.OS === "web") window.open(resp.url, "_blank");
      else setWebUrl(resp.url);
    }

    // Nothing for the customer to type: wait for the result.
    if (next === null || next === "pay_offline" || next === "open_url") {
      void pollPaymentStatus(resp.reference, kind);
    }
  };

  const handleSubmitStep = async () => {
    if (!pending || isStepBusy || !pending.nextAction) return;

    const step = STEP_FOR_ACTION[pending.nextAction as keyof typeof STEP_FOR_ACTION];
    const value = challengeValue.trim();

    if (!step) return;
    if (!value) {
      notify("Missing details", "Please fill in the field to continue.");
      return;
    }

    setIsStepBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        notify("Session expired", "Please sign in again to continue.");
        return;
      }

      const resp = await apiRequest<ChargeResponse>(
        `${PAYMENTS_URL}/charge/${encodeURIComponent(pending.reference)}/step`,
        token,
        { method: "POST", body: { step, value } }
      );

      setChallengeValue("");
      handleCharge(resp, pending.kind, pending.amount);
    } catch (error) {
      notify(
        "Couldn't continue",
        error instanceof Error ? error.message : "Please check the details and try again."
      );
    } finally {
      if (mounted.current) setIsStepBusy(false);
    }
  };

  /*
   * SUBMIT A PAYMENT (shared by deposits and subscriptions)
   *
   * Card details go to SafeSync's server over HTTPS, are forwarded to Paystack
   * and are never stored. M-Pesa sends a prompt to the customer's phone.
   */

  const cardBody = () => {
    const expiry = parseExpiry(card.expiry);
    return {
      number: cardDigits,
      cvv: card.cvv,
      expiry_month: expiry?.month ?? 0,
      expiry_year: expiry?.year ?? 0,
    };
  };

  const submitPayment = async (
    path: string,
    body: Record<string, unknown>,
    kind: PaymentKind,
    chargedAmount: number
  ): Promise<boolean> => {
    if (isProcessing) return false;

    setIsProcessing(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        notify("Session expired", "Please sign in again before making a payment.");
        return false;
      }

      const resp = await apiRequest<ChargeResponse>(`${PAYMENTS_URL}${path}`, token, {
        method: "POST",
        body,
      });

      handleCharge(resp, kind, chargedAmount);
      return true;
    } catch (error) {
      console.error("SafeSync payment error:", error instanceof Error ? error.message : error);

      notify(
        "Payment failed",
        error instanceof Error ? error.message : "Could not connect to the payment service."
      );

      return false;
    } finally {
      setCard(EMPTY_CARD); // never keep card details around after sending them
      if (mounted.current) setIsProcessing(false);
    }
  };

  const handleDeposit = async () => {
    if (amountError || parsedAmount < 1 || !Number.isInteger(parsedAmount)) {
      notify("Invalid amount", amountError || "Enter a whole amount of at least KSh 1.");
      return;
    }

    const body: Record<string, unknown> =
      activeMethod === "mpesa"
        ? { amount: parsedAmount, method: "mpesa", phone: normalisedPhone }
        : { amount: parsedAmount, method: "card", card: cardBody() };

    const started = await submitPayment("/deposit", body, "deposit", parsedAmount);

    if (started) setAmount("");
  };

  /*
   * PROMO CODE (organisation subscriptions)
   */

  const validatePromo = async (code: string, planCode: string, silent = false) => {
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) {
      setPromoError("Enter a promo code.");
      return;
    }
    if (isApplyingPromo && !silent) return;

    setIsApplyingPromo(true);
    setPromoError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setPromoError("Please sign in again.");
        return;
      }

      const preview = await apiRequest<PromoPreview>(`${PAYMENTS_URL}/promo/validate`, token, {
        method: "POST",
        body: { code: cleaned, plan_code: planCode },
      });

      if (!mounted.current) return;
      setPromo(preview);
      setPromoInput(preview.code);
    } catch (error) {
      if (!mounted.current) return;
      setPromo(null);
      setPromoError(error instanceof Error ? error.message : "Could not check that promo code.");
    } finally {
      if (mounted.current) setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setPromo(null);
    setPromoInput("");
    setPromoError(null);
    setShowPromo(false);
  };

  // A different plan has a different total (and the code may not apply): re-check it.
  useEffect(() => {
    if (promo && selectedPlanCode) void validatePromo(promo.code, selectedPlanCode, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanCode]);

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      notify("Choose a plan", "Select a subscription plan to continue.");
      return;
    }

    await submitPayment(
      "/subscribe",
      {
        plan_code: selectedPlan.code,
        card: cardBody(),
        ...(promo ? { promo_code: promo.code } : {}),
      },
      "subscription",
      payableTotal
    );
  };

  /*
   * SHARED UI PIECES
   */

  const securityNote = (
    <View style={styles.securityNote}>
      <Ionicons name="shield-checkmark-outline" size={15} color="#64748B" />

      <Text style={styles.securityText}>
        {activeMethod === "mpesa"
          ? "Enter your M-Pesa PIN on your phone to authorize payment."
          : "Your card details are securely processed. SafeSync never stores your card number, CVV or PIN."}
      </Text>
    </View>
  );

  const methodPicker =
    isPublic && (profile?.methods?.length ?? 2) > 1 ? (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Pay with</Text>

        <View style={styles.methodRow}>
          {(
            [
              { key: "mpesa", label: "M-Pesa", icon: "phone-portrait-outline" },
              { key: "card", label: "Bank card", icon: "card-outline" },
            ] as const
          ).map((option) => {
            const active = method === option.key;

            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.8}
                disabled={busy || !!pending}
                style={[styles.methodTile, active && styles.methodTileActive]}
                onPress={() => setMethod(option.key)}
              >
                <Ionicons name={option.icon} size={18} color={active ? "#DC2626" : "#64748B"} />
                <Text style={[styles.methodText, active && styles.methodTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    ) : null;

  const mpesaForm = (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>M-Pesa phone number</Text>
      <View style={styles.inputWrapper}>
        <View style={styles.currencyPrefix}>
          <Ionicons name="phone-portrait-outline" size={17} color="#64748B" />
        </View>

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(value) => setPhone(value.replace(/[^0-9+\s]/g, "").slice(0, 16))}
          placeholder="+254"
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          editable={!busy && !pending}
        />
      </View>

      {!!phoneError && <Text style={styles.inputError}>{phoneError}</Text>}
    </View>
  );

  const cardForm = (
    <View style={{ gap: 12 }}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Card number</Text>

        <View style={styles.inputWrapper}>
          <View style={styles.currencyPrefix}>
            <Ionicons name="card-outline" size={18} color="#64748B" />
          </View>

          <TextInput
            style={styles.input}
            value={card.number}
            onChangeText={(value) => setCard((c) => ({ ...c, number: formatCardNumber(value) }))}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={23}
            autoComplete="cc-number"
            textContentType="creditCardNumber"
            editable={!busy && !pending}
          />
        </View>

        {!!cardNumberError && <Text style={styles.inputError}>{cardNumberError}</Text>}
      </View>

      <View style={styles.cardRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Expiry</Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { paddingHorizontal: 13 }]}
              value={card.expiry}
              onChangeText={(value) => setCard((c) => ({ ...c, expiry: formatExpiry(value) }))}
              placeholder="MM/YY"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={5}
              autoComplete="cc-exp"
              editable={!busy && !pending}
            />
          </View>

          {!!expiryError && <Text style={styles.inputError}>{expiryError}</Text>}
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>CVV</Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { paddingHorizontal: 13 }]}
              value={card.cvv}
              onChangeText={(value) =>
                setCard((c) => ({ ...c, cvv: value.replace(/\D/g, "").slice(0, 4) }))
              }
              placeholder="123"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              autoComplete="cc-csc"
              editable={!busy && !pending}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const promoBusy = busy || !!pending || isApplyingPromo;

  const promoSection = promo ? (
    <View style={styles.promoApplied}>
      <Ionicons name="pricetag" size={16} color="#059669" />

      <View style={{ flex: 1 }}>
        <Text style={styles.promoAppliedTitle}>{promo.code} applied</Text>
        <Text style={styles.promoAppliedText}>
          You save {formatWholeCurrency(promo.discount_amount)}
          {promo.discount_type === "percent" ? ` (${promo.discount_value}% off)` : ""}.
        </Text>
      </View>

      <TouchableOpacity activeOpacity={0.7} disabled={busy || !!pending} onPress={handleRemovePromo}>
        <Text style={styles.promoRemove}>Remove</Text>
      </TouchableOpacity>
    </View>
  ) : showPromo || !!promoError ? (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Promo code</Text>

      <View style={styles.promoRow}>
        <View style={[styles.inputWrapper, { flex: 1 }]}>
          <TextInput
            style={[styles.input, { paddingHorizontal: 13 }]}
            value={promoInput}
            onChangeText={(value) => {
              setPromoInput(value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40));
              setPromoError(null);
            }}
            placeholder="Enter code"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!promoBusy}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!promoInput.trim() || !selectedPlan || promoBusy}
          style={[
            styles.promoButton,
            (!promoInput.trim() || !selectedPlan || promoBusy) && styles.payButtonDisabled,
          ]}
          onPress={() => selectedPlan && validatePromo(promoInput, selectedPlan.code)}
        >
          {isApplyingPromo ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.promoButtonText}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>

      {!!promoError && <Text style={styles.inputError}>{promoError}</Text>}
    </View>
  ) : (
    <TouchableOpacity activeOpacity={0.7} style={styles.promoLink} onPress={() => setShowPromo(true)}>
      <Ionicons name="pricetag-outline" size={15} color="#DC2626" />
      <Text style={styles.promoLinkText}>Have a promo code?</Text>
    </TouchableOpacity>
  );

  const paymentFields = activeMethod === "mpesa" ? mpesaForm : cardForm;

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
              ? "Processing..."
              : isStepBusy
              ? "Verifying..."
              : "Waiting for confirmation..."}
          </Text>
        </>
      ) : (
        <>
          <Ionicons
            name={activeMethod === "mpesa" ? "phone-portrait-outline" : "card-outline"}
            size={19}
            color="#FFFFFF"
          />
          <Text style={styles.payButtonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  // What the customer still has to do for the payment in progress.
  const challengeConfig = (() => {
    switch (pending?.nextAction) {
      case "send_pin":
        return { label: "Card PIN", placeholder: "Enter your card PIN", secure: true, keyboard: "number-pad" as const, hint: "Enter the PIN for this card." };
      case "send_otp":
        return { label: "One-time code (OTP)", placeholder: "Enter the OTP", secure: false, keyboard: "number-pad" as const, hint: "Enter the code your bank sent you." };
      case "send_phone":
        return { label: "Phone number", placeholder: "Phone number linked to the card", secure: false, keyboard: "phone-pad" as const, hint: "Enter the phone number linked to this card." };
      case "send_birthday":
        return { label: "Date of birth", placeholder: "YYYY-MM-DD", secure: false, keyboard: "numbers-and-punctuation" as const, hint: "Enter the card owner's date of birth." };
      default:
        return null;
    }
  })();

  const pendingCard = pending ? (
    <View style={styles.checkoutCard}>
      <Text style={styles.checkoutTitle}>
        {pending.method === "mpesa" ? "Check your phone" : "Confirm your card payment"}
      </Text>

      <Text style={styles.checkoutText}>
        {formatWholeCurrency(pending.amount)}
        {pending.displayText
          ? ` — ${pending.displayText}`
          : pending.method === "mpesa"
          ? " — enter your M-Pesa PIN on the prompt we just sent you."
          : " — we're waiting for your bank to confirm."}
      </Text>

      {challengeConfig && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{challengeConfig.label}</Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { paddingHorizontal: 13 }]}
              value={challengeValue}
              onChangeText={setChallengeValue}
              placeholder={challengeConfig.placeholder}
              placeholderTextColor="#94A3B8"
              secureTextEntry={challengeConfig.secure}
              keyboardType={challengeConfig.keyboard}
              editable={!isStepBusy}
            />
          </View>

          <Text style={styles.hintText}>{challengeConfig.hint}</Text>
        </View>
      )}

      {pending.nextAction === "open_url" && pending.url && Platform.OS !== "web" && !webUrl && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.checkButton}
          onPress={() => setWebUrl(pending.url)}
        >
          <Text style={styles.checkButtonText}>Reopen bank verification</Text>
        </TouchableOpacity>
      )}

      {isConfirming && (
        <View style={styles.waitingRow}>
          <ActivityIndicator size="small" color="#DC2626" />
          <Text style={styles.waitingText}>Waiting for the payment to be confirmed…</Text>
        </View>
      )}

      {challengeConfig ? (
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isStepBusy || !challengeValue.trim()}
          style={[
            styles.payButton,
            (isStepBusy || !challengeValue.trim()) && styles.payButtonDisabled,
          ]}
          onPress={handleSubmitStep}
        >
          {isStepBusy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={isChecking}
          style={[styles.checkButton, isChecking && styles.payButtonDisabled]}
          onPress={handleCheckStatus}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <Text style={styles.checkButtonText}>Check payment status</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity activeOpacity={0.7} onPress={handleCancelPending} style={styles.cancelLink}>
        <Text style={styles.cancelLinkText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const receiptsPanel = (
    <View
      style={styles.panel}
      onLayout={(event) => {
        historyY.current = event.nativeEvent.layout.y;
      }}
    >
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.panelTitle}>
            {isOrganisation ? "Payment history" : "Recent transactions"}
          </Text>
          <Text style={styles.panelSubtitle}>
            {isOrganisation
              ? "Your subscription payments. Tap the download icon for a receipt."
              : "Your latest wallet activity. Tap the download icon for a receipt."}
          </Text>
        </View>

        {canExpand && (
          <TouchableOpacity activeOpacity={0.7} onPress={handleToggleViewAll}>
            <Text style={styles.viewAllText}>{showAll ? "Show less" : "View all"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {rows.length === 0 ? (
        <View style={styles.emptyTransactions}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={26} color="#94A3B8" />
          </View>

          <Text style={styles.emptyTitle}>
            {isOrganisation ? "No payments yet" : "No transactions yet"}
          </Text>

          <Text style={styles.emptyText}>
            {isOrganisation
              ? "Your subscription payments and receipts will appear here."
              : "Your wallet deposits and emergency charges will appear here."}
          </Text>
        </View>
      ) : (
        <View style={styles.transactionList}>
          {visibleRows.map((row) => {
            const isCredit = row.kind === "credit";
            const isPayment = row.kind === "payment";
            const downloading = downloadingRef === row.reference;

            return (
              <View key={row.id} style={styles.transactionRow}>
                <View
                  style={[
                    styles.transactionIcon,
                    isCredit ? styles.creditIcon : isPayment ? styles.paymentIcon : styles.debitIcon,
                  ]}
                >
                  <Ionicons
                    name={isPayment ? "card-outline" : isCredit ? "arrow-down" : "arrow-up"}
                    size={17}
                    color={isPayment ? "#7C3AED" : isCredit ? "#059669" : "#DC2626"}
                  />
                </View>

                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionLabel} numberOfLines={1}>
                    {row.label}
                  </Text>

                  <Text style={styles.transactionDate} numberOfLines={1}>
                    {row.date}
                    {row.reference ? ` · ${row.reference}` : ""}
                  </Text>
                </View>

                <View style={styles.transactionAmountContainer}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      isCredit && styles.creditAmount,
                      isPayment && styles.paymentAmount,
                    ]}
                  >
                    {isCredit ? "+" : isPayment ? "" : "-"}
                    {row.amount}
                  </Text>
                </View>

                {row.reference ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={!!downloadingRef}
                    onPress={() => handleDownloadReceipt(row.reference as string)}
                    style={styles.downloadButton}
                    accessibilityLabel={`Download receipt ${row.reference}`}
                  >
                    {downloading ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Ionicons name="download-outline" size={18} color="#DC2626" />
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.downloadButton} />
                )}
              </View>
            );
          })}

          {showAll && hasMore && (
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isLoadingMore}
              style={styles.loadMoreButton}
              onPress={loadMore}
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.checkButtonText}>Load more</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

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
          ref={scrollRef}
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
              <Text style={styles.pageTitle}>{isOrganisation ? "Subscription" : "Wallet"}</Text>

              <Text style={styles.pageSubtitle}>
                {isOrganisation
                  ? isClientOrg
                    ? "Keep your organisation subscribed so all your branches stay connected to SafeSync."
                    : "Keep your organisation subscribed so your responders stay active."
                  : "Keep funds available to ensure emergency dispatch is never delayed by payment."}
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
              PUBLIC USER: WALLET (M-Pesa or bank card)
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
                    onPress={handleOpenReceipts}
                  >
                    <Ionicons name="receipt-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.receiptButtonText}>Receipts</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isPublic && neededParam > 0 && (
                <View style={styles.neededBanner}>
                  <Ionicons name="alert-circle-outline" size={20} color="#B45309" />
                  <Text style={styles.neededBannerText}>
                    Your wallet is short by KSh {neededParam.toLocaleString("en-KE")}. Top up
                    {profile?.first_deposit_required
                      ? ` at least KSh ${Math.max(
                          neededParam,
                          profile.first_deposit_amount
                        ).toLocaleString("en-KE")}`
                      : " the amount below"}{" "}
                    to request help.
                  </Text>
                </View>
              )}

              {isPublic && amountOwed > 0 && (
                <View style={styles.debtBanner}>
                  <Ionicons name="information-circle-outline" size={20} color="#B91C1C" />
                  <Text style={styles.debtBannerText}>
                    You owe KSh {amountOwed.toLocaleString("en-KE")} from a cancellation fee or
                    unpaid fare. It will be deducted automatically from your next top-up.
                  </Text>
                </View>
              )}

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
                        ? `Your first minimum deposit is KSh ${profile.first_deposit_amount.toLocaleString(
                            "en-KE"
                          )}. You can deposit more if you like.`
                        : "Top up your wallet with M-Pesa or your bank card."}
                    </Text>
                  </View>
                </View>

                <View style={styles.formContainer}>
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
                        placeholder={
                          minDeposit ? `Minimum ${minDeposit.toLocaleString("en-KE")}` : "Enter amount"
                        }
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        editable={!busy && !pending}
                      />
                    </View>

                    {!!amountError && <Text style={styles.inputError}>{amountError}</Text>}
                  </View>

                  {quickAmounts.length > 0 && (
                    <View>
                      <Text style={styles.quickAmountLabel}>QUICK AMOUNTS</Text>

                      <View style={styles.quickAmountGrid}>
                        {quickAmounts.map((value) => {
                          const selected = parsedAmount === value;

                          return (
                            <TouchableOpacity
                              key={value}
                              activeOpacity={0.8}
                              disabled={busy || !!pending}
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

                  {methodPicker}
                  {paymentFields}

                  <View style={styles.paymentSummary}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Deposit</Text>
                      <Text style={styles.summaryValue}>{formatCurrency(parsedAmount)}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Payment method</Text>
                      <Text style={styles.summaryMethodText}>
                        {activeMethod === "mpesa" ? "M-Pesa" : "Bank card"}
                      </Text>
                    </View>
                  </View>

                  {renderPayButton(
                    activeMethod === "mpesa" ? "Send M-Pesa prompt" : "Pay with card",
                    handleDeposit,
                    canSubmitDeposit
                  )}

                  {pendingCard}
                  {securityNote}
                </View>
              </View>

              {/* TRANSACTION HISTORY + RECEIPTS */}

              {receiptsPanel}

              <View style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons name="information-circle-outline" size={20} color="#DC2626" />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>How wallet deposits work</Text>

                  <Text style={styles.infoText}>
                    Pay with an M-Pesa prompt or your bank card. Your wallet is credited only after
                    the payment has been confirmed.
                  </Text>
                </View>
              </View>
            </>
          )}

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
                    onPress={handleOpenReceipts}
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
                      const exclusive = isExclusive(plan);

                      return (
                        <TouchableOpacity
                          key={plan.code}
                          activeOpacity={0.8}
                          disabled={busy || !!pending}
                          style={[
                            styles.tierCard,
                            exclusive && styles.tierCardExclusive,
                            active && styles.tierCardActive,
                          ]}
                          onPress={() => setSelectedPlanCode(plan.code)}
                        >
                          <View style={styles.tierTopRow}>
                            <View style={[styles.radio, active && styles.radioActive]}>
                              {active && <View style={styles.radioInner} />}
                            </View>

                            {exclusive && (
                              <View style={styles.exclusiveBadge}>
                                <Text style={styles.exclusiveBadgeText}>EXCLUSIVE</Text>
                              </View>
                            )}
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
                    {promoSection}
                    {cardForm}

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
                        <Text style={styles.summaryLabel}>Payment method</Text>
                        <Text style={styles.summaryMethodText}>Bank card</Text>
                      </View>

                      {promo && selectedPlan && (
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Promo ({promo.code})</Text>
                          <Text style={[styles.summaryValue, { color: "#059669" }]}>
                            -{formatWholeCurrency(promo.discount_amount)}
                          </Text>
                        </View>
                      )}

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Amount to pay</Text>
                        <Text style={styles.summaryValue}>
                          {selectedPlan ? formatWholeCurrency(payableTotal) : "—"}
                        </Text>
                      </View>
                    </View>

                    {renderPayButton("Pay with card", handleSubscribe, canSubmitSubscription)}

                    {pendingCard}
                    {securityNote}
                  </View>
                </View>
              )}

              {/* PAYMENT HISTORY + RECEIPTS */}

              {receiptsPanel}

              <View style={styles.infoCard}>
                <View style={styles.infoIcon}>
                  <Ionicons name="information-circle-outline" size={20} color="#DC2626" />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>How subscription payments work</Text>

                  <Text style={styles.infoText}>
                    Your super admin picks a plan and pays with a bank card. The price is per
                    branch, so the total depends on how many branches you have. Your subscription
                    is activated only after the payment is confirmed.
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={{ height: BOTTOM_CLEARANCE }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bank 3-D Secure page, shown inside the app */}
      {Platform.OS !== "web" && (
        <Modal
          visible={!!webUrl}
          animationType="slide"
          onRequestClose={() => setWebUrl(null)}
        >
          <View style={styles.webRoot}>
            <View style={styles.webHeader}>
              <Text style={styles.webTitle}>Verify your card</Text>

              <TouchableOpacity activeOpacity={0.7} onPress={() => setWebUrl(null)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {webUrl && (
              <WebView
                source={{ uri: webUrl }}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.webLoading}>
                    <ActivityIndicator size="small" color="#DC2626" />
                  </View>
                )}
              />
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  neededBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  neededBannerText: { flex: 1, color: "#92400E", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  debtBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  debtBannerText: { flex: 1, color: "#991B1B", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  keyboardContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 30 },

  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 },
  headerTextContainer: { flex: 1, paddingRight: 16 },
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
  currencyPrefix: { width: 52, alignItems: "center", justifyContent: "center" },
  currencyPrefixText: { fontSize: 12, fontWeight: "900", color: "#64748B" },
  input: { flex: 1, height: "100%", paddingHorizontal: 4, paddingRight: 13, fontSize: 14, color: "#0F172A", fontWeight: "600" },
  inputError: { color: "#DC2626", fontSize: 10, fontWeight: "600" },
  hintText: { color: "#64748B", fontSize: 10, lineHeight: 15 },

  methodRow: { flexDirection: "row", gap: 10 },
  methodTile: {
    flex: 1, height: 48, borderRadius: 13, borderWidth: 1.5, borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  methodTileActive: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  methodText: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  methodTextActive: { color: "#DC2626" },
  cardRow: { flexDirection: "row", gap: 12 },

  promoLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 2 },
  promoLinkText: { color: "#DC2626", fontSize: 12, fontWeight: "800" },
  promoRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  promoButton: { height: 50, paddingHorizontal: 18, borderRadius: 13, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  promoButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  promoApplied: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 13,
    backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0",
  },
  promoAppliedTitle: { fontSize: 12, fontWeight: "900", color: "#065F46" },
  promoAppliedText: { fontSize: 11, color: "#047857", marginTop: 2 },
  promoRemove: { color: "#64748B", fontSize: 11, fontWeight: "800" },

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

  checkoutCard: { borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", padding: 14, gap: 10 },
  checkoutTitle: { fontSize: 13, fontWeight: "900", color: "#0F172A" },
  checkoutText: { fontSize: 11, lineHeight: 16, color: "#64748B" },
  waitingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  waitingText: { flex: 1, fontSize: 11, color: "#475569", fontWeight: "600" },
  checkButton: {
    height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: "#DC2626",
    alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF",
  },
  checkButtonText: { color: "#DC2626", fontSize: 13, fontWeight: "800" },
  cancelLink: { alignItems: "center", paddingVertical: 4 },
  cancelLinkText: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  loadMoreButton: {
    height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: "#DC2626", marginTop: 14,
    alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF",
  },

  tierContainer: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 15 },
  tierCard: { flexBasis: "47%", flexGrow: 1, minHeight: 126, padding: 13, borderRadius: 15, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  tierCardExclusive: { borderColor: "#F59E0B", backgroundColor: "#FFFBEB" },
  tierCardActive: { borderColor: "#7C3AED", backgroundColor: "#F5F3FF" },
  tierTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  exclusiveBadge: { backgroundColor: "#F59E0B", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  exclusiveBadgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
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
  paymentIcon: { backgroundColor: "#F5F3FF" },
  transactionDetails: { flex: 1, minWidth: 0 },
  transactionLabel: { fontSize: 12, fontWeight: "800", color: "#0F172A" },
  transactionDate: { fontSize: 9, color: "#94A3B8", marginTop: 3 },
  transactionAmountContainer: { alignItems: "flex-end", marginLeft: 8 },
  transactionAmount: { fontSize: 12, fontWeight: "900", color: "#DC2626" },
  creditAmount: { color: "#059669" },
  paymentAmount: { color: "#0F172A" },
  downloadButton: { width: 34, height: 34, marginLeft: 4, alignItems: "center", justifyContent: "center" },

  infoCard: {
    flexDirection: "row", backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 16, padding: 13, marginBottom: 15,
  },
  infoIcon: { marginRight: 10, marginTop: 1 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 11, fontWeight: "900", color: "#7F1D1D" },
  infoText: { fontSize: 10, lineHeight: 16, color: "#475569", marginTop: 4 },

  webRoot: { flex: 1, backgroundColor: "#FFFFFF" },
  webHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingTop: Platform.OS === "ios" ? 56 : 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  webTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  webLoading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
});