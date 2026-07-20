import { describe, expect, it } from "vitest";
import type { User } from "@/types/user";
import { scheduleGroupForUserType } from "@/types/schedule";
import { isGuardian } from "@/types/user";
import { formatAdminLevel, formatFullName, formatLearners, formatRoles } from "./formatters";
import { getMockKioskUser, isAllowedMockClock } from "./kioskMock";

const user = (overrides: Partial<User> = {}) => ({
  userId: "u1", firstName: " Maya ", lastName: "Rivera", pin: "1234", roles: ["learner"], ...overrides,
}) as User;

describe("display formatters", () => {
  it("formats names, roles, learners, and admin access", () => {
    expect(formatFullName(user())).toBe("Maya  Rivera");
    expect(formatRoles(user({ roles: ["staff", "administrator"] }))).toBe("Staff, Administrator");
    expect(formatAdminLevel(user({ adminLevel: "read-only" }))).toBe("Read Only");
    expect(formatAdminLevel(user({ adminLevel: "edit" }))).toBe("Edit");
    expect(formatAdminLevel(user({ adminLevel: "custom" }))).toBe("custom");
    expect(formatLearners(user({ roles: ["guardian"], learners: [user({ firstName: "Theo", lastName: "Rivera" })] }))).toBe("Theo Rivera");
  });

  it("uses placeholders for missing values", () => {
    expect(formatRoles(user({ roles: [] }))).toBe("-");
    expect(formatAdminLevel(user({ adminLevel: null }))).toBe("-");
    expect(formatLearners(user())).toBe("-");
  });
});

describe("role helpers", () => {
  it("classifies schedule groups and guardians", () => {
    expect(scheduleGroupForUserType("LEARNER")).toBe("student");
    expect(scheduleGroupForUserType("staff")).toBe("staff");
    expect(isGuardian(user({ roles: ["guardian"] }))).toBe(true);
    expect(isGuardian(user())).toBe(false);
  });
});

describe("kiosk mock authorization", () => {
  it("finds mock users and limits clock actions to self or linked learners", () => {
    expect(getMockKioskUser("2468")?.firstName).toBe("Jordan");
    expect(getMockKioskUser("0000")).toBeNull();
    expect(isAllowedMockClock("1357", "mock-staff")).toBe(true);
    expect(isAllowedMockClock("2468", "mock-learner-1")).toBe(true);
    expect(isAllowedMockClock("2468", "other")).toBe(false);
    expect(isAllowedMockClock("0000", "other")).toBe(false);
  });
});
