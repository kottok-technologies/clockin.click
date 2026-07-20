import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession } = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock("next-auth/next", () => ({ getServerSession }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

import { requireAdminApi, requireSession } from "./apiAuth";

describe("API authorization guards", () => {
  beforeEach(() => getServerSession.mockReset());

  it("requires a signed-in user for protected reports", async () => {
    getServerSession.mockResolvedValue(null);
    const response = await requireSession();
    expect(response?.status).toBe(401);
    expect(await response?.json()).toEqual({ error: "Unauthorized" });
  });

  it("allows a signed-in report user", async () => {
    getServerSession.mockResolvedValue({ user: { email: "admin@example.com" } });
    expect(await requireSession()).toBeNull();
  });

  it("rejects non-admin users", async () => {
    getServerSession.mockResolvedValue({ user: { isAdmin: false } });
    expect((await requireAdminApi())?.status).toBe(401);
  });

  it("allows read-only admins to read but not edit", async () => {
    getServerSession.mockResolvedValue({ user: { isAdmin: true, adminLevel: "read-only" } });
    expect(await requireAdminApi("read")).toBeNull();
    expect((await requireAdminApi("edit"))?.status).toBe(403);
  });

  it("allows edit-level administrators", async () => {
    getServerSession.mockResolvedValue({ user: { isAdmin: true, adminLevel: "edit" } });
    expect(await requireAdminApi("edit")).toBeNull();
  });
});
