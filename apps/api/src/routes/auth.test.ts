import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import authRoutes from "./auth";
import { mockEnv } from "../test/mock-env";

describe("認証ルート", () => {
  test("GET /auth/me はトークンなしで401を返す", async () => {
    const app = new Hono();
    app.route("/auth", authRoutes);

    const res = await app.request(
      "/auth/me",
      {
        method: "GET",
      },
      mockEnv,
    );

    expect(res.status).toBe(401);
  });

  test("POST /auth/verify は無効なid_tokenで401を返す", async () => {
    const app = new Hono();
    app.route("/auth", authRoutes);

    const res = await app.request(
      "/auth/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_token: "invalid-token" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(401);
  });

  test("POST /auth/logout は無効なトークンで401を返す", async () => {
    const app = new Hono();
    app.route("/auth", authRoutes);

    const res = await app.request(
      "/auth/logout",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid-token",
        },
      },
      mockEnv,
    );

    expect(res.status).toBe(401);
  });

  describe("POST /auth/refresh", () => {
    test("リフレッシュトークンなしで401を返す", async () => {
      const app = new Hono();
      app.route("/auth", authRoutes);

      const res = await app.request(
        "/auth/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
        mockEnv,
      );

      expect(res.status).toBe(401);
    });

    test("無効なリフレッシュトークンで401を返す", async () => {
      const app = new Hono();
      app.route("/auth", authRoutes);

      const res = await app.request(
        "/auth/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: "invalid-token" }),
        },
        mockEnv,
      );

      expect(res.status).toBe(401);
    });

    test("type=accessのトークンで401を返す", async () => {
      const app = new Hono();
      app.route("/auth", authRoutes);

      const now = Math.floor(Date.now() / 1000);
      const accessToken = await sign(
        { sub: "user-1", email: "test@example.com", type: "access", iat: now, exp: now + 900 },
        mockEnv.JWT_REFRESH_SECRET,
        "HS256",
      );

      const res = await app.request(
        "/auth/refresh",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: accessToken }),
        },
        mockEnv,
      );

      expect(res.status).toBe(401);
    });
  });

  test("GET /auth/me は有効なトークンでユーザー不在なら404を返す", async () => {
    const app = new Hono();
    app.route("/auth", authRoutes);

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      {
        sub: "non-existent-user",
        email: "test@example.com",
        type: "access",
        iat: now,
        exp: now + 900,
      },
      mockEnv.JWT_ACCESS_SECRET,
      "HS256",
    );

    const res = await app.request(
      "/auth/me",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
      mockEnv,
    );

    expect(res.status).toBe(404);
  });

  test("POST /auth/logout は有効なトークンで成功レスポンスを返す", async () => {
    const app = new Hono();
    app.route("/auth", authRoutes);

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: "user-1", email: "test@example.com", type: "access", iat: now, exp: now + 900 },
      mockEnv.JWT_ACCESS_SECRET,
      "HS256",
    );

    const res = await app.request(
      "/auth/logout",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean };
    expect(data.success).toBe(true);
  });
});
