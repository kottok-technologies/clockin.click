import { NextRequest, NextResponse } from "next/server";
import { getUserByPin } from "@/utils/dynamo";
import { KioskUser } from "@/types/user";
import { getMockKioskUser, isLocalKioskMockEnabled } from "@/utils/kioskMock";

export async function GET(req: NextRequest) {
    const pin = req.nextUrl.searchParams.get("pin");
    if (!pin) return NextResponse.json({ error: "Pin is required" }, { status: 400 });

    if (isLocalKioskMockEnabled) {
        const mockUser = getMockKioskUser(pin);
        return mockUser
            ? NextResponse.json(mockUser)
            : NextResponse.json({ error: "Try demo PIN 2468 or 1357" }, { status: 404 });
    }

    const user = await getUserByPin(pin);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const kioskUser: KioskUser = {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        status: user.status,
        lastClockTransaction: user.lastClockTransaction,
        ...(user.roles.includes("guardian") ? {
            learners: user.learners?.map((learner) => ({
                userId: learner.userId,
                firstName: learner.firstName,
                lastName: learner.lastName,
                status: learner.status,
            })) ?? [],
        } : {}),
    };
    return NextResponse.json(kioskUser);
}
