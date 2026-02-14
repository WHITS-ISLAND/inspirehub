import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import tagRoutes from "./tags";
import { mockEnv } from "../test/mock-env";

describe("タグルート", () => {
  test("GET /tags は文字列のlimit/offsetを数値に変換して受け付ける", async () => {
    const app = new Hono();
    app.route("/tags", tagRoutes);

    const res = await app.request("/tags?limit=10&offset=0", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
  });

  test("GET /tags は非数値のlimitで400を返す", async () => {
    const app = new Hono();
    app.route("/tags", tagRoutes);

    const res = await app.request("/tags?limit=abc", { method: "GET" }, mockEnv);

    expect(res.status).toBe(400);
  });

  test("GET /tags/suggest は文字列のlimitを数値に変換して受け付ける", async () => {
    const app = new Hono();
    app.route("/tags", tagRoutes);

    const res = await app.request("/tags/suggest?q=test&limit=5", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
  });

  test("GET /tags/suggest は非数値のlimitで400を返す", async () => {
    const app = new Hono();
    app.route("/tags", tagRoutes);

    const res = await app.request("/tags/suggest?q=test&limit=abc", { method: "GET" }, mockEnv);

    expect(res.status).toBe(400);
  });
});
