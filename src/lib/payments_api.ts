import { supabase } from "@/lib/supabase"; // ADAPT: your Supabase client (or replace authHeaders)

// Physical device? Use your PC's LAN IP or an ngrok URL, not localhost.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.10:8000";

export type DepositCreated = { reference: string; status: string };
export type DepositStatus = { status: "PENDING" | "SUCCESS" | "FAILED"; receipt: string | null; reason: string | null };
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

export const createDeposit = (phone_number: string, amount: number) =>
  request<DepositCreated>("/api/payments/deposit", {
    method: "POST",
    body: JSON.stringify({ phone_number, amount }),
  });

export const getDepositStatus = (reference: string) =>
  request<DepositStatus>(`/api/payments/deposit/${reference}`);

export const getWallet = () => request<WalletSummary>("/api/payments/wallet");

export const getWalletTransactions = (limit = 20, offset = 0) =>
  request<LedgerEntry[]>(`/api/payments/wallet/transactions?limit=${limit}&offset=${offset}`);

export const payInvoice = (invoiceId: string, phone_number: string) =>
  request<DepositCreated>(`/api/payments/invoices/${invoiceId}/pay`, {
    method: "POST",
    body: JSON.stringify({ phone_number }),
  });