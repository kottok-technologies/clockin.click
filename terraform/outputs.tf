output "schools_amplify_urls" {
  value = { for school, mod in module.schools : school => mod.amplify_url }
}

output "marketing_amplify_url" {
  value = "https://${aws_amplify_branch.marketing_production.branch_name}.${aws_amplify_app.marketing.default_domain}"
}

output "marketing_custom_urls" {
  value = [
    "https://${var.marketing_domain_name}",
    "https://www.${var.marketing_domain_name}",
  ]
}

