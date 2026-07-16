variable "school_id" {
  type        = string
  description = "Unique identifier for the school"
}

variable "project_name" {
  type        = string
  description = "Identifier for the project."
}

variable "repository_url" { type = string }
variable "repository_branch" { type = string }
variable "domain_name" { type = string }
variable "github_access_token" {
  type      = string
  sensitive = true
}
variable "secret_name" { type = string }
variable "secret_arn" { type = string }
variable "assets_bucket" { type = string }
