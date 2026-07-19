"use client";

import React, {useState, useEffect, useMemo} from "react";
import {
    format,
    startOfWeek,
    endOfWeek,
    addDays,
    isSameDay,
    parseISO,
} from "date-fns";
import DatePicker from "@/components/DatePicker";
import AttendanceTable, { Column } from "@/components/AttendanceTable";
import { cn } from "@/lib/utils";
import DownloadCSVButton from "@/components/DownloadCsvButton";
import {fromZonedTime, toZonedTime} from "date-fns-tz";
import { TIME_ZONE } from "@/utils/attendance";
import { ReportError, ReportMetric, ReportToolbar } from "@/components/ReportChrome";

type BaseUser = {
    userId: string;
    firstName: string;
    lastName: string;
    email?: string;
    userType: string;
};

type AttendanceRecord = {
    userId: string;
    dateTimeStamp: string;
    state: "IN" | "OUT";
};

type UserDayData = {
    day: Date;
    inTimes: string[];
    outTimes: string[];
    status: string;
    tooltip: string;
};

const LOCAL_DATE_STORAGE_KEY = "report-selected-date";

export default function WeeklyReport() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [users, setUsers] = useState<BaseUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Memoize weekStart and weekEnd to avoid rerender loops
    const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate]);
    const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate]);

    // Days of the week
    const daysOfWeek = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
        [weekStart]
    );

    // Roles to report on
    const reportedRoles = useMemo(() => ["learner", "staff", "volunteer"], []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const savedDate = localStorage.getItem(LOCAL_DATE_STORAGE_KEY);
        if (savedDate) {
            const parsed = new Date(savedDate);
            if (!isNaN(parsed.getTime())) {
                setSelectedDate(parsed);
            }
        }
    }, []);

    // Fetch users once
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/users?roles=${reportedRoles.join(',')}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load people.");
                setUsers(data);
            } catch (err) {
                console.error("Error fetching users:", err);
                setError(err instanceof Error ? err.message : "Failed to load people.");
            }
        })();
    }, [reportedRoles]);

    // Fetch attendance when week changes
    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            setError(null);
            try {
                const start = format(weekStart, "yyyy-MM-dd");
                const end = format(weekEnd, "yyyy-MM-dd");
                const res = await fetch(`/api/reports/attendance?start=${start}&end=${end}&userType=${reportedRoles.join(',')}`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load weekly attendance.");
                }

                if (!Array.isArray(data)) {
                    throw new Error("Attendance data could not be read.");
                }
                setRecords(data);
            } catch (err) {
                console.error("Error fetching weekly attendance:", err);
                setRecords([]);
                setError(err instanceof Error ? err.message : "Failed to load weekly attendance.");
            } finally {
                setLoading(false);
            }
        };
        fetchRecords();
    }, [weekStart, weekEnd, reportedRoles]);

    const userDayData = useMemo(() => {
        return users.map((user) => {
            const days: UserDayData[] = daysOfWeek.map((day) => {
                // Ensure `day` is anchored to CST midnight
                const dayCST = toZonedTime(fromZonedTime(day, TIME_ZONE), TIME_ZONE);

                const dayRecords = records.filter((r) => {
                    const recordLocal = toZonedTime(parseISO(r.dateTimeStamp), TIME_ZONE);
                    return r.userId === user.userId && isSameDay(recordLocal, dayCST);
                });

                const inTimes = dayRecords
                    .filter((r) => r.state.toLowerCase() === "in")
                    .map((r) =>
                        format(toZonedTime(parseISO(r.dateTimeStamp), TIME_ZONE), "HH:mm")
                    );

                const outTimes = dayRecords
                    .filter((r) => r.state.toLowerCase() === "out")
                    .map((r) =>
                        format(toZonedTime(parseISO(r.dateTimeStamp), TIME_ZONE), "HH:mm")
                    );

                const status =
                    inTimes.length && outTimes.length
                        ? "Present"
                        : inTimes.length || outTimes.length
                            ? "Partial"
                            : "";

                const tooltip = [
                    inTimes.length ? `IN: ${inTimes.join(", ")}` : null,
                    outTimes.length ? `OUT: ${outTimes.join(", ")}` : null,
                ]
                    .filter(Boolean)
                    .join(" | ");

                return { day, inTimes, outTimes, status, tooltip };
            });

            return { user, days };
        });
    }, [users, records, daysOfWeek]);
    // Columns
    const columns = useMemo<Column<BaseUser>[]>(() => {
        const today = new Date();
        return [
            {
                key: "name",
                label: "Name",
                render: (user: BaseUser) => `${user.firstName} ${user.lastName}`,
                className: "font-medium whitespace-nowrap",
            },
            ...daysOfWeek.map((day, idx) => {
                const isToday = isSameDay(day, today);
                return {
                    key: format(day, "yyyy-MM-dd"),
                    label: format(day, "EEE MM/dd"),
                    render: (user: BaseUser) => {
                        const dayData = userDayData.find((d) => d.user.userId === user.userId)?.days[idx];
                        if (!dayData) return "";

                        return (
                            <span
                                className={cn(
                                    "block text-center font-medium rounded-md px-2 py-1 transition-colors",
                                    dayData.status === "Present"
                                        ? "bg-green-100 text-green-800"
                                        : dayData.status === "Partial"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "text-gray-500",
                                    isToday ? "" : ""
                                )}
                                title={dayData.tooltip || undefined}
                            >
                                {dayData.status || ""}
                            </span>
                        );
                    },
                    className: cn("text-center", isToday ? "bg-blue-50" : ""),
                    headerTitle: isToday ? "Today" : undefined,
                };
            }),
        ];
    }, [daysOfWeek, userDayData]);

    const csvRows = useMemo(() => {
        return userDayData.map(({ user, days }) => [
            `${user.firstName} ${user.lastName}`,
            ...days.map((d) => d.tooltip || d.status || ""),
        ]);
    }, [userDayData]);

    const completeDays = userDayData.flatMap(({ days }) => days).filter(({ status }) => status === "Present").length;
    const partialDays = userDayData.flatMap(({ days }) => days).filter(({ status }) => status === "Partial").length;


    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
                <ReportMetric label="People" value={users.length} detail="Students, staff & volunteers" />
                <ReportMetric label="Complete days" value={completeDays} tone="emerald" />
                <ReportMetric label="Incomplete days" value={partialDays} tone="amber" />
            </div>
            <ReportToolbar>
                <DatePicker selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                <span className="text-sm font-bold text-slate-600">
                    {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
                </span>
                <DownloadCSVButton
                    columns={["Name", ...daysOfWeek.map((d) => format(d, "EEE MM/dd"))]}
                    rows={csvRows}
                    fileName={`WeeklyReport_${format(weekStart, "yyyy-MM-dd")}_to_${format(weekEnd, "yyyy-MM-dd")}.csv`}
                    className="sm:ml-auto"
                    disabled={loading || csvRows.length === 0}
                />
            </ReportToolbar>

            {error && <ReportError message={error} />}

            <AttendanceTable<BaseUser>
                data={users}
                columns={columns}
                loading={loading}
                emptyMessage="No users found."
                getRowKey={(user) => user.userId}
            />
        </div>
    );
}
