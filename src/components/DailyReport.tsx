"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePicker from "@/components/DatePicker";
import AttendanceTable from "@/components/AttendanceTable";
import DownloadCSVButton from "@/components/DownloadCsvButton";
import { CheckCircle2, ClockAlert, Timer } from "lucide-react";
import { DEFAULT_SCHOOL_SCHEDULE, scheduleGroupForUserType, SchoolSchedule } from "@/types/schedule";
import { ReportError, ReportToolbar } from "@/components/ReportChrome";

type BaseUser = {
    userId: string;
    firstName: string;
    lastName: string;
    email?: string;
};

type AttendanceRecord = {
    user: BaseUser | null;
    clockedBy: BaseUser | null;
    state: string;
    dateTimeStamp: string;
    userType: string;
    clockedByUser: BaseUser | null;
};

const LOCAL_DATE_STORAGE_KEY = "report-selected-date";
const LOCAL_TYPE_STORAGE_KEY = "report-user-type";

export default function DailyReport() {


    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [schedule, setSchedule] = useState<SchoolSchedule>(DEFAULT_SCHOOL_SCHEDULE);
    const [userTypeFilter, setUserTypeFilter] = useState(() => {
        if (typeof window !== "undefined") {
            const savedType = localStorage.getItem(LOCAL_TYPE_STORAGE_KEY);
            if (savedType) {
                return savedType;
            }
        }
        return "staff";
    });

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

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            setError(null);
            try {
                const formattedDate = format(selectedDate, 'yyyy-MM-dd');
                const [attendanceResponse, scheduleResponse] = await Promise.all([
                    fetch(`/api/reports/attendance?date=${formattedDate}&userType=${userTypeFilter}`),
                    fetch("/api/settings/schedule"),
                ]);
                const data = await attendanceResponse.json();
                if (!attendanceResponse.ok) throw new Error(data.error ?? "Failed to load attendance");
                setRecords(data);

                if (scheduleResponse.ok) setSchedule(await scheduleResponse.json());
            } catch (err) {
                console.error('Error fetching attendance:', err);
                setRecords([]);
                setError(err instanceof Error ? err.message : "Failed to load attendance.");
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [selectedDate, userTypeFilter]);

    const filtered = records
        .filter((r) => {
            const q = query.toLowerCase();
            const userName = r.user
                ? `${r.user.firstName} ${r.user.lastName}`.toLowerCase()
                : "";
            const clockedByName = r.clockedBy
                ? `${r.clockedBy.firstName} ${r.clockedBy.lastName}`.toLowerCase()
                : "";
            return userName.includes(q) || clockedByName.includes(q);
        })
        .sort(
            (a, b) =>
                new Date(a.dateTimeStamp).getTime() -
                new Date(b.dateTimeStamp).getTime()
        );

    const dayWindow = schedule[scheduleGroupForUserType(userTypeFilter)];
    const firstArrivalByUser = new Map<string, string>();
    records
        .filter((record) => record.state.toLowerCase() === "in" && record.user?.userId)
        .sort((a, b) => a.dateTimeStamp.localeCompare(b.dateTimeStamp))
        .forEach((record) => {
            const userId = record.user!.userId;
            if (!firstArrivalByUser.has(userId)) {
                firstArrivalByUser.set(
                    userId,
                    new Intl.DateTimeFormat("en-CA", {
                        timeZone: "America/Chicago",
                        hour: "2-digit",
                        minute: "2-digit",
                        hourCycle: "h23",
                    }).format(new Date(record.dateTimeStamp))
                );
            }
        });
    const onTimeCount = [...firstArrivalByUser.values()].filter((time) => time <= dayWindow.startTime).length;
    const lateCount = firstArrivalByUser.size - onTimeCount;
    const lastDepartureByUser = new Map<string, string>();
    records
        .filter((record) => record.state.toLowerCase() === "out" && record.user?.userId)
        .sort((a, b) => a.dateTimeStamp.localeCompare(b.dateTimeStamp))
        .forEach((record) => {
            lastDepartureByUser.set(
                record.user!.userId,
                new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Chicago",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                }).format(new Date(record.dateTimeStamp))
            );
        });
    const onTimeDepartureCount = [...lastDepartureByUser.values()].filter((time) => time >= dayWindow.endTime).length;

    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricChip icon={<CheckCircle2 className="h-5 w-5" />} label="On-time arrivals" value={onTimeCount} tone="emerald" />
                <MetricChip icon={<ClockAlert className="h-5 w-5" />} label="Late arrivals" value={lateCount} tone="amber" />
                <MetricChip icon={<CheckCircle2 className="h-5 w-5" />} label="On-time departures" value={onTimeDepartureCount} tone="emerald" />
                <MetricChip icon={<Timer className="h-5 w-5" />} label="Expected day" value={`${dayWindow.startTime}–${dayWindow.endTime}`} tone="slate" />
            </div>
            <ReportToolbar>
                <div className="flex items-center gap-2">
                    <DatePicker
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                    />
                </div>

                <Select
                    value={userTypeFilter}
                    onValueChange={setUserTypeFilter}
                >
                    <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="learner">Students</SelectItem>
                        <SelectItem value="volunteer">Volunteer</SelectItem>
                    </SelectContent>
                </Select>

                <Input
                    placeholder="Search people..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full sm:w-60"
                />
                <DownloadCSVButton
                    columns={['User', 'State', 'Clocked By', 'DateTimeStamp', 'User Type']}
                    rows={filtered.map((r) => [
                        r.user ? `${r.user.firstName} ${r.user.lastName}` : "(Unknown)",
                        r.state,
                        r.clockedByUser ? `${r.clockedByUser.firstName} ${r.clockedByUser.lastName}` : "(System)",
                        r.dateTimeStamp,
                        userTypeFilter,
                    ])}
                    fileName={`attendance-${format(selectedDate, "yyyy-MM-dd")}.csv`}
                    className="sm:ml-auto"
                    disabled={loading || filtered.length === 0}
                />

            </ReportToolbar>

            {error && <ReportError message={error} />}

                <AttendanceTable
                    data={filtered}
                    loading={loading}
                    columns={[
                        {
                            key: "user",
                            label: "User",
                            render: (r) =>
                                r.user ? `${r.user.firstName} ${r.user.lastName}` : "(Unknown)",
                        },
                        {
                            key: "state",
                            label: "State",
                            render: (r) => (
                                <span
                                    className={`px-2 py-1 rounded font-semibold ${
                                        r.state?.toLowerCase() === "in"
                                            ? "bg-green-50 text-green-900"
                                            : r.state?.toLowerCase() === "out"
                                                ? "bg-red-50 text-red-900"
                                                : "bg-gray-50 text-gray-700"
                                    }`}
                                >
          {r.state}
        </span>
                            ),
                            className: "text-center",
                        },
                        {
                            key: "clockedByUser",
                            label: "Clocked By",
                            render: (r) =>
                                r.clockedByUser
                                    ? `${r.clockedByUser.firstName} ${r.clockedByUser.lastName}`
                                    : "(System)",
                        },
                        {
                            key: "userType",
                            label: "Type",
                            render: () => userTypeFilter,
                            className: "capitalize",
                        },
                        {
                            key: "dateTimeStamp",
                            label: "Timestamp",
                            render: (r) => format(new Date(r.dateTimeStamp), "PPpp"),
                        },
                    ]}
                    emptyMessage="No attendance was recorded for this day and group."
                    getRowKey={(record) => `${record.user?.userId ?? "unknown"}-${record.dateTimeStamp}`}
                />
        </div>
    );
}

function MetricChip({ icon, label, value, tone }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    tone: "emerald" | "amber" | "slate";
}) {
    const tones = {
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
        amber: "border-amber-200 bg-amber-50 text-amber-800",
        slate: "border-slate-200 bg-slate-50 text-slate-700",
    };
    return (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${tones[tone]}`}>
            {icon}
            <div>
                <p className="text-xs font-black uppercase tracking-wider opacity-75">{label}</p>
                <p className="text-xl font-black">{value}</p>
            </div>
        </div>
    );
}
