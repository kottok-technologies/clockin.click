resource "aws_iam_role" "amplify_build_role" {
  name = "${var.project_name}-${var.school_id}-amplify-build"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "amplify.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "amplify_build" {
  name = "build-assets-and-secrets"
  role = aws_iam_role.amplify_build_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = var.secret_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::${var.assets_bucket}/${var.school_id}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:DescribeLogGroups", "logs:PutLogEvents"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role" "amplify_compute_role" {
  name = "${var.project_name}-${var.school_id}-amplify-compute"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "amplify.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "amplify_compute" {
  name = "school-dynamodb-access"
  role = aws_iam_role.amplify_compute_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:BatchGetItem", "dynamodb:DeleteItem", "dynamodb:GetItem",
        "dynamodb:PutItem", "dynamodb:Query", "dynamodb:Scan", "dynamodb:UpdateItem"
      ]
      Resource = [
        "${aws_dynamodb_table.users.arn}*",
        "${aws_dynamodb_table.time_attendance.arn}*",
        "${aws_dynamodb_table.settings.arn}*",
      ]
    }]
  })
}
