terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  required_version = ">= 1.6.0"
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# D1 Database
resource "cloudflare_d1_database" "inspirehub" {
  account_id = var.cloudflare_account_id
  name       = "inspirehub-d1"
}

# Workers Script
resource "cloudflare_worker_script" "api" {
  account_id = var.cloudflare_account_id
  name       = "inspirehub-api"
  content    = <<-EOT
    export default {
      async fetch(request, env, ctx) {
        return new Response('API deployment in progress...', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    };
    EOT

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
    text = "develop"
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

# Workers Route for Custom Domain
resource "cloudflare_worker_route" "api" {
  count       = var.custom_domain != "" ? 1 : 0
  zone_id     = var.cloudflare_zone_id
  pattern     = "${var.custom_domain}/*"
  script_name = cloudflare_worker_script.api.name
}

# DNS Record for Custom Domain
resource "cloudflare_record" "api" {
  count   = var.custom_domain != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = replace(var.custom_domain, ".wtnqk.org", "")  # "api.inspirehub" を取得
  type    = "AAAA"
  value   = "100::"  # Workers用の特別なIPv6アドレス
  proxied = true
  comment = "InspireHub API - Cloudflare Workers"
}
