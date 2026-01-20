import { Hono } from "hono";
import { generateSpecs, type GenerateSpecOptions } from "hono-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import type { OpenAPIV3_1 } from "openapi-types";
import { renderer } from "./renderer";
import { createCorsMiddleware } from "./middleware/cors";
import auth from "./routes/auth";
import type { HonoEnv } from "./types/bindings";

const app = new Hono<HonoEnv>();

// Middleware
app.use("*", createCorsMiddleware());
app.use(renderer);

// Routes
app.route("/auth", auth);

// Health check
app.get("/", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OpenAPI configuration
const openAPIConfig: Partial<GenerateSpecOptions> = {
  documentation: {
    info: {
      title: "InspireHub API",
      version: "1.0.0",
      description: "API for InspireHub",
    },
    servers: [
      { url: "http://localhost:5173", description: "Local development" },
    ],
    components: {
      securitySchemes: {
        Bearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token",
        } as OpenAPIV3_1.HttpSecurityScheme,
      },
    },
  },
};

// OpenAPI spec endpoint
app.get("/openapi.json", async (c) => {
  const spec = await generateSpecs(app, openAPIConfig);
  return c.json(spec);
});

// Scalar API documentation UI (with inline spec)
app.get("/docs", async (c) => {
  const spec = await generateSpecs(app, openAPIConfig);
  const html = await apiReference({
    content: spec,
    theme: "kepler",
  })(c as never, async () => {});
  return html;
});

export default app;
