"use client";

import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

/** Years offered in the pickers: the current year and the four before it. */
export const selectableYears = (currentYear: number): number[] =>
    Array.from({ length: 5 }, (_, i) => currentYear - i);

interface MonthPickerProps {
    year: number;
    month: number; // 0-indexed, matching Date
    years: number[];
    onChange: (year: number, month: number) => void;
}

export function MonthPicker({ year, month, years, onChange }: MonthPickerProps) {
    return (
        <div className="flex items-center gap-2">
            <Select
                value={String(month)}
                onValueChange={(v) => onChange(year, Number(v))}
            >
                <SelectTrigger className="w-36">
                    <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                    {MONTHS.map((name, idx) => (
                        <SelectItem key={name} value={String(idx)}>
                            {name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <YearPicker year={year} years={years} onChange={(y) => onChange(y, month)} />
        </div>
    );
}

interface YearPickerProps {
    year: number;
    years: number[];
    onChange: (year: number) => void;
}

export function YearPicker({ year, years, onChange }: YearPickerProps) {
    return (
        <Select value={String(year)} onValueChange={(v) => onChange(Number(v))}>
            <SelectTrigger className="w-28">
                <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
                {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                        {y}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
