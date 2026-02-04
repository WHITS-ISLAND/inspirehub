# Terraform Infrastructure

このディレクトリはInspireHubのインフラストラクチャをTerraformで管理しています。

## 構成

- **environments/develop**: 開発環境（本番環境として使用）

## 管理対象

Terraformで管理しているリソース：

1. **Cloudflare D1 Database** - SQLiteデータベース
2. **Cloudflare Worker Script** - 最小限のプレースホルダーのみ
3. **Cloudflare DNS/Routes** - カスタムドメイン設定（設定時のみ）

## 重要な注意事項

### Worker Scriptについて

- Terraformは最小限のプレースホルダーWorkerのみを作成します
- 実際のアプリケーションコードとバインディング（D1、環境変数、シークレット）は`wrangler deploy`で管理されます
- これは以下の理由によるアーキテクチャ決定です：
  - ES Module形式とD1バインディングの複雑性を回避
  - アプリケーションコードとインフラストラクチャの責任分離
  - デプロイプロセスの簡素化

### デプロイフロー

1. **初回セットアップ**（Terraformで実行）:

   ```bash
   # GitHub Actionsの手動ディスパッチで実行
   # D1データベースとプレースホルダーWorkerを作成
   ```

2. **アプリケーションデプロイ**（wranglerで実行）:
   ```bash
   # GitHub Actionsのdeploy-api.ymlで自動実行
   # 実際のコード、バインディング、シークレットをデプロイ
   ```

## 環境変数

以下のGitHub Secretsが必要です：

- `TF_API_TOKEN` - Terraform Cloud API Token
- `CLOUDFLARE_API_TOKEN` - Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare Account ID
- `CLOUDFLARE_ZONE_ID` - Cloudflare Zone ID（カスタムドメイン使用時）
- その他アプリケーション固有のシークレット

## Terraform Cloud

- Organization: `inspirehub`
- Workspace: `inspirehub-develop`
