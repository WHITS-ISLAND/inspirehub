import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import nodeRoutes from "./nodes";
import { mockEnv } from "../test/mock-env";

describe("ノードルート", () => {
  test("GET /nodes はノード一覧を返す", async () => {
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

  test("POST /nodes は未認証で401を返す", async () => {
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

  test("GET /nodes は有効なトークンでノード一覧を返す", async () => {
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

  test("GET /nodes は無効なトークンでも公開データを返す", async () => {
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

  test("GET /nodes は期限切れトークンでも公開データを返す", async () => {
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

  test("GET /nodes は文字列のlimit/offsetを数値に変換して受け付ける", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request("/nodes?limit=20&offset=0", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const data = (await res.json()) as { nodes: unknown[] };
    expect(Array.isArray(data.nodes)).toBe(true);
  });

  test("GET /nodes は非数値のlimitで400を返す", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request("/nodes?limit=abc", { method: "GET" }, mockEnv);

    expect(res.status).toBe(400);
  });

  test("GET /nodes は範囲外のlimitで400を返す", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request("/nodes?limit=0", { method: "GET" }, mockEnv);

    expect(res.status).toBe(400);
  });

  test("GET /nodes?liked_by=me は未認証で401を返す", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request("/nodes?liked_by=me", { method: "GET" }, mockEnv);

    expect(res.status).toBe(401);
  });

  test("GET /nodes?liked_by=me は認証済みでノード一覧を返す", async () => {
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

  test("GET /nodes/:id は存在しないノードで404を返す", async () => {
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

  describe("リアクションユーザー一覧", () => {
    test("GET /nodes/:id/reactions/like は存在しないノードで404を返す", async () => {
      const app = new Hono();
      app.route("/nodes", nodeRoutes);

      const res = await app.request(
        "/nodes/non-existent-id/reactions/like",
        {
          method: "GET",
        },
        mockEnv,
      );

      expect(res.status).toBe(404);
    });

    test("GET /nodes/:id/reactions/interested は存在しないノードで404を返す", async () => {
      const app = new Hono();
      app.route("/nodes", nodeRoutes);

      const res = await app.request(
        "/nodes/non-existent-id/reactions/interested",
        {
          method: "GET",
        },
        mockEnv,
      );

      expect(res.status).toBe(404);
    });

    test("GET /nodes/:id/reactions/want-to-try は存在しないノードで404を返す", async () => {
      const app = new Hono();
      app.route("/nodes", nodeRoutes);

      const res = await app.request(
        "/nodes/non-existent-id/reactions/want-to-try",
        {
          method: "GET",
        },
        mockEnv,
      );

      expect(res.status).toBe(404);
    });

    test("GET /nodes/:id/reactions/like は許可範囲外のlimitで400を返す", async () => {
      const app = new Hono();
      app.route("/nodes", nodeRoutes);

      const res = await app.request(
        "/nodes/any-id/reactions/like?limit=5",
        {
          method: "GET",
        },
        mockEnv,
      );

      expect(res.status).toBe(400);
    });

    test("GET /nodes/:id/reactions/like は許可範囲内のlimitでバリデーションを通過する", async () => {
      const app = new Hono();
      app.route("/nodes", nodeRoutes);

      const res = await app.request(
        "/nodes/non-existent-id/reactions/like?limit=30",
        {
          method: "GET",
        },
        mockEnv,
      );

      // 404 = ノード不在だがlimitバリデーションは通過
      expect(res.status).toBe(404);
    });
  });
});
