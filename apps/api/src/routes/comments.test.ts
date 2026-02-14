import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import nodeRoutes from "./nodes";
import commentRoutes from "./comments";
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

describe("コメントルート（単体操作）", () => {
  test("GET /comments/:id は存在しないコメントで404を返す", async () => {
    const app = new Hono();
    app.route("/comments", commentRoutes);

    const res = await app.request("/comments/non-existent-id", { method: "GET" }, mockEnv);

    expect(res.status).toBe(404);
  });

  test("PUT /comments/:id は未認証で401を返す", async () => {
    const app = new Hono();
    app.route("/comments", commentRoutes);

    const res = await app.request(
      "/comments/some-id",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated content" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(401);
  });

  test("DELETE /comments/:id は未認証で401を返す", async () => {
    const app = new Hono();
    app.route("/comments", commentRoutes);

    const res = await app.request(
      "/comments/some-id",
      { method: "DELETE" },
      mockEnv,
    );

    expect(res.status).toBe(401);
  });
});
