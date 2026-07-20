import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ requireAdminApi: vi.fn(), getSchoolSchedule: vi.fn(), putSchoolSchedule: vi.fn() }));
vi.mock("@/utils/apiAuth", () => ({ requireAdminApi: mocks.requireAdminApi }));
vi.mock("@/utils/dynamo", () => ({ getSchoolSchedule: mocks.getSchoolSchedule, putSchoolSchedule: mocks.putSchoolSchedule }));
import { GET, PUT } from "./route";

const schedule = {
  student: { startTime: "08:30", endTime: "15:00" },
  staff: { startTime: "08:00", endTime: "16:00" },
  timeZone: "America/Chicago",
};

describe("schedule settings API", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireAdminApi.mockResolvedValue(null); });

  it("enforces read and edit authorization", async () => {
    mocks.requireAdminApi.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await GET()).status).toBe(401);
    expect((await PUT(new Request("http://localhost", { method: "PUT", body: "{}" }))).status).toBe(401);
  });

  it("loads and saves a valid schedule", async () => {
    mocks.getSchoolSchedule.mockResolvedValue(schedule);
    expect(await (await GET()).json()).toEqual(schedule);
    const response = await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify(schedule) }));
    expect(response.status).toBe(200);
    expect(mocks.putSchoolSchedule).toHaveBeenCalledWith(schedule);
  });

  it.each([
    null,
    { ...schedule, timeZone: "Mars/Olympus" },
    { ...schedule, student: null },
    { ...schedule, student: { startTime: "8:30", endTime: "15:00" } },
    { ...schedule, staff: { startTime: "17:00", endTime: "16:00" } },
  ])("rejects invalid schedules", async (value) => {
    expect((await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify(value) }))).status).toBe(400);
  });

  it("handles read, write, and malformed JSON failures", async () => {
    mocks.getSchoolSchedule.mockRejectedValueOnce(new Error("read"));
    expect((await GET()).status).toBe(500);
    mocks.putSchoolSchedule.mockRejectedValueOnce(new Error("write"));
    expect((await PUT(new Request("http://localhost", { method: "PUT", body: JSON.stringify(schedule) }))).status).toBe(500);
    expect((await PUT(new Request("http://localhost", { method: "PUT", body: "{" }))).status).toBe(500);
  });
});
