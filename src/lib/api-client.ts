import { getAccessToken } from "./auth-token";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.safesync.co.ke";

export class ApiError extends Error {
  status: number;
  /** Raw FastAPI `detail`: string, {code, message, blockers?}, or a 422 array. */
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }

  get code(): string | undefined {
    const d = this.detail as { code?: string } | null;
    return d && typeof d === "object" && !Array.isArray(d) ? d.code : undefined;
  }
}

function messageFromDetail(detail: unknown, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // FastAPI 422 validation errors
    return detail.map((e) => e?.msg).filter(Boolean).join("\n") || "Invalid input.";
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return `Something went wrong (${status}).`;
}

export async function apiFetch<T>(
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
    throw new ApiError(
      messageFromDetail(body?.detail, response.status),
      response.status,
      body?.detail
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}