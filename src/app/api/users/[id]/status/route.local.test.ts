import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ isAllowedMockClock: vi.fn() }));
vi.mock("@/utils/dynamo", () => ({
  getUserById: vi.fn(), getUserByPin: vi.fn(), updateUserStatus: vi.fn(), logTimeClock: vi.fn(),
}));
vi.mock("@/utils/kioskMock", () => ({
  isLocalKioskMockEnabled: true,
  isAllowedMockClock: mocks.isAllowedMockClock,
}));

import { PATCH } from "./route";

const call = () => PATCH(new NextRequest("http://localhost/api/users/mock-staff/status", {
  method: "PATCH",
  body: JSON.stringify({ status: "In", pin: "1357" }),
  headers: { "content-type": "application/json" },
}), { params: Promise.resolve({ id: "mock-staff" }) });

describe("local kiosk status API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a mock result for an allowed clock action", async () => {
    mocks.isAllowedMockClock.mockReturnValue(true);
    const response = await call();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: "mock-staff", status: "In", mocked: true });
  });

  it("forbids an unrelated local clock action", async () => {
    mocks.isAllowedMockClock.mockReturnValue(false);
    expect((await call()).status).toBe(403);
  });
});
