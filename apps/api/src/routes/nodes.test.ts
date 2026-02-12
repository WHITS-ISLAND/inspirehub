import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import nodeRoutes from "./nodes";
import { mockEnv } from "../test/mock-env";

describe("Node Routes", () => {
  test("GET /nodes should return nodes list", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request(
      "/nodes",
      {
        method: "GET",
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { nodes: unknown[] };
    expect(Array.isArray(data.nodes)).toBe(true);
  });

  test("POST /nodes should require authentication", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request(
      "/nodes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "idea",
          title: "Test Node",
          content: "Test content",
        }),
      },
      mockEnv,
    );

    expect(res.status).toBe(401);
  });

  test("GET /nodes with valid token should set userId context", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: "test-user-id", email: "test@example.com", type: "access", iat: now, exp: now + 900 },
      mockEnv.JWT_ACCESS_SECRET,
      "HS256",
    );

    const res = await app.request(
      "/nodes",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { nodes: unknown[] };
    expect(Array.isArray(data.nodes)).toBe(true);
  });

  test("GET /nodes with invalid token should still return 200", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request(
      "/nodes",
      {
        method: "GET",
        headers: { Authorization: "Bearer invalid-token" },
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { nodes: unknown[] };
    expect(Array.isArray(data.nodes)).toBe(true);
  });

  test("GET /nodes with expired token should still return 200", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      {
        sub: "test-user-id",
        email: "test@example.com",
        type: "access",
        iat: now - 1800,
        exp: now - 900,
      },
      mockEnv.JWT_ACCESS_SECRET,
      "HS256",
    );

    const res = await app.request(
      "/nodes",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { nodes: unknown[] };
    expect(Array.isArray(data.nodes)).toBe(true);
  });

  test("GET /nodes with string limit/offset should return 200", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request("/nodes?limit=20&offset=0", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const data = (await res.json()) as { nodes: unknown[] };
    expect(Array.isArray(data.nodes)).toBe(true);
  });

  test("GET /nodes with non-numeric limit should return 400", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request("/nodes?limit=abc", { method: "GET" }, mockEnv);

    expect(res.status).toBe(400);
  });

  test("GET /nodes with out-of-range limit should return 400", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request("/nodes?limit=0", { method: "GET" }, mockEnv);

    expect(res.status).toBe(400);
  });

  test("GET /nodes?liked_by=me without auth should return 401", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request("/nodes?liked_by=me", { method: "GET" }, mockEnv);

    expect(res.status).toBe(401);
  });

  test("GET /nodes?liked_by=me with auth should return 200", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const now = Math.floor(Date.now() / 1000);
    const token = await sign(
      { sub: "test-user-id", email: "test@example.com", type: "access", iat: now, exp: now + 900 },
      mockEnv.JWT_ACCESS_SECRET,
      "HS256",
    );

    const res = await app.request(
      "/nodes?liked_by=me",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { nodes: unknown[] };
    expect(Array.isArray(data.nodes)).toBe(true);
  });

  test("GET /nodes/:id should return 404 for non-existent node", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request(
      "/nodes/non-existent-id",
      {
        method: "GET",
      },
      mockEnv,
    );

    expect(res.status).toBe(404);
  });
});
