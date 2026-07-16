import { KioskUser } from "@/types/user";

export const isLocalKioskMockEnabled =
    process.env.NODE_ENV !== "production" && process.env.LOCAL_KIOSK_MOCK === "true";

const MOCK_USERS: Record<string, KioskUser> = {
    "2468": {
        userId: "mock-guardian",
        firstName: "Jordan",
        lastName: "Rivera",
        roles: ["guardian"],
        learners: [
            { userId: "mock-learner-1", firstName: "Maya", lastName: "Rivera", status: "Out" },
            { userId: "mock-learner-2", firstName: "Theo", lastName: "Rivera", status: "In" },
        ],
    },
    "1357": {
        userId: "mock-staff",
        firstName: "Alex",
        lastName: "Morgan",
        roles: ["staff"],
        status: "Out",
    },
};

export const getMockKioskUser = (pin: string) => MOCK_USERS[pin] ?? null;

export const isAllowedMockClock = (pin: string, userId: string) => {
    const actor = getMockKioskUser(pin);
    if (!actor) return false;
    if (actor.userId === userId) return true;
    return actor.learners?.some((learner) => learner.userId === userId) ?? false;
};
