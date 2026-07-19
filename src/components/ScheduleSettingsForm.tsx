"use client";

import { useEffect, useState } from "react";
import { Clock3, Save } from "lucide-react";
import { DEFAULT_SCHOOL_SCHEDULE, SchoolSchedule } from "@/types/schedule";

const TIME_ZONES = [
    ["America/New_York", "Eastern Time"],
    ["America/Chicago", "Central Time"],
    ["America/Denver", "Mountain Time"],
    ["America/Phoenix", "Arizona Time"],
    ["America/Los_Angeles", "Pacific Time"],
    ["America/Anchorage", "Alaska Time"],
    ["Pacific/Honolulu", "Hawaii Time"],
] as const;

export default function ScheduleSettingsForm() {
    const [schedule, setSchedule] = useState<SchoolSchedule>(DEFAULT_SCHOOL_SCHEDULE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/settings/schedule")
            .then(async (response) => {
                const body = await response.json();
                if (!response.ok) throw new Error(body.error ?? "Failed to load schedule");
                setSchedule(body);
            })
            .catch((reason) => setError(reason instanceof Error ? reason.message : "Failed to load schedule"))
            .finally(() => setLoading(false));
    }, []);

    const setTime = (group: "student" | "staff", field: "startTime" | "endTime", value: string) => {
        setSchedule((current) => ({
            ...current,
            [group]: { ...current[group], [field]: value },
        }));
        setMessage("");
        setError("");
    };

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const response = await fetch("/api/settings/schedule", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(schedule),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error ?? "Failed to save schedule");
            setSchedule(body);
            setMessage("School settings saved.");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Failed to save schedule");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="surface-card p-6 text-slate-500">Loading schedule…</div>;

    return (
        <form onSubmit={save} className="surface-card max-w-3xl overflow-hidden">
            <div className="border-b border-slate-100 bg-white px-6 py-5">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <Clock3 className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Daily attendance windows</h2>
                        <p className="text-sm text-slate-500">Set the local time used by attendance and reports.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6 p-6">
                <label className="block rounded-2xl border border-slate-200 p-5 text-sm font-bold text-slate-700">
                    School time zone
                    <select value={schedule.timeZone} onChange={(event) => setSchedule((current) => ({ ...current, timeZone: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-normal">
                        {TIME_ZONES.map(([value, label]) => <option key={value} value={value}>{label} ({value})</option>)}
                    </select>
                    <span className="mt-2 block font-normal text-slate-500">This controls report dates, displayed punch times, and on-time calculations. Existing punches remain stored in UTC.</span>
                </label>
                {(["student", "staff"] as const).map((group) => (
                    <fieldset key={group} className="rounded-2xl border border-slate-200 p-5">
                        <legend className="px-2 text-sm font-black uppercase tracking-wider text-slate-600">
                            {group === "student" ? "Students" : "Staff & volunteers"}
                        </legend>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-bold text-slate-700">
                                Day starts
                                <input type="time" required value={schedule[group].startTime} onChange={(event) => setTime(group, "startTime", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-base" />
                            </label>
                            <label className="text-sm font-bold text-slate-700">
                                Day ends
                                <input type="time" required value={schedule[group].endTime} onChange={(event) => setTime(group, "endTime", event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-base" />
                            </label>
                        </div>
                    </fieldset>
                ))}

                {(error || message) && <div role="status" className={`rounded-xl px-4 py-3 text-sm font-bold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</div>}

                <div className="flex justify-end">
                    <button type="submit" disabled={saving} className="primary-action">
                        <Save className="h-5 w-5" /> {saving ? "Saving…" : "Save schedule"}
                    </button>
                </div>
            </div>
        </form>
    );
}
