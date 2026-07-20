import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("valid staff PIN can clock in and sees confirmation", async ({ page }) => {
  await page.getByLabel("Four-digit PIN").fill("1357");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Alex Morgan" })).toBeVisible();
  await expect(page.getByText("Your current status")).toContainText("Out");

  const clockIn = page.getByRole("button", { name: "Clock in" });
  await clockIn.click();
  await expect(clockIn).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Confirm 1 change" }).click();

  await expect(page.getByRole("status")).toHaveText("Attendance updated successfully.");
  await expect(page.getByRole("heading", { name: "Enter your PIN" })).toBeVisible();
});

test("guardian PIN displays linked learners and clocks multiple people", async ({ page }) => {
  await page.getByLabel("Four-digit PIN").fill("2468");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Jordan Rivera" })).toBeVisible();
  await expect(page.getByText("Maya Rivera")).toBeVisible();
  await expect(page.getByText("Theo Rivera")).toBeVisible();

  const mayaRow = page.getByText("Maya Rivera").locator("..").locator("..");
  const theoRow = page.getByText("Theo Rivera").locator("..").locator("..");
  await mayaRow.getByRole("button", { name: "Clock in" }).click();
  await theoRow.getByRole("button", { name: "Clock out" }).click();
  await page.getByRole("button", { name: "Confirm 2 changes" }).click();

  await expect(page.getByRole("status")).toHaveText("Attendance for 2 people updated successfully.");
});

test("incomplete PINs are blocked and invalid PINs show an actionable error", async ({ page }) => {
  const input = page.getByLabel("Four-digit PIN");
  await input.fill("12");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

  await input.fill("0000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("status")).toHaveText("Try demo PIN 2468 or 1357");
});

test("keypad supports correction and starting over", async ({ page }) => {
  for (const digit of [1, 3, 5, 8]) await page.getByRole("button", { name: String(digit), exact: true }).click();
  await page.getByRole("button", { name: "Delete last digit" }).click();
  await page.getByRole("button", { name: "7", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Alex Morgan" })).toBeVisible();

  await page.getByRole("button", { name: "Use a different PIN" }).click();
  await expect(page.getByLabel("Four-digit PIN")).toHaveValue("");
});
