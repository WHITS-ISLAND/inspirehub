# Google認証システム設計

## 概要

- Google OAuth 2.0 によるログイン
- 取得情報: メールアドレス、プロフィール画像、表示名
- 対応: Web + 将来のネイティブアプリ

## 技術選定

| 項目 | 選定 |
|------|------|
| ユーザー保存 | D1 (SQLite) |
| クエリビルダー | Kysely (型安全) |
| マイグレーション | Atlas |
| 一時データ | KV |
| JWT署名 | ES256 (ECDSA P-256) |
| Web Token保存 | HttpOnly Cookie |
| API認証ヘッダー | Authorization: Bearer |

## 認証フロー

```
[Web] Google OAuth → id_token取得
         ↓
[API] id_token検証 → ユーザー作成/取得(D1) → JWT発行
         ↓
[Web] access_token: メモリ/zustand
      refresh_token: HttpOnly Cookie
```

## APIエンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/auth/google/url` | Google OAuth URL取得 |
| POST | `/auth/google/callback` | コード→トークン交換 |
| POST | `/auth/refresh` | トークンリフレッシュ |
| GET | `/auth/me` | 現在のユーザー取得 |
| POST | `/auth/logout` | ログアウト |

## JWT構造

### Access Token (15分)

```json
{
  "iss": "inspirehub-api",
  "sub": "<user_id>",
  "aud": "inspirehub-web",
  "exp": "<15分後>",
  "email": "...",
  "name": "...",
  "picture": "..."
}
```

### Refresh Token (30日)

```json
{
  "iss": "inspirehub-api",
  "sub": "<user_id>",
  "exp": "<30日後>",
  "type": "refresh",
  "family": "<family_id>"
}
```

## D1スキーマ

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE refresh_token_families (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  current_token_jti TEXT NOT NULL,
  is_revoked INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 環境変数

### API (wrangler secrets)

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
JWT_PRIVATE_KEY
JWT_PUBLIC_KEY
```

### Web (.env.local)

```
VITE_API_URL=http://localhost:8787
VITE_GOOGLE_CLIENT_ID=xxx
```

## セットアップ手順

### 1. D1データベース作成

```bash
cd apps/api
wrangler d1 create inspirehub-db
# 出力されたdatabase_idをwrangler.jsoncに設定
```

### 2. KVネームスペース作成

```bash
wrangler kv namespace create KV
# 出力されたidをwrangler.jsoncに設定
```

### 3. JWT鍵ペア生成

```typescript
// 一度だけ実行
import { generateKeyPair } from './src/lib/jwt';
const keys = await generateKeyPair();
console.log('Private Key:', keys.privateKey);
console.log('Public Key:', keys.publicKey);
```

### 4. シークレット設定

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_PRIVATE_KEY
wrangler secret put JWT_PUBLIC_KEY
```

### 5. マイグレーション実行

**Atlas を使用する場合:**
```bash
# Atlas CLIをインストール
curl -sSf https://atlasgo.sh | sh

# マイグレーション生成
atlas migrate diff --env local

# D1に適用
wrangler d1 execute inspirehub-db --file=./migrations/XXX_initial.sql
```

**手動の場合:**
```bash
wrangler d1 execute inspirehub-db --file=./schema.sql
```

### 6. Web環境変数設定

```bash
cp apps/web/.env.example apps/web/.env.local
# .env.localを編集
```

## ディレクトリ構成

```
apps/api/
├── schema.sql              # DBスキーマ（Atlas用）
├── atlas.hcl               # Atlas設定
├── migrations/             # マイグレーション
└── src/
    ├── routes/auth.ts
    ├── middleware/auth.ts, cors.ts
    ├── services/google.ts, user.ts, token.ts
    ├── lib/jwt.ts, db.ts   # Kyselyセットアップ
    └── types/bindings.ts

apps/web/src/
├── stores/auth.ts
├── lib/api-client.ts
├── routes/login.tsx, auth/callback.tsx
└── components/auth/GoogleLoginButton.tsx, AuthGuard.tsx, UserMenu.tsx
```
