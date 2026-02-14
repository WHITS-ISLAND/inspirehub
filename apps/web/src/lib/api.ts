import { hc } from "hono/client";
import type { AppType } from "../../../api/src/index";
import { useAuthStore } from "@/stores/auth";
import { env } from "@/env";

const getHeaders = (): Record<string, string> => {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = hc<AppType>(env.VITE_API_URL, {
  headers: getHeaders,
  init: { credentials: "include" },
});

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshPromise: Promise<boolean> | null = null;

export async function refreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await api.auth.refresh.$post({ json: {} });
      if (!res.ok) {
        useAuthStore.getState().logout();
        return false;
      }
      const data = (await res.json()) as { access_token: string };
      useAuthStore.getState().setAccessToken(data.access_token);
      return true;
    } catch {
      useAuthStore.getState().logout();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function handleResponse<T>(
  response: Response,
  retryFn?: () => Promise<Response>,
): Promise<T> {
  if (response.status === 401 && retryFn) {
    const refreshed = await refreshToken();
    if (refreshed) {
      const retryRes = await retryFn();
      if (!retryRes.ok) {
        const error = await retryRes.json().catch(() => ({}));
        const errObj = error as { error?: { code?: string; message?: string } };
        throw new ApiError(
          retryRes.status,
          errObj.error?.code || "UNKNOWN_ERROR",
          errObj.error?.message || "An error occurred",
        );
      }
      return retryRes.json() as Promise<T>;
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errObj = error as { error?: { code?: string; message?: string } };
    throw new ApiError(
      response.status,
      errObj.error?.code || "UNKNOWN_ERROR",
      errObj.error?.message || "An error occurred",
    );
  }
  return response.json() as Promise<T>;
}
