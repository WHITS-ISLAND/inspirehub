import { useAuthStore } from "@/stores/auth";
import { env } from "@/env";
import type { RefreshTokenResponse } from "@inspirehub/shared/types";

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.baseUrl = env.VITE_API_URL;
  }

  async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const store = useAuthStore.getState();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (store.accessToken) {
      (headers as Record<string, string>)["Authorization"] =
        `Bearer ${store.accessToken}`;
    }

    let response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: "include", // Include cookies
    });

    // If 401, try to refresh token
    if (response.status === 401 && store.isAuthenticated) {
      const refreshed = await this.refreshTokens();

      if (refreshed) {
        // Retry with new token
        const newStore = useAuthStore.getState();
        if (newStore.accessToken) {
          (headers as Record<string, string>)["Authorization"] =
            `Bearer ${newStore.accessToken}`;
          response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers,
            credentials: "include",
          });
        }
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        error.error?.code || "UNKNOWN_ERROR",
        error.error?.message || "An error occurred"
      );
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.fetch<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.fetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async refreshTokens(): Promise<boolean> {
    // Prevent multiple concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        useAuthStore.getState().logout();
        return false;
      }

      const data: RefreshTokenResponse = await response.json();
      useAuthStore.getState().setAccessToken(data.access_token);
      return true;
    } catch {
      useAuthStore.getState().logout();
      return false;
    }
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = new ApiClient();
