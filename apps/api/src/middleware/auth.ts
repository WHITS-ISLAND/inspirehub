import { createMiddleware } from "hono/factory";
import type { HonoEnv } from "../types/bindings";
import { verifyJwt } from "../lib/jwt";
import type { AccessTokenPayload } from "@inspirehub/shared/types";

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing authorization header" },
      },
      401
    );
  }

  const token = authHeader.slice(7);
  const payload = await verifyJwt<AccessTokenPayload>(
    token,
    c.env.JWT_PUBLIC_KEY
  );

  if (!payload) {
    return c.json(
      {
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
      },
      401
    );
  }

  // Set user info in context
  c.set("userId", payload.sub);
  c.set("userEmail", payload.email);

  await next();
});
