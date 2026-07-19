import { AlertCircle } from "lucide-react";
import React from "react";

export function ReportToolbar({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

export function ReportMetric({ label, value, detail, tone = "slate" }: {
    label: string;
    value: string | number;
    detail?: string;
    tone?: "slate" | "emerald" | "amber";
}) {
    const tones = {
        slate: "border-slate-200 bg-white text-slate-900",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
        amber: "border-amber-200 bg-amber-50 text-amber-950",
    };
    return <div className={`rounded-2xl border p-4 ${tones[tone]}`}><p className="text-xs font-black uppercase tracking-[0.12em] opacity-60">{label}</p><p className="mt-1 text-2xl font-black">{value}</p>{detail && <p className="mt-1 text-xs font-semibold opacity-60">{detail}</p>}</div>;
}

export function ReportError({ message }: { message: string }) {
    return <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>;
}
