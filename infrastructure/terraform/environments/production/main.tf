terraform {
  backend "s3" {
    # GitHub Actions環境変数で設定
    # bucket = "your-terraform-state-bucket"
    # key    = "inspirehub/production/terraform.tfstate"
    # region = "us-east-1"
  }
}

provider "cloudflare" {
  # CLOUDFLARE_API_TOKEN環境変数を使用
}

# D1 Database
resource "cloudflare_d1_database" "inspirehub" {
  account_id = var.cloudflare_account_id
  name       = "inspirehub-production"
}

# Workers Script
resource "cloudflare_worker_script" "api" {
  account_id = var.cloudflare_account_id
  name       = "inspirehub-api"
  content    = file("${path.module}/../../../apps/api/dist/index.js")

  # D1 binding
  d1_database_binding {
    name        = "DB"
    database_id = cloudflare_d1_database.inspirehub.id
  }

  # 環境変数
  plain_text_binding {
    name = "CLIENT_URL"
    text = var.client_url
  }

  plain_text_binding {
    name = "ENVIRONMENT"
    text = "production"
  }

  # シークレットはGitHub Actionsから注入
  secret_text_binding {
    name = "GOOGLE_CLIENT_ID"
    text = var.google_client_id
  }

  secret_text_binding {
    name = "GOOGLE_CLIENT_SECRET"
    text = var.google_client_secret
  }

  secret_text_binding {
    name = "JWT_ACCESS_SECRET"
    text = var.jwt_access_secret
  }

  secret_text_binding {
    name = "JWT_REFRESH_SECRET"
    text = var.jwt_refresh_secret
  }
}

# Custom Domain (オプション)
resource "cloudflare_worker_domain" "api" {
  count      = var.custom_domain != "" ? 1 : 0
  account_id = var.cloudflare_account_id
  hostname   = var.custom_domain
  service    = cloudflare_worker_script.api.name
  zone_id    = var.cloudflare_zone_id
}