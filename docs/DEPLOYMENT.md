# InspireHub デプロイメント

## 必要な準備

### 1. GitHub Secrets設定

以下のシークレットをGitHubリポジトリに設定してください：

#### Cloudflare関連

- `CLOUDFLARE_API_TOKEN` - Cloudflare APIトークン
- `CLOUDFLARE_ACCOUNT_ID` - CloudflareアカウントID
- `CLOUDFLARE_ZONE_ID` - Cloudflareゾーン ID（カスタムドメイン使用時）

#### Google OAuth関連

- `GOOGLE_CLIENT_ID` - Google OAuth クライアントID
- `GOOGLE_CLIENT_SECRET` - Google OAuth クライアントシークレット

#### JWT関連（強力なランダム文字列を生成）

- `JWT_ACCESS_SECRET` - JWTアクセストークン用シークレット
- `JWT_REFRESH_SECRET` - JWTリフレッシュトークン用シークレット

#### アプリケーション設定

- `CLIENT_URL` - フロントエンドURL（例: https://inspirehub.example.com）
- `CUSTOM_DOMAIN` - APIカスタムドメイン（オプション、例: api.inspirehub.example.com）

#### Terraform State管理（S3）

- `TF_STATE_BUCKET` - Terraform state用S3バケット名
- `TF_STATE_REGION` - S3バケットのリージョン
- `AWS_ACCESS_KEY_ID` - AWS アクセスキーID
- `AWS_SECRET_ACCESS_KEY` - AWS シークレットアクセスキー

### 2. Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. OAuth 2.0 クライアントIDを作成
3. 承認済みリダイレクトURIに以下を追加：
   - `https://your-api-domain.workers.dev/auth/google/callback`
   - `https://api.your-domain.com/auth/google/callback`（カスタムドメイン使用時）

### 3. Cloudflare設定

1. Cloudflareアカウントを作成
2. APIトークンを生成（Workers Scripts:Edit権限が必要）
3. カスタムドメインを使用する場合はDNS設定

## デプロイフロー

### 自動デプロイ

`develop`ブランチへのpushまたはPRマージ時に自動でデプロイされます。

```bash
# 機能ブランチから develop へのPR作成
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# GitHub上でPRを作成・マージ
# → 自動的にデプロイが実行される
```

### 手動デプロイ

GitHub Actionsから手動実行も可能：

1. GitHub リポジトリの Actions タブを開く
2. "Deploy API to Cloudflare Workers" を選択
3. "Run workflow" をクリック

## インフラストラクチャ管理

### Terraform初期設定

```bash
cd infrastructure/terraform/environments/production

# terraform.tfvarsを作成
cp terraform.tfvars.example terraform.tfvars
# 値を編集

# 初期化
terraform init

# プラン確認
terraform plan

# 適用
terraform apply
```

### Terraformで管理されるリソース

- Cloudflare D1 Database
- Cloudflare Workers Script
- カスタムドメイン設定（オプション）

## トラブルシューティング

### データベースマイグレーション

```bash
# ローカルで確認
wrangler d1 migrations list DB --local

# 本番環境に適用
wrangler d1 migrations apply DB --remote
```

### シークレット更新

```bash
# Wrangler経由で直接更新
wrangler secret put JWT_ACCESS_SECRET
```

### ログ確認

```bash
# リアルタイムログ
wrangler tail

# エラーログ確認
wrangler tail --format json | grep error
```

## 環境変数一覧

| 変数名                  | 説明                                  | 必須 | 例                             |
| ----------------------- | ------------------------------------- | ---- | ------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare APIトークン                | ✅   | -                              |
| `CLOUDFLARE_ACCOUNT_ID` | CloudflareアカウントID                | ✅   | -                              |
| `GOOGLE_CLIENT_ID`      | Google OAuth クライアントID           | ✅   | xxx.apps.googleusercontent.com |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth クライアントシークレット | ✅   | -                              |
| `JWT_ACCESS_SECRET`     | JWTアクセストークン用シークレット     | ✅   | ランダム文字列                 |
| `JWT_REFRESH_SECRET`    | JWTリフレッシュトークン用シークレット | ✅   | ランダム文字列                 |
| `CLIENT_URL`            | フロントエンドURL                     | ✅   | https://inspirehub.example.com |
| `CUSTOM_DOMAIN`         | APIカスタムドメイン                   | ❌   | api.inspirehub.example.com     |
