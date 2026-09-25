import { supabase } from "@/lib/supabase"; // ADAPT: your Supabase client (or replace authHeaders)

// Physical device? Use your PC's LAN IP or an ngrok URL, not localhost.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.10:8000";

export type Created = { reference: string; status: string };
export type DepositStatus = {
  status: "PENDING" | "SUCCESS" | "FAILED";
  receipt: string | null;
  reason: string | null;
};

export type PaymentProfile = {
  account_kind: "public" | "client" | "service_provider";
  organization_id: string | null;
  first_deposit_required: boolean;
  first_deposit_amount: number;
  min_topup: number;
};

export type WalletSummary = { balance: number; reserved: number; currency: string };
export type LedgerEntry = {
  id: string;
  kind: "credit" | "debit";
  label: string;
  amount: number;
  balance_after: number;
  reference: string | null;
  created_at: string;
};

export type Plan = {
  code: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
};

export type SubscriptionStatus = {
  state: "none" | "active" | "grace" | "expired";
  plan_code: string | null;
  plan_name: string | null;
  started_at: string | null;
  ends_at: string | null;
  grace_ends_at: string | null;
  days_left: number | null;
  open_invoice: {
    invoice_id: string;
    plan_code: string;
    amount: number;
    due_at: string | null;
  } | null;
};

export type Checkout = {
  invoice_id: string;
  invoice_number: string;
  plan_code: string;
  amount: number;
  reused: boolean;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...((init.headers as Record<string, string>) ?? {}) },
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail) ? detail[0]?.msg : detail;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return data as T;
}

// ---- payments
export const getPaymentProfile = () => request<PaymentProfile>("/api/payments/profile");

export const createDeposit = (phone_number: string, amount: number) =>
  request<Created>("/api/payments/deposit", {
    method: "POST",
    body: JSON.stringify({ phone_number, amount }),
  });

export const payInvoice = (invoiceId: string, phone_number: string) =>
  request<Created>(`/api/payments/invoices/${invoiceId}/pay`, {
    method: "POST",
    body: JSON.stringify({ phone_number }),
  });

export const getDepositStatus = (reference: string) =>
  request<DepositStatus>(`/api/payments/deposit/${reference}`);

export const getWallet = () => request<WalletSummary>("/api/payments/wallet");

export const getWalletTransactions = (limit = 20, offset = 0) =>
  request<LedgerEntry[]>(`/api/payments/wallet/transactions?limit=${limit}&offset=${offset}`);

// ---- subscriptions (organisations)
export const getPlans = () => request<Plan[]>("/api/subscriptions/plans");

export const getMySubscription = () => request<SubscriptionStatus>("/api/subscriptions/me");

export const checkoutSubscription = (plan_code: string) =>
  request<Checkout>("/api/subscriptions/checkout", {
    method: "POST",
    body: JSON.stringify({ plan_code }),
  });