import { apiUrl } from "./url";

/**
 * Every request carries the backend's session cookie (set by GET
 * /auth/callback, read by authentication.controller.get_current_user) -
 * there's no client-side token to attach anymore. `credentials: "include"`
 * is required even though the frontend and backend share a host in local
 * dev (different ports): browsers only send cookies on a `fetch` by default
 * for same-origin requests, and this is cross-origin (different port).
 */
function withCredentials(init?: RequestInit): RequestInit {
  return { ...init, credentials: "include" };
}

async function errorMessage(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null);
  if (typeof payload?.detail === "string") return payload.detail;
  if (Array.isArray(payload?.detail)) {
    return payload.detail
      .map((item: { msg?: string; loc?: unknown[] }) =>
        `${Array.isArray(item.loc) ? item.loc.at(-1) : "request"}: ${item.msg || "invalid value"}`,
      )
      .join("; ");
  }
  return `Request failed (${response.status})`;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiResponse(path, init);
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export async function apiResponse(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), withCredentials(init));
}

export async function apiStream(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(apiUrl(path), withCredentials({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  }));
  if (!response.ok || !response.body) throw new Error(await errorMessage(response));
  return response;
}
