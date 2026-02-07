import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import authRoutes from "./auth";
import { mockEnv } from "../test/mock-env";

describe("Auth Routes", () => {
  test("GET /auth/me should return 401 without token", async () => {
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

  test("POST /auth/verify should return 401 with invalid id_token", async () => {
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

  test("POST /auth/logout should return 401 with invalid token", async () => {
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
});
