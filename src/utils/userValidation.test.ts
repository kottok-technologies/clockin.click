import { describe, expect, it } from "vitest";
import type { User } from "@/types/user";
import { normalizeUserInput, validateUserInput, withoutPin } from "./userValidation";

describe("user input", () => {
  it("normalizes names, contact details, roles, and administrator defaults", () => {
    expect(normalizeUserInput({
      firstName: " Maya ", lastName: " Rivera ", email: " MAYA@EXAMPLE.COM ", pin: " 1234 ",
      roles: [" Learner ", "learner", "Administrator"], archived: 1 as unknown as boolean,
    })).toEqual({
      firstName: "Maya", lastName: "Rivera", email: "maya@example.com", pin: "1234",
      roles: ["learner", "administrator"], adminLevel: "read-only", learners: undefined, archived: true,
    });
  });

  it("retains guardian learners and clears role-specific fields", () => {
    const learner = { userId: "u1", firstName: "A", lastName: "B", pin: "1111", roles: ["learner"] };
    expect(normalizeUserInput({ firstName: "G", lastName: "R", roles: ["guardian"], learners: [learner], adminLevel: "edit" }))
      .toMatchObject({ learners: [learner], adminLevel: null });
  });

  it("accepts a valid administrator", () => {
    expect(validateUserInput({ firstName: "A", lastName: "B", roles: ["administrator"], email: "a@b.com", pin: "1234", adminLevel: "edit" }, { requirePin: true })).toEqual([]);
  });

  it("reports all invalid fields", () => {
    expect(validateUserInput({
      firstName: " ", lastName: "", roles: ["administrator", "pirate"], email: "invalid", pin: "12",
      adminLevel: "owner", learners: [{ firstName: "Missing", lastName: "Id" } as User],
    }, { requirePin: true })).toEqual([
      "First name is required.", "Last name is required.", "One or more roles are invalid.",
      "PIN must be exactly four digits.", "Enter a valid email address.",
      "Select a valid administrator access level.", "One or more learner connections are invalid.",
    ]);
  });

  it("requires a role and administrator email but allows an optional PIN", () => {
    expect(validateUserInput({ firstName: "A", lastName: "B", roles: [] })).toEqual(["Select at least one role."]);
    expect(validateUserInput({ firstName: "A", lastName: "B", roles: ["administrator"], adminLevel: "read-only" }))
      .toEqual(["Administrators need an email address."]);
  });

  it("removes a PIN without mutating the input", () => {
    const user = { userId: "u1", firstName: "A", lastName: "B", roles: ["staff"], pin: "1234" } as User;
    expect(withoutPin(user).pin).toBe("");
    expect(user.pin).toBe("1234");
  });
});
