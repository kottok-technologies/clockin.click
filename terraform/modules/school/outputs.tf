output "users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "time_attendance_table_name" {
  value = aws_dynamodb_table.time_attendance.name
}

output "settings_table_name" {
  value = aws_dynamodb_table.settings.name
}

output "amplify_url" {
  value = "https://${var.repository_branch}.${aws_amplify_app.app.default_domain}"
}

output "custom_domain" {
  value = "https://${var.school_id}.clockin.click"
}
