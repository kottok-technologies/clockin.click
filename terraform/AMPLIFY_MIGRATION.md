# App Runner to Amplify migration

This deployment intentionally runs only through `workflow_dispatch`. Merging the
infrastructure changes does not automatically remove the existing App Runner
services.

## Required GitHub production environment settings

- Variable `SCHOOLS`: comma-separated school identifiers, as before.
- Secret `AWS_ROLE_ARN`: GitHub Actions deployment role.
- Secret `AMPLIFY_GITHUB_TOKEN`: fine-grained token with read access to this repository.
- Secret `APP_SECRETS_ARN`: ARN of `clockinclick-app-secrets`.

The deployment role must be able to manage Amplify apps, IAM roles and policies,
DynamoDB tables, and the existing App Runner/ECR resources being retired.

## Cutover

1. Back up the production Terraform state.
2. Run `terraform plan` locally or start the workflow and inspect its plan logs.
3. Confirm every existing DynamoDB table is updated in place, never replaced.
4. Apply during a short maintenance window. Amplify must release the old App
   Runner custom-domain association before claiming the school hostname.
5. Wait for the Amplify build and managed certificate to become available.
6. Test Google sign-in, PIN lookup, clock actions, user administration, and reports.
7. Update the Google OAuth configuration if its allowed callback list does not
   already contain `https://<school>.clockin.click/api/auth/callback/google`.

If the custom domain is still provisioning, use the `schools_amplify_urls`
Terraform output to test the Amplify default domain.
