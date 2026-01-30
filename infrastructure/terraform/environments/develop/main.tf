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

# Workers Script は wrangler deploy で管理
# DNSレコードのみTerraformで管理（ルートはwrangler.jsoncで管理）

# DNS Record for Custom Domain - Workers用の特別な設定
resource "cloudflare_record" "api" {
  count   = var.custom_domain != "" && var.cloudflare_zone_id != "" ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "api.inspirehub"  # サブドメイン名
  type    = "AAAA"
  value   = "100::"  # Workers用の特別なIPv6アドレス
  proxied = true
  comment = "InspireHub API - Cloudflare Workers"
}
