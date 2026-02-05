// テスト用のCloudflareバインディングモック
export const mockEnv = {
  DB: {
    prepare: () => ({
      bind: () => ({
        first: () => Promise.resolve(null),
        all: () => Promise.resolve({ results: [], meta: { changes: 0 } }),
        run: () => Promise.resolve({ success: true, meta: { changes: 0 } }),
      }),
    }),
  },
  KV: {
    get: () => Promise.resolve(null),
    put: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  },
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  CLIENT_URL: "http://localhost:5173",
  APP_URL: "http://localhost:5173",
  API_URL: "http://localhost:8787",
  ENVIRONMENT: "test",
};
