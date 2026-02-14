import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import userRoutes from "./users";
import { mockEnv } from "../test/mock-env";

describe("ユーザールート", () => {
  test("PATCH /users/me は未認証で401を返す", async () => {
    const app = new Hono();
    app.route("/users", userRoutes);

    const res = await app.request(
      "/users/me",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(401);
  });

  test("PATCH /users/me はリクエストボディなしで400を返す", async () => {
    const app = new Hono();
    app.route("/users", userRoutes);

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: "user-1", email: "test@example.com", type: "access", iat: now, exp: now + 900 },
      mockEnv.JWT_ACCESS_SECRET,
      "HS256",
    );

    const res = await app.request(
      "/users/me",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
  });

  test("PATCH /users/me は空文字のnameで400を返す", async () => {
    const app = new Hono();
    app.route("/users", userRoutes);

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: "user-1", email: "test@example.com", type: "access", iat: now, exp: now + 900 },
      mockEnv.JWT_ACCESS_SECRET,
      "HS256",
    );

    const res = await app.request(
      "/users/me",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
  });

  test("PATCH /users/me は有効なトークンでユーザー不在なら404を返す", async () => {
    const app = new Hono();
    app.route("/users", userRoutes);

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: "user-1", email: "test@example.com", type: "access", iat: now, exp: now + 900 },
      mockEnv.JWT_ACCESS_SECRET,
      "HS256",
    );

    const res = await app.request(
      "/users/me",
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "New Name" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(404);
  });
});
