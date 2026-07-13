"use client";

import { useEffect, useState } from "react";
import { Granularity, SummaryResponse } from "@/types/attendance";

interface Params {
    start: string;       // yyyy-MM-dd
    end: string;         // yyyy-MM-dd
    userTypes: string[];
    granularity: Granularity;
}

/** Fetches a rolled-up attendance summary for the monthly and yearly reports. */
export function useAttendanceSummary({ start, end, userTypes, granularity }: Params) {
    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const roles = userTypes.join(",");

    useEffect(() => {
        let cancelled = false;

        const fetchSummary = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(
                    `/api/reports/summary?start=${start}&end=${end}&userType=${roles}&granularity=${granularity}`
                );
                const data = await res.json();

                if (cancelled) return;

                if (!res.ok) {
                    setError(data?.error ?? "Failed to load attendance summary");
                    setSummary(null);
                    return;
                }

                setSummary(data as SummaryResponse);
            } catch (err) {
                if (cancelled) return;
                console.error("Error fetching attendance summary:", err);
                setError("Failed to load attendance summary");
                setSummary(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchSummary();

        // A slow response for a previous period must not overwrite the current one.
        return () => {
            cancelled = true;
        };
    }, [start, end, roles, granularity]);

    return { summary, loading, error };
}
