import { apiFetch, ApiError } from "@/lib/api-client";
import { log } from "@/lib/debug-log";

function parseBody(body: unknown) {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export async function apiFetchLogged<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const method = init?.method ?? "GET";
  const started = Date.now();

  log.info("api", `→ ${method} ${path}`, parseBody(init?.body));

  try {
    const result = await apiFetch<T>(path, init);
    log.info(
      "api",
      `← ${method} ${path} OK (${Date.now() - started}ms)`,
      result
    );
    return result;
  } catch (err) {
    const status = err instanceof ApiError ? err.status : undefined;
    log.error(
      "api",
      `✕ ${method} ${path} FAILED${status ? ` [${status}]` : ""} (${
        Date.now() - started
      }ms)`,
      {
        status,
        message: err instanceof Error ? err.message : String(err),
      }
    );
    throw err;
  }
}