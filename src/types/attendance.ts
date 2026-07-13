import { AttributeValue } from "@aws-sdk/client-dynamodb";

export interface RawTimeAttendanceItem {
    UserTypeYearMonth: AttributeValue;
    DateTimeStamp: AttributeValue;
    UserId: AttributeValue;
    State: AttributeValue;
    ClockedBy: AttributeValue;
}

export interface TimeAttendanceRecord {
    userTypeYearMonth: string;
    dateTimeStamp: string;
    userId: string;
    state: string;
    clockedBy: string;
}

/** "day" buckets a monthly report by date; "month" buckets a yearly report by month. */
export type Granularity = "day" | "month";

/** One user's punches for one local calendar day. */
export interface DayStat {
    date: string;        // yyyy-MM-dd, school timezone
    inTimes: string[];   // HH:mm, school timezone
    outTimes: string[];
    hours: number;       // 0 when incomplete — unpaired punches are never estimated
    incomplete: boolean; // punches did not pair IN -> OUT cleanly
    present: boolean;    // any punch at all that day
}

/** One user's roll-up for one column of the report. */
export interface PeriodCell {
    key: string;          // yyyy-MM-dd or yyyy-MM, matching granularity
    daysPresent: number;
    hours: number;
    incompleteDays: number;
    detail: string;       // tooltip text
}

export interface SummaryRow {
    userId: string;
    firstName: string;
    lastName: string;
    userType: string;
    cells: PeriodCell[];
    totals: {
        daysPresent: number;
        hours: number;
        incompleteDays: number;
    };
}

export interface SummaryResponse {
    granularity: Granularity;
    start: string;          // yyyy-MM-dd, school timezone
    end: string;
    periods: string[];      // column keys, in order
    /** Days anyone clocked in — the denominator for attendance rates. */
    schoolDays: string[];
    rows: SummaryRow[];
}
