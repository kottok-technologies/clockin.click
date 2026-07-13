"use client";

import React, { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import AttendanceTable, { Column } from "@/components/AttendanceTable";
import DownloadCSVButton from "@/components/DownloadCsvButton";
import { YearPicker, selectableYears } from "@/components/PeriodPicker";
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

export default function YearlyReport() {
    const now = useMemo(() => new Date(), []);
    const [year, setYear] = useState(now.getFullYear());
    const [metric, setMetric] = useState<Metric>("presence");

    const years = useMemo(() => selectableYears(now.getFullYear()), [now]);

    const { summary, loading, error } = useAttendanceSummary({
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        userTypes: REPORTED_ROLES,
        granularity: "month",
    });

    const rows = useMemo(() => summary?.rows ?? [], [summary]);
    const periods = useMemo(() => summary?.periods ?? [], [summary]);

    /** School days per month — the denominator for that month's attendance. */
    const schoolDaysByMonth = useMemo(() => {
        const counts = new Map<string, number>();
        for (const day of summary?.schoolDays ?? []) {
            const month = day.slice(0, 7);
            counts.set(month, (counts.get(month) ?? 0) + 1);
        }
        return counts;
    }, [summary]);

    const totalSchoolDays = summary?.schoolDays.length ?? 0;

    const columns = useMemo<Column<SummaryRow>[]>(
        () => [
            {
                key: "name",
                label: "Name",
                render: (row) => `${row.firstName} ${row.lastName}`,
                className: "font-medium whitespace-nowrap",
            },
            ...periods.map((month) => ({
                key: month,
                label: format(parseISO(`${month}-01`), "MMM"),
                render: (row: SummaryRow) => {
                    const cell = row.cells.find((c) => c.key === month);
                    const schoolDays = schoolDaysByMonth.get(month) ?? 0;

                    if (!cell || cell.daysPresent === 0) {
                        return <span className="text-gray-400">-</span>;
                    }

                    const tooltip = [
                        `${cell.daysPresent}/${schoolDays} days present`,
                        `${cell.hours.toFixed(2)} hours`,
                        cell.incompleteDays > 0
                            ? `${cell.incompleteDays} incomplete (0 hours counted)`
                            : null,
                    ]
                        .filter(Boolean)
                        .join("\n");

                    return (
                        <span
                            className={cn(
                                "block text-center font-medium rounded-md px-2 py-1",
                                cell.incompleteDays > 0
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                            )}
                            title={tooltip}
                        >
                            {metric === "hours"
                                ? cell.hours.toFixed(1)
                                : `${cell.daysPresent}/${schoolDays}`}
                        </span>
                    );
                },
                className: "text-center",
            })),
            {
                key: "totalDays",
                label: "Days Present",
                render: (row) => `${row.totals.daysPresent}/${totalSchoolDays}`,
                className: "text-center font-medium whitespace-nowrap",
            },
            {
                key: "totalHours",
                label: "Total Hours",
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
        ],
        [periods, schoolDaysByMonth, totalSchoolDays, metric]
    );

    const csvColumns = [
        "Name",
        "Type",
        ...periods.map((m) => format(parseISO(`${m}-01`), "MMM yyyy")),
        "Days Present",
        "School Days",
        "Total Hours",
        "Incomplete Days",
    ];

    const csvRows = rows.map((row) => [
        `${row.firstName} ${row.lastName}`,
        row.userType,
        ...periods.map((month) => {
            const cell = row.cells.find((c) => c.key === month);
            if (!cell) return "";
            return metric === "hours"
                ? cell.hours.toFixed(2)
                : `${cell.daysPresent}/${schoolDaysByMonth.get(month) ?? 0}`;
        }),
        row.totals.daysPresent,
        totalSchoolDays,
        row.totals.hours.toFixed(2),
        row.totals.incompleteDays,
    ]);

    return (
        <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <YearPicker year={year} years={years} onChange={setYear} />

                <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Show" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="presence">Days present</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                </Select>

                <span className="text-gray-600">
                    {year} &middot; {totalSchoolDays} school days
                </span>

                <DownloadCSVButton
                    columns={csvColumns}
                    rows={csvRows}
                    fileName={`YearlyReport_${year}.csv`}
                    className="flex items-center gap-2 ml-auto"
                />
            </div>

            {error && <p className="text-red-600">{error}</p>}

            <AttendanceTable<SummaryRow>
                data={rows}
                columns={columns}
                loading={loading}
                emptyMessage="No attendance recorded for this year."
            />
        </div>
    );
}
