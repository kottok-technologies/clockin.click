import { NextResponse } from "next/server";
import { requireAdminApi } from "@/utils/apiAuth";
import { getSchoolSchedule, putSchoolSchedule } from "@/utils/dynamo";
import type { SchoolSchedule } from "@/types/schedule";

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const isValidTimeZone = (timeZone: string) => {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone }).format();
        return true;
    } catch {
        return false;
    }
};

const isValidSchedule = (value: unknown): value is SchoolSchedule => {
    if (!value || typeof value !== "object") return false;
    const schedule = value as SchoolSchedule;
    return typeof schedule.timeZone === "string" && isValidTimeZone(schedule.timeZone) &&
    [schedule.student, schedule.staff].every((window) =>
        Boolean(window) &&
        TIME_PATTERN.test(window.startTime) &&
        TIME_PATTERN.test(window.endTime) &&
        window.startTime < window.endTime
    );
};

export async function GET() {
    const unauthorized = await requireAdminApi("read");
    if (unauthorized) return unauthorized;

    try {
        return NextResponse.json(await getSchoolSchedule());
    } catch (error) {
        console.error("Failed to load school schedule:", error);
        return NextResponse.json({ error: "Failed to load school schedule" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const unauthorized = await requireAdminApi("edit");
    if (unauthorized) return unauthorized;

    try {
        const schedule: unknown = await request.json();
        if (!isValidSchedule(schedule)) {
            return NextResponse.json(
                { error: "Choose a valid time zone and ensure each end time is after its start time." },
                { status: 400 }
            );
        }

        await putSchoolSchedule(schedule);
        return NextResponse.json(schedule);
    } catch (error) {
        console.error("Failed to save school schedule:", error);
        return NextResponse.json({ error: "Failed to save school schedule" }, { status: 500 });
    }
}
