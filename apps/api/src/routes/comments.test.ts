import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import nodeRoutes from "./nodes";
import { mockEnv } from "../test/mock-env";

describe("Comment Routes - Query Parameter Coercion", () => {
  test("GET /nodes/:nodeId/comments with string limit/offset should return 200 or 404", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request(
      "/nodes/some-node-id/comments?limit=50&offset=0",
      { method: "GET" },
      mockEnv,
    );

    // 404 because node doesn't exist, but not 400 (validation passed)
    expect(res.status).toBe(404);
  });

  test("GET /nodes/:nodeId/comments with non-numeric limit should return 400", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request(
      "/nodes/some-node-id/comments?limit=abc",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(400);
  });
});
