output "schools_amplify_urls" {
  value = { for school, mod in module.schools : school => mod.amplify_url }
}

