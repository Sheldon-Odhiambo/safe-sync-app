import { getAccessToken } from "./auth-token";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.safesync.co.ke";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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
      body?.detail ?? `Something went wrong (${response.status}).`,
      response.status
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}