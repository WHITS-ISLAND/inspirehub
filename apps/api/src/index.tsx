import { Hono } from "hono";
import { logger } from "hono/logger";
import { generateSpecs, type GenerateSpecOptions } from "hono-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import type { OpenAPIV3_1 } from "openapi-types";
import { renderer } from "./renderer";
import { createCorsMiddleware } from "./middleware/cors";
import auth from "./routes/auth";
import nodes from "./routes/nodes";
import comments from "./routes/comments";
import tags from "./routes/tags";
import users from "./routes/users";
import type { HonoEnv } from "./types/bindings";

const app = new Hono<HonoEnv>();

// Middleware
app.use(logger());
app.use("*", createCorsMiddleware());
app.use(renderer);

// Routes (chained for RPC type inference)
const routes = app
  .route("/auth", auth)
  .route("/nodes", nodes)
  .route("/comments", comments)
  .route("/tags", tags)
  .route("/users", users);

// Health check
app.get("/", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OpenAPI configuration
const createOpenAPIConfig = (env: HonoEnv["Bindings"]): Partial<GenerateSpecOptions> => ({
  documentation: {
    info: {
      title: "InspireHub API",
      version: "1.0.0",
      description: "InspireHubのAPI仕様書",
    },
    servers: [
      {
        url: env.API_URL || "http://localhost:8787",
        description: env.ENVIRONMENT === "develop" ? "本番環境" : "ローカル開発環境",
      },
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
});

// OpenAPI spec endpoint
app.get("/openapi.json", async (c) => {
  const config = createOpenAPIConfig(c.env);
  const spec = await generateSpecs(app, config);
  return c.json(spec);
});

// Scalar API documentation UI (with inline spec)
app.get("/docs", async (c) => {
  const config = createOpenAPIConfig(c.env);
  const spec = await generateSpecs(app, config);
  const html = await apiReference({
    content: spec,
    theme: "kepler",
  })(c as never, async () => {});
  return html;
});

export type AppType = typeof routes;
export default app;
