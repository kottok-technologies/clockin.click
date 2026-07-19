import { format, parseISO } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type {
    TimeAttendanceRecord,
    DayStat,
    PeriodCell,
    SummaryRow,
    Granularity,
} from "@/types/attendance";
import type { User } from "@/types/user";

export const TIME_ZONE = "America/Chicago";

/** Local (school timezone) calendar day of an ISO instant, as yyyy-MM-dd. */
export const localDayKey = (isoTimestamp: string, timeZone = TIME_ZONE): string =>
    format(toZonedTime(parseISO(isoTimestamp), timeZone), "yyyy-MM-dd");

/** Local wall-clock time of an ISO instant, as HH:mm. */
export const localTime = (isoTimestamp: string, timeZone = TIME_ZONE): string =>
    format(toZonedTime(parseISO(isoTimestamp), timeZone), "HH:mm");

/** UTC instants bounding a local-time date range, inclusive of the whole end day. */
export const toUtcRange = (startDate: string, endDate: string, timeZone = TIME_ZONE) => ({
    start: fromZonedTime(`${startDate}T00:00:00`, timeZone).toISOString(),
    end: fromZonedTime(`${endDate}T23:59:59.999`, timeZone).toISOString(),
});

/**
 * Every yyyy-MM partition between two UTC instants, inclusive.
 *
 * Rows are partitioned by the UTC month of the punch, not the local month, so a
 * late-evening local punch on the last of the month lands in the next month's
 * partition. Deriving this from the UTC bounds is what picks that partition up.
 */
export const enumerateMonths = (startIso: string, endIso: string): string[] => {
    const months: string[] = [];
    const end = endIso.slice(0, 7);

    const cursor = new Date(`${startIso.slice(0, 7)}-01T00:00:00Z`);
    let key = cursor.toISOString().slice(0, 7);

    while (key <= end) {
        months.push(key);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        key = cursor.toISOString().slice(0, 7);
    }

    return months;
};

/**
 * The report's column keys: every yyyy-MM-dd between two local dates when
 * granularity is "day", every yyyy-MM when "month". Both bounds inclusive.
 */
export const enumeratePeriods = (
    startDate: string,
    endDate: string,
    granularity: Granularity
): string[] => {
    if (granularity === "month") {
        return enumerateMonths(`${startDate}T00:00:00Z`, `${endDate}T00:00:00Z`);
    }

    const periods: string[] = [];
    const cursor = new Date(`${startDate}T00:00:00Z`);
    let key = cursor.toISOString().slice(0, 10);

    while (key <= endDate) {
        periods.push(key);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        key = cursor.toISOString().slice(0, 10);
    }

    return periods;
};

/**
 * Collapse one user's punches for one local day into a single stat.
 *
 * Punches are paired IN -> OUT in timestamp order. A day whose punches don't
 * pair cleanly (missing OUT, doubled IN) yields zero hours and is flagged
 * incomplete: we never invent an end time, so totals stay defensible and the
 * bad data stays visible in the report.
 */
export const buildDayStat = (date: string, dayRecords: TimeAttendanceRecord[], timeZone = TIME_ZONE): DayStat => {
    const sorted = [...dayRecords].sort((a, b) =>
        a.dateTimeStamp.localeCompare(b.dateTimeStamp)
    );

    const inTimes: string[] = [];
    const outTimes: string[] = [];

    let hours = 0;
    let incomplete = false;
    let openedAt: number | null = null;

    for (const record of sorted) {
        const state = record.state.toLowerCase();
        const instant = parseISO(record.dateTimeStamp).getTime();

        if (state === "in") {
            inTimes.push(localTime(record.dateTimeStamp, timeZone));
            if (openedAt !== null) incomplete = true; // IN while already clocked in
            openedAt = instant;
        } else if (state === "out") {
            outTimes.push(localTime(record.dateTimeStamp, timeZone));
            if (openedAt === null) {
                incomplete = true; // OUT with no matching IN
            } else {
                hours += (instant - openedAt) / 3_600_000;
                openedAt = null;
            }
        }
    }

    if (openedAt !== null) incomplete = true; // clocked in, never out

    return {
        date,
        inTimes,
        outTimes,
        hours: incomplete ? 0 : hours,
        incomplete,
        present: inTimes.length > 0 || outTimes.length > 0,
    };
};

