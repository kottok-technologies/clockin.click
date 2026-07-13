import { NextResponse } from "next/server";
import {
    queryAttendanceRange,
    unmarshallTimeAttendance,
    getUsersByRoles,
} from "@/utils/dynamo";
import {
    toUtcRange,
    enumeratePeriods,
    attendedDays,
    buildSummaryRows,
    localDayKey,
} from "@/utils/attendance";
import { requireSession } from "@/utils/apiAuth";
import { Granularity, SummaryResponse } from "@/types/attendance";

/**
 * Aggregated attendance for the monthly and yearly reports.
 *
 * Unlike /api/reports/attendance, which returns raw punches for the client to
 * group, this rolls up server-side: a year of punches across every role is far
 * too much to ship to the browser and aggregate there.
 *
 * GET /api/reports/summary?start=2026-07-01&end=2026-07-31&userType=staff,learner&granularity=day
 */
export async function GET(req: Request) {
    const unauthorized = await requireSession();
    if (unauthorized) return unauthorized;

    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("start");
        const endDate = searchParams.get("end");
        const userTypeParam = searchParams.get("userType");
        const granularityParam = searchParams.get("granularity") ?? "day";

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "Missing ?start=YYYY-MM-DD and ?end=YYYY-MM-DD" },
                { status: 400 }
            );
        }

        if (startDate > endDate) {
            return NextResponse.json(
                { error: "start must not be after end" },
                { status: 400 }
            );
        }

        if (granularityParam !== "day" && granularityParam !== "month") {
            return NextResponse.json(
                { error: "granularity must be 'day' or 'month'" },
                { status: 400 }
            );
        }
        const granularity: Granularity = granularityParam;

        const userTypes = userTypeParam
            ? userTypeParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
            : [];

        if (userTypes.length === 0) {
            return NextResponse.json(
                { error: "Missing or empty userType parameter" },
                { status: 400 }
            );
        }

        const { start, end } = toUtcRange(startDate, endDate);

        const [items, users] = await Promise.all([
            queryAttendanceRange(userTypes, start, end),
            getUsersByRoles(userTypes),
        ]);

        // Punches are partitioned by UTC month, so the query can return rows that
        // fall outside the requested range once resolved to the school timezone.
        const periods = enumeratePeriods(startDate, endDate, granularity);
        const records = items.map(unmarshallTimeAttendance).filter((r) => {
            const day = localDayKey(r.dateTimeStamp);
            return day >= startDate && day <= endDate;
        });

        const rows = buildSummaryRows(users, records, periods, granularity, userTypes).sort(
            (a, b) =>
                a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
        );

        const response: SummaryResponse = {
            granularity,
            start: startDate,
            end: endDate,
            periods,
            schoolDays: attendedDays(records),
            rows,
        };

        return NextResponse.json(response);
    } catch (err) {
        console.error("Error building attendance summary:", err);
        const message = err instanceof Error ? err.message : "Unknown server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
