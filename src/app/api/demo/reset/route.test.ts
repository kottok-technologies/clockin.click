import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resetDemoData } = vi.hoisted(() => ({ resetDemoData: vi.fn() }));
vi.mock("@/utils/demoData", () => ({ resetDemoData }));
import { POST } from "./route";

const originalDemoMode = process.env.DEMO_MODE;
const originalToken = process.env.DEMO_RESET_TOKEN;
const request = (token?: string) => new Request("http://localhost/api/demo/reset", {
  method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {},
});

describe("demo reset API", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.DEMO_MODE = "true"; process.env.DEMO_RESET_TOKEN = "secret"; });
  afterEach(() => { process.env.DEMO_MODE = originalDemoMode; process.env.DEMO_RESET_TOKEN = originalToken; });

  it("is hidden outside demo mode", async () => {
    process.env.DEMO_MODE = "false";
    expect((await POST(request())).status).toBe(404);
  });

  it("requires a configured matching bearer token", async () => {
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("wrong"))).status).toBe(401);
    delete process.env.DEMO_RESET_TOKEN;
    expect((await POST(request("secret"))).status).toBe(401);
  });

  it("resets demo data for an authorized request", async () => {
    resetDemoData.mockResolvedValue({ reset: true });
    const response = await POST(request("secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reset: true });
  });

  it("returns 500 when reset fails", async () => {
    resetDemoData.mockRejectedValue(new Error("failed"));
    expect((await POST(request("secret"))).status).toBe(500);
  });
});
