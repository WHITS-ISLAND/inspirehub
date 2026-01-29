output "d1_database_id" {
  description = "The ID of the Cloudflare D1 database"
  value       = cloudflare_d1_database.inspirehub.id
}

output "d1_database_name" {
  description = "The name of the Cloudflare D1 database"
  value       = cloudflare_d1_database.inspirehub.name
}

output "worker_script_name" {
  description = "The name of the Cloudflare Worker script"
  value       = cloudflare_worker_script.api.name
}

output "custom_domain" {
  description = "The custom domain for the API"
  value       = var.custom_domain
}