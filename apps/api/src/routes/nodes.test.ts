import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import nodeRoutes from "./nodes";

// モックのCloudflareバインディング
const mockEnv = {
  DB: {
    prepare: () => ({
      bind: () => ({
        first: () => null,
        all: () => [],
        run: () => ({ success: true }),
      }),
    }),
  },
};

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
