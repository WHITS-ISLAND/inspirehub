# InspireHub

AIを活用したアイデア管理・ブレインストーミングプラットフォーム

## 技術スタック

### Frontend (`/apps/web`)
- **React 19** + **TypeScript** - UIフレームワーク
- **Vite** - 高速ビルドツール
- **TanStack Router** - タイプセーフなルーティング
- **TanStack Query** - サーバー状態管理
- **TanStack Form** - フォーム管理
- **Zustand** - クライアント状態管理
- **Tailwind CSS v4** - スタイリング
- **shadcn/ui** + **Radix UI** - UIコンポーネント
- **Lucide React** - アイコン
- **Zod** - スキーマバリデーション

### Backend (`/apps/api`)
- **Cloudflare Workers** - エッジランタイム
- **Hono** - 軽量Webフレームワーク
- **Cloudflare D1** - SQLiteベースのエッジDB
- **Kysely** - タイプセーフSQLクエリビルダー
- **JWT (HS256)** - 認証トークン
- **Google OAuth 2.0** - ソーシャルログイン
- **OpenAPI** - API仕様定義

### 開発環境
- **Bun** - JavaScript実行環境・パッケージマネージャー
- **Turborepo** - モノレポ管理
- **OXC (oxlint + oxfmt)** - Rustベースの高速リンター/フォーマッター
- **TypeScript** - 型安全性

## セットアップ

### 前提条件
- Bun 1.3.5以上
- Node.js 18以上（一部ツール用）

### インストール
```bash
# 依存関係のインストール
bun install

# 環境変数の設定
cp apps/api/.env.example apps/api/.env
# .envファイルを編集してGoogle OAuth認証情報を設定
```

### 開発サーバーの起動
```bash
# 全サービスを起動（推奨）
bun run dev

# 個別に起動する場合
cd apps/api && bun run dev  # API: http://localhost:8787
cd apps/web && bun run dev  # Web: http://localhost:3000
```

## データベース管理

### D1データベース操作
```bash
# ユーザー一覧を確認
bunx wrangler d1 execute inspirehub-db --local --command="SELECT * FROM users;" --persist-to=./.wrangler/state

# リフレッシュトークンを確認
bunx wrangler d1 execute inspirehub-db --local --command="SELECT * FROM refresh_token_families;" --persist-to=./.wrangler/state

# SQLファイルを実行
bunx wrangler d1 execute inspirehub-db --local --file=./apps/api/query.sql --persist-to=./.wrangler/state
```

### マイグレーション
```bash
cd apps/api
bunx wrangler d1 migrations apply inspirehub-db --local
```

## 認証フロー

1. **ログイン開始**: ユーザーが「Googleでログイン」をクリック
2. **OAuth認証**: SPA → API Server → Google → API Server → SPA
3. **トークン発行**:
   - Access Token (15分)
   - Refresh Token (30日、ローテーション対応)
4. **セッション管理**: HttpOnly Cookieで安全に保管

## プロジェクト構成

```
inspirehub/
├── apps/
│   ├── api/          # Cloudflare Workers API
│   │   ├── src/
│   │   │   ├── routes/    # APIエンドポイント
│   │   │   ├── services/  # ビジネスロジック
│   │   │   ├── lib/       # ユーティリティ
│   │   │   └── types/     # 型定義
│   │   └── schema.sql     # データベーススキーマ
│   │
│   └── web/          # React フロントエンド
│       └── src/
│           ├── components/ # UIコンポーネント
│           ├── routes/     # ページコンポーネント
│           ├── lib/        # ユーティリティ
│           └── stores/     # Zustand ストア
│
├── packages/
│   └── shared/       # 共有コード・型定義
│
└── turbo.json       # Turborepo設定
```

## 開発コマンド

```bash
# リント
bun run lint

# フォーマット
bun run format

# ビルド
bun run build

# テスト
bun run test
```

## デプロイ

```bash
# Cloudflare Workersにデプロイ
cd apps/api
bun run deploy
```

## 環境変数

### API (`apps/api/.env`)
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# URLs
CLIENT_URL=http://localhost:3000
```

### Web (`apps/web/.env`)
```env
VITE_API_URL=http://localhost:8787
```

## ライセンス

MIT
