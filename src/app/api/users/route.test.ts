import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(), getAllUsers: vi.fn(), getUsersByRoles: vi.fn(), getUserByEmail: vi.fn(),
  getUserByPin: vi.fn(), putUser: vi.fn(), getLocalPeople: vi.fn(), getLocalPersonByEmail: vi.fn(),
  getLocalPersonByPin: vi.fn(), putLocalPerson: vi.fn(),
}));
vi.mock("@/utils/apiAuth", () => ({ requireAdminApi: mocks.requireAdminApi }));
vi.mock("@/utils/dynamo", () => ({
  getAllUsers: mocks.getAllUsers, getUsersByRoles: mocks.getUsersByRoles,
  getUserByEmail: mocks.getUserByEmail, getUserByPin: mocks.getUserByPin, putUser: mocks.putUser,
}));
vi.mock("@/utils/localPeopleMock", () => ({
  isLocalPeopleMockEnabled: false, getLocalPeople: mocks.getLocalPeople,
  getLocalPersonByEmail: mocks.getLocalPersonByEmail, getLocalPersonByPin: mocks.getLocalPersonByPin,
  putLocalPerson: mocks.putLocalPerson,
}));

import { GET, POST } from "./route";

const person = { userId: "u1", firstName: "Maya", lastName: "Rivera", pin: "1234", roles: ["learner"] };
const request = (url = "http://localhost/api/users", body?: unknown) => new NextRequest(url, body === undefined ? undefined : {
  method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
});

describe("users collection API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminApi.mockResolvedValue(null);
    mocks.getUserByPin.mockResolvedValue(null);
    mocks.getUserByEmail.mockResolvedValue(null);
  });

  it("returns the authorization response without reading users", async () => {
    mocks.requireAdminApi.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await GET(request())).status).toBe(401);
    expect(mocks.getAllUsers).not.toHaveBeenCalled();
  });

  it("lists all users without exposing PINs", async () => {
    mocks.getAllUsers.mockResolvedValue([person]);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ ...person, pin: "" }]);
  });

  it("normalizes role filters", async () => {
    mocks.getUsersByRoles.mockResolvedValue([person]);
    await GET(request("http://localhost/api/users?roles=Learner,%20STAFF"));
    expect(mocks.getUsersByRoles).toHaveBeenCalledWith(["learner", "staff"]);
  });

  it("returns 500 when listing fails", async () => {
    mocks.getAllUsers.mockRejectedValue(new Error("AWS unavailable"));
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch users" });
  });

  it("requires edit access and required fields", async () => {
    mocks.requireAdminApi.mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await POST(request(undefined, person))).status).toBe(403);
    for (const field of ["userId", "firstName", "lastName", "roles"] as const) {
      const invalid = { ...person, [field]: field === "roles" ? [] : "" };
      expect((await POST(request(undefined, invalid))).status).toBe(400);
    }
  });

  it("returns validation errors", async () => {
    const response = await POST(request(undefined, { ...person, pin: "12" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("PIN must be exactly four digits.");
  });

  it("rejects duplicate PINs and email addresses", async () => {
    mocks.getUserByPin.mockResolvedValueOnce(person);
    expect((await POST(request(undefined, person))).status).toBe(409);
    mocks.getUserByEmail.mockResolvedValueOnce(person);
    expect((await POST(request(undefined, { ...person, pin: "5678", email: "maya@example.com" }))).status).toBe(409);
  });

  it("creates a normalized guardian without returning its PIN", async () => {
    const body = { ...person, roles: [" Guardian "], firstName: " Maya ", pin: "5678", learners: [person] };
    const response = await POST(request(undefined, body));
    expect(response.status).toBe(200);
    expect(mocks.putUser).toHaveBeenCalledWith(expect.objectContaining({ firstName: "Maya", roles: ["guardian"], learners: [person] }));
    expect((await response.json()).user.pin).toBe("");
  });

  it("returns 500 when creation fails", async () => {
    mocks.putUser.mockRejectedValue(new Error("write failed"));
    expect((await POST(request(undefined, person))).status).toBe(500);
  });
});
