variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "clockinclick"
}

variable "schools" {
  type    = list(string)
  default = ["test"]
}

variable "demo_school_name" {
  type        = string
  description = "Public demo tenant that is always provisioned alongside customer schools."
  default     = "Demo"
}

variable "repository_url" {
  type    = string
  default = "https://github.com/kottok-technologies/clockin.click"
}

variable "repository_branch" {
  type    = string
  default = "main"
}

variable "domain_name" {
  type    = string
  default = "clockin.click"
}

variable "github_access_token" {
  type      = string
  sensitive = true
}

variable "secret_name" {
  type    = string
  default = "clockinclick-app-secrets"
}

variable "secret_arn" {
  type        = string
  description = "ARN of the Secrets Manager secret used during Amplify builds"
}

variable "assets_bucket" {
  type    = string
  default = "clockinclick-school-assets"
}
