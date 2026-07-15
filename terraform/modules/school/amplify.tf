resource "aws_amplify_app" "app" {
  name                 = "${var.project_name}-${var.school_id}"
  repository           = var.repository_url
  access_token         = var.github_access_token
  platform             = "WEB_COMPUTE"
  iam_service_role_arn = aws_iam_role.amplify_build_role.arn
  compute_role_arn     = aws_iam_role.amplify_compute_role.arn
  build_spec           = file("${path.root}/../amplify.yml")

  environment_variables = {
    SCHOOL_NAME   = var.school_id
    SECRET_NAME   = var.secret_name
    ASSETS_BUCKET = var.assets_bucket
  }

  enable_branch_auto_build = true

  tags = {
    client      = var.school_id
    application = var.project_name
  }
}

resource "aws_amplify_branch" "production" {
  app_id            = aws_amplify_app.app.id
  branch_name       = var.repository_branch
  framework         = "Next.js - SSR"
  stage             = "PRODUCTION"
  enable_auto_build = true
}

resource "aws_amplify_domain_association" "school" {
  app_id                = aws_amplify_app.app.id
  domain_name           = "${var.school_id}.clockin.click"
  wait_for_verification = true

  sub_domain {
    branch_name = aws_amplify_branch.production.branch_name
    prefix      = ""
  }
}
