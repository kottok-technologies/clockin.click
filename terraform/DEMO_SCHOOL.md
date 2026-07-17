# Demo school

Terraform always provisions a `Demo` tenant in addition to the schools supplied through the `SCHOOLS` repository variable. Its public URL is `https://demo.clockin.click`.

The demo tenant enables a one-click administrator session and displays sample kiosk PINs. These behaviors are gated by build-time `DEMO_MODE`; customer tenants continue to use Google authentication.

## Reset configuration

Generate a long random value and store the same value in both locations:

1. Add `DEMO_RESET_TOKEN` to the JSON object in the `clockinclick-app-secrets` AWS Secrets Manager secret.
2. Add `DEMO_RESET_TOKEN` to the GitHub `Prod` environment used by this repository.

The `Reset demo school` workflow calls the demo-only reset endpoint every day at 08:00 UTC and can also be run manually. Run it manually once after the first infrastructure deployment to create the fictional users, attendance history, and default schedules.

The endpoint returns 404 outside the demo tenant and requires the reset token on the demo tenant. It deletes and recreates data only in tables derived from `SCHOOL_NAME=Demo`.
