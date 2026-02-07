import { jwt } from "hono/jwt";
import { createMiddleware } from "hono/factory";
import type { HonoEnv } from "../types/bindings";
import type { AccessTokenPayload } from "../lib/jwt";

// JWT authentication middleware
// Wraps hono/jwt to access environment variables and set user context
export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_ACCESS_SECRET,
    alg: "HS256",
  });

  // Run JWT middleware
  await jwtMiddleware(c, async () => {
    // Get payload from JWT middleware
    const payload = c.get("jwtPayload") as AccessTokenPayload;

    // Set user info in context
    c.set("userId", payload.sub);
    c.set("userEmail", payload.email);

    await next();
  });
});

// Optional JWT authentication middleware
// Sets userId/userEmail if a valid token is present, but does not reject unauthenticated requests
export const optionalAuthMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    await next();
    return;
  }

  try {
    const jwtMiddleware = jwt({
      secret: c.env.JWT_ACCESS_SECRET,
      alg: "HS256",
    });

    await jwtMiddleware(c, async () => {
      const payload = c.get("jwtPayload") as AccessTokenPayload;
      c.set("userId", payload.sub);
      c.set("userEmail", payload.email);
    });
  } catch {
    // Invalid token — continue as unauthenticated
  }

  await next();
});
