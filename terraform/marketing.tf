resource "aws_amplify_app" "marketing" {
  name                     = "${var.project_name}-marketing"
  repository               = var.marketing_repository_url
  access_token             = var.github_access_token
  platform                 = "WEB_COMPUTE"
  enable_branch_auto_build = true

  build_spec = <<-YAML
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - nvm use 22
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
  YAML

  tags = {
    application = var.project_name
    site        = "marketing"
  }
}

resource "aws_amplify_branch" "marketing_production" {
  app_id            = aws_amplify_app.marketing.id
  branch_name       = var.marketing_repository_branch
  framework         = "Next.js - SSR"
  stage             = "PRODUCTION"
  enable_auto_build = true
}

resource "aws_amplify_domain_association" "marketing" {
  app_id                = aws_amplify_app.marketing.id
  domain_name           = var.marketing_domain_name
  wait_for_verification = true

  sub_domain {
    branch_name = aws_amplify_branch.marketing_production.branch_name
    prefix      = ""
  }

  sub_domain {
    branch_name = aws_amplify_branch.marketing_production.branch_name
    prefix      = "www"
  }
}
