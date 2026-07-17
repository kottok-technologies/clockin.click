locals {
  school_ids = distinct(concat(var.schools, [var.demo_school_name]))
}

module "schools" {
  for_each            = toset(local.school_ids)
  source              = "./modules/school"
  school_id           = each.value
  project_name        = var.project_name
  repository_url      = var.repository_url
  repository_branch   = var.repository_branch
  domain_name         = var.domain_name
  github_access_token = var.github_access_token
  secret_name         = var.secret_name
  secret_arn          = var.secret_arn
  assets_bucket       = var.assets_bucket
}

output "school_service_urls" {
  value = { for s, m in module.schools : s => m.custom_domain }
}
