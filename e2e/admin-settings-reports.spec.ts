import { expect, test, type Page } from "@playwright/test";

const openAdminPage = async (page: Page, destination: "Settings" | "Reports") => {
  if (destination === "Reports") {
    await page.route("**/api/reports/attendance?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.route("**/api/users?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.route("**/api/settings/schedule", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(initialSchedule) }));
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Explore admin" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.getByRole("link", { name: destination }).click();
};

const initialSchedule = {
  student: { startTime: "08:30", endTime: "15:00" },
  staff: { startTime: "08:00", endTime: "16:00" },
  timeZone: "America/Chicago",
};

test("administrator changes attendance windows and school timezone", async ({ page }) => {
  let savedSchedule = structuredClone(initialSchedule);
  await page.route("**/api/settings/schedule", async (route) => {
    if (route.request().method() === "PUT") {
      savedSchedule = route.request().postDataJSON();
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(savedSchedule) });
  });

  await openAdminPage(page, "Settings");
  await expect(page.getByRole("heading", { name: "School settings" })).toBeVisible();
  await page.getByLabel("School time zone").selectOption("America/Los_Angeles");

  const students = page.getByRole("group", { name: "Students" });
  await students.getByLabel("Day starts").fill("09:00");
  await students.getByLabel("Day ends").fill("15:30");
  const staff = page.getByRole("group", { name: "Staff & volunteers" });
  await staff.getByLabel("Day starts").fill("08:15");
  await staff.getByLabel("Day ends").fill("16:30");
  await page.getByRole("button", { name: "Save schedule" }).click();

  await expect(page.getByRole("status")).toHaveText("School settings saved.");
  expect(savedSchedule).toEqual({
    student: { startTime: "09:00", endTime: "15:30" },
    staff: { startTime: "08:15", endTime: "16:30" },
    timeZone: "America/Los_Angeles",
  });
});

test("settings show API load and save errors", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/settings/schedule", async (route) => {
    requests += 1;
    await route.fulfill({
      status: requests === 1 ? 200 : 400,
      contentType: "application/json",
      body: JSON.stringify(requests === 1 ? initialSchedule : { error: "Schedule could not be saved." }),
    });
  });
  await openAdminPage(page, "Settings");
  await page.getByRole("button", { name: "Save schedule" }).click();
  await expect(page.getByRole("status")).toHaveText("Schedule could not be saved.");
});

const summaryFor = (url: string) => {
  const requestUrl = new URL(url);
  const granularity = requestUrl.searchParams.get("granularity") ?? "day";
  const start = requestUrl.searchParams.get("start")!;
  const end = requestUrl.searchParams.get("end")!;
  const periods = granularity === "month"
    ? Array.from({ length: 12 }, (_, index) => {
        const date = new Date(`${start}T00:00:00Z`);
        date.setUTCMonth(date.getUTCMonth() + index);
        return date.toISOString().slice(0, 7);
      })
    : [start];
  const cells = periods.map((key) => ({
    key, daysPresent: 1, hours: 7.5, incompleteDays: 0, detail: "IN: 08:30 | OUT: 16:00 (7.50h)",
  }));
  return {
    granularity, start, end, periods,
    schoolDays: [start],
    rows: [{
      userId: "report-user", firstName: "Maya", lastName: "Rivera", userType: "learner", cells,
      totals: { daysPresent: cells.length, hours: cells.length * 7.5, incompleteDays: 0 },
    }],
  };
};

test("monthly and yearly reports respond to period and school-year controls", async ({ page }) => {
  const requests: URL[] = [];
  await page.route("**/api/reports/summary?**", async (route) => {
    requests.push(new URL(route.request().url()));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(summaryFor(route.request().url())) });
  });

  await openAdminPage(page, "Reports");
  await page.getByRole("tab", { name: "Monthly" }).click();
  await expect(page.getByRole("heading", { name: "Monthly detail" })).toBeVisible();
  await expect(page.getByText("Maya Rivera", { exact: true })).toBeVisible();

  const monthlyPanel = page.getByRole("tabpanel", { name: "Monthly" });
  await monthlyPanel.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "August" }).click();
  await expect.poll(() => requests.at(-1)?.searchParams.get("start")).toMatch(/-08-01$/);

  await page.getByRole("tab", { name: "Yearly" }).click();
  const yearlyPanel = page.getByRole("tabpanel", { name: "Yearly" });
  await expect(page.getByRole("heading", { name: "Yearly trends" })).toBeVisible();
  await yearlyPanel.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "August" }).click();
  await expect(yearlyPanel.getByText(/12 months beginning August/)).toBeVisible();
  await expect.poll(() => requests.at(-1)?.searchParams.get("granularity")).toBe("month");
  await expect.poll(() => requests.at(-1)?.searchParams.get("start")).toMatch(/-08-01$/);
  await expect(page.getByText("Maya Rivera", { exact: true })).toBeVisible();
});

test("reports display empty and server error states", async ({ page }) => {
  let responseMode: "empty" | "error" = "empty";
  await page.route("**/api/reports/summary?**", async (route) => {
    if (responseMode === "error") {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Report service unavailable." }) });
      return;
    }
    const summary = summaryFor(route.request().url());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...summary, schoolDays: [], rows: [] }) });
  });

  await openAdminPage(page, "Reports");
  await page.getByRole("tab", { name: "Monthly" }).click();
  await expect(page.getByText("No attendance recorded for this month.")).toBeVisible();

  responseMode = "error";
  const monthlyPanel = page.getByRole("tabpanel", { name: "Monthly" });
  await monthlyPanel.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "August" }).click();
  await expect(page.getByText("Report service unavailable.")).toBeVisible();
});
