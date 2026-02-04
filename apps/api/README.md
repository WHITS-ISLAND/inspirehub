# InspireHub API

Cloudflare Workers + Hono で構築された API サーバー。

## 開発

```bash
bun install
bun run dev
```

## Environment Variables

### Local Development

Create `.dev.vars` file in `apps/api/`:

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_ACCESS_SECRET=your-jwt-access-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
```

### Production (Cloudflare Workers)

```bash
cd apps/api
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_ACCESS_SECRET
wrangler secret put JWT_REFRESH_SECRET
```

## Deployment

```bash
bun run deploy
```

## 型生成

[Cloudflare Workers の型を生成](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
bun run cf-typegen
```

`Hono` インスタンス化時に `CloudflareBindings` を指定:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```
