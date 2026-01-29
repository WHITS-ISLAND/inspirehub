import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import { authRoutes } from "./auth";

// モックのCloudflareバインディング
const mockEnv = {
  DB: {
    prepare: () => ({
      bind: () => ({
        first: () => null,
        all: () => [],
        run: () => ({ success: true })
      })
    })
  }
};

describe("Auth Routes", () => {
  test("GET /auth/me should return 401 without token", async () => {
    const app = new Hono();
    app.route("/auth", authRoutes);

    const res = await app.request("/auth/me", {
      method: "GET"
    }, mockEnv);

    expect(res.status).toBe(401);
  });

  test("GET /auth/google should redirect to Google OAuth", async () => {
    const app = new Hono();
    app.route("/auth", authRoutes);

    const res = await app.request("/auth/google", {
      method: "GET"
    }, mockEnv);

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("accounts.google.com");
  });

  test("POST /auth/logout should clear tokens", async () => {
    const app = new Hono();
    app.route("/auth", authRoutes);

    const res = await app.request("/auth/logout", {
      method: "POST",
      headers: {
        "Authorization": "Bearer invalid-token"
      }
    }, mockEnv);

    expect(res.status).toBe(200);
  });
});