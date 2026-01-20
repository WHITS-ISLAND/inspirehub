export interface CloudflareBindings {
  // D1 Database
  DB: D1Database;

  // KV Namespace
  KV: KVNamespace;

  // Environment Variables
  APP_URL: string;
  API_URL: string;

  // Secrets (set via wrangler secret put)
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CLIENT_URL: string;
}

// Hono app type with bindings
export type HonoEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    userId?: string;
    userEmail?: string;
  };
};
