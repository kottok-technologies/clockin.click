import React from "react";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";

export type Column<T> = {
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
    headerTitle?: string;
};

interface AttendanceTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    getRowKey?: (item: T, index: number) => React.Key;
}

export default function AttendanceTable<T>({
    columns,
    data,
    loading = false,
    emptyMessage = "No attendance has been recorded yet.",
    getRowKey,
}: AttendanceTableProps<T>) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column.key} title={column.headerTitle} className={`whitespace-nowrap bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500 ${column.className ?? ""}`}>
                                {column.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={columns.length} className="py-14 text-center font-semibold text-slate-500">Gathering attendance…</TableCell></TableRow>
                    ) : data.length === 0 ? (
                        <TableRow><TableCell colSpan={columns.length} className="py-14 text-center text-slate-500">{emptyMessage}</TableCell></TableRow>
                    ) : data.map((item, index) => (
                        <TableRow key={getRowKey?.(item, index) ?? index} className="hover:bg-slate-50/70">
                            {columns.map((column) => (
                                <TableCell key={column.key} className={column.className ?? "text-center"}>
                                    {column.render ? column.render(item) : String((item as Record<string, unknown>)[column.key] ?? "")}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
