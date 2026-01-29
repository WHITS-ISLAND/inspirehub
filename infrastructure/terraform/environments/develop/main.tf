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

# Workers Script (最小限のプレースホルダー)
# 実際のコードとバインディングはwrangler deployで管理
resource "cloudflare_worker_script" "api" {
  account_id = var.cloudflare_account_id
  name       = "inspirehub-api"
  content    = <<-EOT
    export default {
      async fetch(request, env, ctx) {
        return new Response('Deployment pending. Please deploy via wrangler.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
  EOT
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
