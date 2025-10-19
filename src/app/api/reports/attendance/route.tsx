import { NextResponse } from "next/server";
import {
    TIME_ATTENDANCE_TABLE,
    queryAllAttendance,
    batchGetUsersByIds,
    unmarshallTimeAttendance,
} from "@/utils/dynamo";
import { RawTimeAttendanceItem } from "@/types/attendance";
import {fromZonedTime, toZonedTime} from "date-fns-tz";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get("date");
        const startParam = searchParams.get("start");
        const endParam = searchParams.get("end");
        const userTypeParam = searchParams.get("userType");
        const timeZone = "America/Chicago";

        // --- Determine time range ---
        let start: string, end: string;
        if (startParam && endParam) {
            // Convert CST inputs to UTC
            const localStartIso = `${startParam}T00:00:00`;
            const localEndIso = `${endParam}T23:59:59.999`;

            // Convert local (CST/CDT) times into UTC instants
            const startUtcDate = fromZonedTime(localStartIso, timeZone);
            const endUtcDate = fromZonedTime(localEndIso, timeZone);

            start = startUtcDate.toISOString();
            end = endUtcDate.toISOString();
        } else if (dateParam) {
            // Single day query
            const localStartIso = `${dateParam}T00:00:00`;
            const localEndIso = `${dateParam}T23:59:59.999`;

            // Convert local (CST/CDT) times into UTC instants
            const startUtcDate = fromZonedTime(localStartIso, timeZone);
            const endUtcDate = fromZonedTime(localEndIso, timeZone);

            start = startUtcDate.toISOString();
            end = endUtcDate.toISOString();
        } else {
            return NextResponse.json(
                { error: "Missing ?date=YYYY-MM-DD or ?start/end range" },
                { status: 400 }
            );
        }

        // --- Parse user types (can be comma-separated) ---
        const userTypes = userTypeParam
            ? userTypeParam.split(",").map((t) => t.trim().toLowerCase())
            : [];

        if (userTypes.length === 0) {
            return NextResponse.json(
                { error: "Missing or empty userType parameter" },
                { status: 400 }
            );
        }

        // --- Build list of months in range ---
        const months: string[] = [];
        const startMonth = start.slice(0, 7);
        const endMonth = end.slice(0, 7);
        months.push(startMonth);
        if (endMonth !== startMonth) months.push(endMonth);

        const allItems: RawTimeAttendanceItem[] = [];

        // --- Query for all user types and months ---
        for (const userType of userTypes) {
            for (const month of months) {
                const userTypeYearMonth = `${userType}#${month}`;
                const params = {
                    TableName: TIME_ATTENDANCE_TABLE,
                    KeyConditionExpression:
                        "#utym = :utym AND #ts BETWEEN :start AND :end",
                    ExpressionAttributeNames: {
                        "#utym": "UserTypeYearMonth",
                        "#ts": "DateTimeStamp",
                    },
                    ExpressionAttributeValues: {
                        ":utym": { S: userTypeYearMonth },
                        ":start": { S: start },
                        ":end": { S: end },
                    },
                };

                const items = await queryAllAttendance<RawTimeAttendanceItem>(params);
                allItems.push(...items);
            }
        }

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