/** Group records by userId, then by local day, into day stats. */
export const buildDayStatsByUser = (
    records: TimeAttendanceRecord[],
    timeZone = TIME_ZONE
): Map<string, Map<string, DayStat>> => {
    const byUserDay = new Map<string, Map<string, TimeAttendanceRecord[]>>();

    for (const record of records) {
        const day = localDayKey(record.dateTimeStamp, timeZone);
        const days = byUserDay.get(record.userId) ?? new Map();
        days.set(day, [...(days.get(day) ?? []), record]);
        byUserDay.set(record.userId, days);
    }

    const stats = new Map<string, Map<string, DayStat>>();
    for (const [userId, days] of byUserDay) {
        const userStats = new Map<string, DayStat>();
        for (const [day, dayRecords] of days) {
            userStats.set(day, buildDayStat(day, dayRecords, timeZone));
        }
        stats.set(userId, userStats);
    }

    return stats;
};

/**
 * Days on which anyone at all clocked in. Used as the denominator for
 * attendance rates so closures and holidays fall out on their own, with no
 * school calendar to configure.
 */
export const attendedDays = (records: TimeAttendanceRecord[], timeZone = TIME_ZONE): string[] =>
    [...new Set(records.map((r) => localDayKey(r.dateTimeStamp, timeZone)))].sort();

const punchDetail = (stat: DayStat): string => {
    const times = [
        stat.inTimes.length ? `IN: ${stat.inTimes.join(", ")}` : null,
        stat.outTimes.length ? `OUT: ${stat.outTimes.join(", ")}` : null,
    ]
        .filter(Boolean)
        .join(" | ");

    return `${times}${stat.incomplete ? " (incomplete)" : ` (${stat.hours.toFixed(2)}h)`}`;
};

const roll = (key: string, stats: DayStat[], granularity: Granularity): PeriodCell => {
    const present = stats.filter((s) => s.present);

    return {
        key,
        daysPresent: present.length,
        hours: Number(present.reduce((sum, s) => sum + s.hours, 0).toFixed(2)),
        incompleteDays: present.filter((s) => s.incomplete).length,
        // Punch times are only meaningful on a day cell. Emitting them for a
        // month cell would mean shipping every punch of the year to the client,
        // which is the whole reason this endpoint aggregates server-side.
        detail: granularity === "day" ? present.map(punchDetail).join("\n") : "",
    };
};

/**
 * Build one report row per user: a cell per period plus period totals.
 * `periods` are yyyy-MM-dd keys when granularity is "day", yyyy-MM when "month".
 */
export const buildSummaryRows = (
    users: User[],
    records: TimeAttendanceRecord[],
    periods: string[],
    granularity: Granularity,
    requestedRoles: string[],
    timeZone = TIME_ZONE
): SummaryRow[] => {
    const statsByUser = buildDayStatsByUser(records, timeZone);

    return users.map((user) => {
        const dayStats = statsByUser.get(user.userId) ?? new Map<string, DayStat>();

        const cells = periods.map((period) => {
            const inPeriod = [...dayStats.values()].filter((s) =>
                granularity === "day" ? s.date === period : s.date.startsWith(period)
            );
            return roll(period, inPeriod, granularity);
        });

        return {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            userType:
                user.roles.find((r) => requestedRoles.includes(r.toLowerCase())) ??
                user.roles[0] ??
                "",
            cells,
            totals: {
                daysPresent: cells.reduce((sum, c) => sum + c.daysPresent, 0),
                hours: Number(cells.reduce((sum, c) => sum + c.hours, 0).toFixed(2)),
                incompleteDays: cells.reduce((sum, c) => sum + c.incompleteDays, 0),
            },
        };
    });
};
