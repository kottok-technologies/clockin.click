import { User } from "@/types/user";

export const USER_ROLES = ["learner", "guardian", "staff", "volunteer", "administrator"] as const;
export const ADMIN_LEVELS = ["read-only", "edit"] as const;

export type UserInput = Pick<User, "firstName" | "lastName" | "roles"> &
    Partial<Pick<User, "email" | "pin" | "adminLevel" | "learners" | "archived">>;

export function normalizeUserInput(input: UserInput): UserInput {
    const roles = [...new Set((input.roles ?? []).map((role) => String(role).trim().toLowerCase()))];
    const isAdministrator = roles.includes("administrator");

    return {
        ...input,
        firstName: String(input.firstName ?? "").trim(),
        lastName: String(input.lastName ?? "").trim(),
        email: input.email ? String(input.email).trim().toLowerCase() : undefined,
        pin: input.pin ? String(input.pin).trim() : undefined,
        roles,
        adminLevel: isAdministrator ? input.adminLevel ?? "read-only" : null,
        learners: roles.includes("guardian") ? input.learners ?? [] : undefined,
        archived: Boolean(input.archived),
    };
}

export function validateUserInput(input: UserInput, options: { requirePin?: boolean } = {}): string[] {
    const errors: string[] = [];
    if (!input.firstName?.trim()) errors.push("First name is required.");
    if (!input.lastName?.trim()) errors.push("Last name is required.");
    if (!input.roles?.length) errors.push("Select at least one role.");
    if (input.roles?.some((role) => !USER_ROLES.includes(role as typeof USER_ROLES[number]))) {
        errors.push("One or more roles are invalid.");
    }
    if ((options.requirePin || input.pin) && !/^\d{4}$/.test(input.pin ?? "")) {
        errors.push("PIN must be exactly four digits.");
    }
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        errors.push("Enter a valid email address.");
    }
    if (input.roles?.includes("administrator")) {
        if (!input.email) errors.push("Administrators need an email address.");
        if (!ADMIN_LEVELS.includes(input.adminLevel as typeof ADMIN_LEVELS[number])) {
            errors.push("Select a valid administrator access level.");
        }
    }
    if (input.learners?.some((learner) => !learner.userId)) {
        errors.push("One or more learner connections are invalid.");
    }
    return errors;
}

export function withoutPin(user: User): User {
    return { ...user, pin: "" };
}
