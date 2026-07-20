import { expect, test } from "@playwright/test";

const openPeopleAsDemoAdmin = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore admin" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.getByRole("link", { name: "People" }).click();
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
};

test.describe.serial("admin people management", () => {
  test("creates, edits, archives, and permanently deletes a person", async ({ page }) => {
    await openPeopleAsDemoAdmin(page);

    await page.getByRole("button", { name: "Add person" }).click();
    const editor = page.getByRole("dialog", { name: "Add someone" });
    await editor.getByLabel("First name").fill("Casey");
    await editor.getByLabel("Last name").fill("Tester");
    await editor.getByLabel("Email address (required for administrators)").fill("casey.tester@example.com");
    await editor.getByLabel("New four-digit PIN").fill("4242");
    await editor.getByRole("button", { name: "Student" }).click();
    await editor.getByRole("button", { name: "Staff" }).click();
    await editor.getByRole("button", { name: "Add person" }).click();
    await expect(page.getByRole("status")).toContainText("Casey Tester was added.");

    const search = page.getByPlaceholder("Search by name, email, or role");
    await search.fill("Casey Tester");
    await expect(page.getByText("Casey Tester", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Manage" }).click();
    const profile = page.getByRole("dialog", { name: "Casey Tester" });
    await profile.getByLabel("First name").fill("Cassandra");
    await page.getByRole("dialog", { name: "Cassandra Tester" }).getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Cassandra Tester was updated.");

    await search.fill("Cassandra Tester");
    await page.getByRole("button", { name: "Manage" }).click();
    await page.getByRole("dialog", { name: "Cassandra Tester" }).getByRole("button", { name: "Archive person" }).click();
    await expect(page.getByRole("status")).toContainText("Cassandra Tester was archived.");

    await search.fill("");
    await page.getByRole("button", { name: /^Archived / }).click();
    const archivedRow = page.getByText("Cassandra Tester", { exact: true }).locator("..").locator("..").locator("..");
    await expect(archivedRow).toBeVisible();
    await archivedRow.getByRole("button", { name: "Manage" }).click();
    const archivedProfile = page.getByRole("dialog", { name: "Cassandra Tester" });
    await archivedProfile.getByRole("button", { name: "Delete permanently" }).click();
    await archivedProfile.getByRole("button", { name: "Confirm permanent deletion" }).click();
    await expect(page.getByRole("status")).toContainText("Cassandra Tester was permanently deleted.");
    await expect(page.getByText("Cassandra Tester", { exact: true })).not.toBeVisible();
  });

  test("shows duplicate PIN validation and signs out to the kiosk", async ({ page }) => {
    await openPeopleAsDemoAdmin(page);
    await page.getByRole("button", { name: "Add person" }).click();
    const editor = page.getByRole("dialog", { name: "Add someone" });
    await editor.getByLabel("First name").fill("Duplicate");
    await editor.getByLabel("Last name").fill("Pin");
    await editor.getByLabel("New four-digit PIN").fill("1357");
    await editor.getByRole("button", { name: "Add person" }).click();
    await expect(page.getByRole("status")).toContainText("That PIN is already in use.");

    await editor.getByRole("button", { name: "Close editor" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("http://127.0.0.1:3000/");
    await expect(page.getByRole("heading", { name: "Enter your PIN" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Explore admin" })).toBeVisible();
  });
});
