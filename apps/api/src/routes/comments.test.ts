import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import nodeRoutes from "./nodes";
import { mockEnv } from "../test/mock-env";

describe("コメントルート", () => {
  test("GET /nodes/:nodeId/comments は文字列のlimit/offsetを数値に変換して受け付ける", async () => {
    const app = new Hono();
    app.route("/nodes", nodeRoutes);

    const res = await app.request(
      "/nodes/some-node-id/comments?limit=50&offset=0",
      { method: "GET" },
      mockEnv,
    );

    // 404 = ノード不在だがバリデーションは通過
    expect(res.status).toBe(404);
  });

  test("GET /nodes/:nodeId/comments は非数値のlimitで400を返す", async () => {
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
