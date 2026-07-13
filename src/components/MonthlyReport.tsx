"use client";

import React, { useMemo, useState } from "react";
import { format, parseISO, endOfMonth } from "date-fns";
import AttendanceTable, { Column } from "@/components/AttendanceTable";
import DownloadCSVButton from "@/components/DownloadCsvButton";
import { MonthPicker, selectableYears } from "@/components/PeriodPicker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAttendanceSummary } from "@/hooks/useAttendanceSummary";
import { SummaryRow } from "@/types/attendance";
import { cn } from "@/lib/utils";

const REPORTED_ROLES = ["learner", "staff", "volunteer"];

type Metric = "presence" | "hours";

export default function MonthlyReport() {
    const now = useMemo(() => new Date(), []);
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [metric, setMetric] = useState<Metric>("presence");

    const years = useMemo(() => selectableYears(now.getFullYear()), [now]);

    const { start, end } = useMemo(() => {
        const first = new Date(year, month, 1);
        return {
            start: format(first, "yyyy-MM-dd"),
            end: format(endOfMonth(first), "yyyy-MM-dd"),
        };
    }, [year, month]);

    const { summary, loading, error } = useAttendanceSummary({
        start,
        end,
        userTypes: REPORTED_ROLES,
        granularity: "day",
    });

    // Only days someone actually attended become columns — weekends, holidays and
    // closures drop out on their own, and they are the denominator for the rate.
    const schoolDays = useMemo(() => summary?.schoolDays ?? [], [summary]);
    const rows = useMemo(() => summary?.rows ?? [], [summary]);

    const columns = useMemo<Column<SummaryRow>[]>(() => {
        const cellFor = (row: SummaryRow, day: string) =>
            row.cells.find((c) => c.key === day);

        return [
            {
                key: "name",
                label: "Name",
                render: (row) => `${row.firstName} ${row.lastName}`,
                className: "font-medium whitespace-nowrap",
            },
            ...schoolDays.map((day) => ({
                key: day,
                label: format(parseISO(day), "EEE d"),
                render: (row: SummaryRow) => {
                    const cell = cellFor(row, day);
                    if (!cell || cell.daysPresent === 0) {
                        return <span className="text-gray-400">-</span>;
                    }

                    const incomplete = cell.incompleteDays > 0;
                    const label =
                        metric === "hours"
                            ? incomplete
                                ? "!"
                                : cell.hours.toFixed(2)
                            : incomplete
                                ? "Partial"
                                : "Present";

                    return (
                        <span
                            className={cn(
                                "block text-center font-medium rounded-md px-2 py-1",
                                incomplete
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                            )}
                            title={cell.detail || undefined}
                        >
                            {label}
                        </span>
                    );
                },
                className: "text-center",
            })),
            {
                key: "daysPresent",
                label: "Days Present",
                render: (row) => `${row.totals.daysPresent}/${schoolDays.length}`,
                className: "text-center font-medium whitespace-nowrap",
            },
            {
                key: "hours",
                label: "Hours",
                render: (row) => row.totals.hours.toFixed(2),
                className: "text-center font-medium",
            },
            {
                key: "incomplete",
                label: "Incomplete",
                render: (row) =>
                    row.totals.incompleteDays > 0 ? (
                        <span
                            className="text-yellow-800"
                            title="Days with punches that did not pair IN -> OUT. These count as present but contribute zero hours."
                        >
                            {row.totals.incompleteDays}
                        </span>
                    ) : (
                        <span className="text-gray-400">0</span>
                    ),
                className: "text-center",
            },
        ];
    }, [schoolDays, metric]);

    const csvColumns = [
        "Name",
        "Type",
        ...schoolDays.map((d) => format(parseISO(d), "EEE MM/dd")),
        "Days Present",
        "School Days",
        "Hours",
        "Incomplete Days",
    ];

    const csvRows = rows.map((row) => [
        `${row.firstName} ${row.lastName}`,
        row.userType,
        ...schoolDays.map((day) => {
            const cell = row.cells.find((c) => c.key === day);
            if (!cell || cell.daysPresent === 0) return "";
            if (cell.incompleteDays > 0) return "Incomplete";
            return metric === "hours" ? cell.hours.toFixed(2) : "Present";
        }),
        row.totals.daysPresent,
        schoolDays.length,
        row.totals.hours.toFixed(2),
        row.totals.incompleteDays,
    ]);

    const monthLabel = format(new Date(year, month, 1), "MMMM yyyy");

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <MonthPicker
                    year={year}
                    month={month}
                    years={years}
                    onChange={(y, m) => {
                        setYear(y);
                        setMonth(m);
                    }}
                />

                <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Show" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="presence">Presence</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                </Select>

                <span className="text-gray-600">
                    {monthLabel} &middot; {schoolDays.length} school days
                </span>

                <DownloadCSVButton
                    columns={csvColumns}
                    rows={csvRows}
                    fileName={`MonthlyReport_${format(new Date(year, month, 1), "yyyy-MM")}.csv`}
                    className="flex items-center gap-2 ml-auto"
                />
            </div>

            {error && <p className="text-red-600">{error}</p>}

            <AttendanceTable<SummaryRow>
                data={rows}
                columns={columns}
                loading={loading}
                emptyMessage="No attendance recorded for this month."
            />
        </div>
    );
}
