import type { Context } from "hono";
import { cors } from "hono/cors";
import type { HonoEnv } from "../types/bindings";

export function createCorsMiddleware() {
  return cors({
    origin: (origin, c: Context<HonoEnv>) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        c.env.CLIENT_URL,
      ].filter(Boolean);
      return allowedOrigins.includes(origin) ? origin : null;
    },
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 86400,
    credentials: true,
  });
}
