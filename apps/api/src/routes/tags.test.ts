import { test, expect, describe } from "bun:test";
import { Hono } from "hono";
import tagRoutes from "./tags";
import { mockEnv } from "../test/mock-env";

describe("Tag Routes - Query Parameter Coercion", () => {
  test("GET /tags with string limit/offset should return 200", async () => {
    const app = new Hono();
    app.route("/tags", tagRoutes);

    const res = await app.request(
      "/tags?limit=10&offset=0",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
  });

  test("GET /tags with non-numeric limit should return 400", async () => {
    const app = new Hono();
    app.route("/tags", tagRoutes);

    const res = await app.request(
      "/tags?limit=abc",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(400);
  });

  test("GET /tags/suggest with string limit should return 200", async () => {
    const app = new Hono();
    app.route("/tags", tagRoutes);

    const res = await app.request(
      "/tags/suggest?q=test&limit=5",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
  });

  test("GET /tags/suggest with non-numeric limit should return 400", async () => {
    const app = new Hono();
    app.route("/tags", tagRoutes);

    const res = await app.request(
      "/tags/suggest?q=test&limit=abc",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(400);
  });
});
