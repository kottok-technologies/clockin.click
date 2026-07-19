import { NextResponse } from "next/server";
import {
    queryAttendanceRange,
    batchGetUsersByIds,
    unmarshallTimeAttendance,
    getSchoolSchedule,
} from "@/utils/dynamo";
import { toUtcRange } from "@/utils/attendance";
import { requireSession } from "@/utils/apiAuth";

export async function GET(req: Request) {
    const unauthorized = await requireSession();
    if (unauthorized) return unauthorized;

    try {
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get("date");
        const startParam = searchParams.get("start");
        const endParam = searchParams.get("end");
        const userTypeParam = searchParams.get("userType");

        // --- Determine time range (local dates in, UTC instants out) ---
        const startDate = startParam ?? dateParam;
        const endDate = endParam ?? dateParam;

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "Missing ?date=YYYY-MM-DD or ?start/end range" },
                { status: 400 }
            );
        }

        const { timeZone } = await getSchoolSchedule();
        const { start, end } = toUtcRange(startDate, endDate, timeZone);

        // --- Parse user types (can be comma-separated) ---
        const userTypes = userTypeParam
            ? userTypeParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
            : [];

        if (userTypes.length === 0) {
            return NextResponse.json(
                { error: "Missing or empty userType parameter" },
                { status: 400 }
            );
        }

        const allItems = await queryAttendanceRange(userTypes, start, end);

        if (allItems.length === 0) {
            return NextResponse.json([]);
        }

        // --- Unmarshall + enrich with user data ---
        const records = allItems.map(unmarshallTimeAttendance);
        const userIds = Array.from(
            new Set(records.flatMap((r) => [r.userId, r.clockedBy]))
        );
        const userMap = await batchGetUsersByIds(userIds);

        const enriched = records.map((r) => ({
            ...r,
            user: userMap.get(r.userId) ?? null,
            clockedByUser: userMap.get(r.clockedBy) ?? null,
        }));

        return NextResponse.json(enriched);
    } catch (err) {
        console.error("Error querying attendance:", err);
        const message =
            err instanceof Error ? err.message : "Unknown server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
