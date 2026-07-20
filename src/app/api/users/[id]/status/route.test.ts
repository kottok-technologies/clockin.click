import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(), getUserByPin: vi.fn(), updateUserStatus: vi.fn(), logTimeClock: vi.fn(),
  isAllowedMockClock: vi.fn(),
}));
vi.mock("@/utils/dynamo", () => ({
  getUserById: mocks.getUserById, getUserByPin: mocks.getUserByPin,
  updateUserStatus: mocks.updateUserStatus, logTimeClock: mocks.logTimeClock,
}));
vi.mock("@/utils/kioskMock", () => ({ isLocalKioskMockEnabled: false, isAllowedMockClock: mocks.isAllowedMockClock }));

import { PATCH } from "./route";

const call = (body: unknown, id = "target") => PATCH(new NextRequest(`http://localhost/api/users/${id}/status`, {
  method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" },
}), { params: Promise.resolve({ id }) });
const user = (overrides: Record<string, unknown> = {}) => ({
  userId: "actor", firstName: "A", lastName: "User", pin: "1234", roles: ["staff"], archived: false, ...overrides,
});

describe("kiosk status API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateUserStatus.mockResolvedValue({ userId: "target", status: "In" });
  });

  it("validates status and PIN", async () => {
    expect((await call({ status: "Away", pin: "1234" })).status).toBe(400);
    expect((await call({ status: "In", pin: "12" })).status).toBe(401);
    expect((await call({ status: "In", pin: 1234 })).status).toBe(401);
  });

  it("rejects missing and archived actors or targets", async () => {
    mocks.getUserByPin.mockResolvedValue(null);
    mocks.getUserById.mockResolvedValue(user({ userId: "target" }));
    expect((await call({ status: "In", pin: "1234" })).status).toBe(401);
    mocks.getUserByPin.mockResolvedValue(user({ archived: true }));
    expect((await call({ status: "In", pin: "1234" })).status).toBe(401);
  });

  it("allows staff and volunteers to clock themselves", async () => {
    const actor = user();
    mocks.getUserByPin.mockResolvedValue(actor);
    mocks.getUserById.mockResolvedValue(actor);
    const response = await call({ status: "In", pin: "1234" }, "actor");
    expect(response.status).toBe(200);
    expect(mocks.logTimeClock).toHaveBeenCalledWith("actor", "staff", "In", "actor");
  });

  it("allows guardians to clock linked learners", async () => {
    mocks.getUserByPin.mockResolvedValue(user({ roles: ["guardian"], learners: [{ userId: "target" }] }));
    mocks.getUserById.mockResolvedValue(user({ userId: "target", roles: ["learner"] }));
    expect((await call({ status: "Out", pin: "1234" })).status).toBe(200);
    expect(mocks.logTimeClock).toHaveBeenCalledWith("target", "learner", "Out", "actor");
  });

  it("forbids unrelated clock actions", async () => {
    mocks.getUserByPin.mockResolvedValue(user());
    mocks.getUserById.mockResolvedValue(user({ userId: "target" }));
    expect((await call({ status: "In", pin: "1234" })).status).toBe(403);
  });

  it("rejects target roles that cannot use the clock", async () => {
    const actor = user({ userId: "target", roles: ["administrator"] });
    mocks.getUserByPin.mockResolvedValue(actor);
    mocks.getUserById.mockResolvedValue(actor);
    expect((await call({ status: "In", pin: "1234" })).status).toBe(403);

    const guardian = user({ roles: ["guardian"], learners: [{ userId: "target" }] });
    mocks.getUserByPin.mockResolvedValue(guardian);
    mocks.getUserById.mockResolvedValue(user({ userId: "target", roles: ["guardian"] }));
    expect((await call({ status: "In", pin: "1234" })).status).toBe(400);
  });

  it("returns 500 without partially hiding persistence failures", async () => {
    const actor = user();
    mocks.getUserByPin.mockResolvedValue(actor);
    mocks.getUserById.mockResolvedValue(actor);
    mocks.updateUserStatus.mockRejectedValue(new Error("write failed"));
    expect((await call({ status: "In", pin: "1234" }, "actor")).status).toBe(500);
  });
});
