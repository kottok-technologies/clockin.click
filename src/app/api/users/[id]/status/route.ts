import { NextRequest, NextResponse } from "next/server";
import {
    getUserById,
    getUserByPin,
    updateUserStatus,
    logTimeClock,
} from "@/utils/dynamo";
import { isAllowedMockClock, isLocalKioskMockEnabled } from "@/utils/kioskMock";

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const { status, pin } = await req.json();

    if (!["In", "Out"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
        return NextResponse.json({ error: "A valid PIN is required" }, { status: 401 });
    }

    if (isLocalKioskMockEnabled) {
        if (!isAllowedMockClock(pin, id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json({ userId: id, status, mocked: true });
    }

    try {
        const [actor, target] = await Promise.all([getUserByPin(pin), getUserById(id)]);
        if (!actor || !target || actor.archived || target.archived) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const canClockSelf = actor.userId === target.userId &&
            actor.roles.some((role) => ["staff", "volunteer"].includes(role.toLowerCase()));
        const canClockLearner = actor.roles.includes("guardian") &&
            actor.learners?.some((learner) => learner.userId === target.userId);
        if (!canClockSelf && !canClockLearner) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const userType = target.roles.find((role) =>
            ["staff", "volunteer", "learner"].includes(role.toLowerCase())
        )?.toLowerCase();
        if (!userType) {
            return NextResponse.json(
                { error: "User cannot use the time clock" },
                { status: 400 }
            );
        }

        const updatedUser = await updateUserStatus(id, status);
        await logTimeClock(id, userType, status, actor.userId);
        return NextResponse.json(updatedUser);
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to update status or log timeclock" },
            { status: 500 }
        );
    }
}
