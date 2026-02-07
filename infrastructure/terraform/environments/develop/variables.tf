variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID (for custom domain)"
  type        = string
  default     = ""
}

variable "client_url" {
  description = "Frontend application URL"
  type        = string
}

variable "custom_domain" {
  description = "Custom domain for the API (optional)"
  type        = string
  default     = ""
}

variable "web_custom_domain" {
  description = "Custom domain for the Web (optional)"
  type        = string
  default     = ""
}

# Secrets (from GitHub Secrets)
variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "jwt_access_secret" {
  description = "JWT Access Token Secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT Refresh Token Secret"
  type        = string
  sensitive   = true
}