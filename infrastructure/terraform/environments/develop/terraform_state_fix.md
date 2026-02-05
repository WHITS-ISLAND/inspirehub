# Terraform State修正手順

## 問題

- Worker Scriptリソースを削除したが、Terraform stateに残っている
- Applyで削除しようとして失敗する

## 解決方法

### Option 1: Terraform Cloudコンソールから手動で削除

1. Terraform Cloudにログイン
2. Workspace → States → 最新のState
3. リソース一覧から `cloudflare_worker_script.api` を探す
4. 手動で削除（Remove from state）

### Option 2: CLIから削除（要Terraform Cloud API Token）

```bash
terraform state rm cloudflare_worker_script.api
```

### Option 3: 完全リセット（最終手段）

1. Terraform Cloudのworkspaceを削除
2. 新しいworkspaceを作成
3. 既存リソースをインポート:

```bash
terraform import cloudflare_d1_database.inspirehub {account_id}/{database_id}
```
