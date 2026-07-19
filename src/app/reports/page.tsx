'use client';

import React, { useState } from 'react';
import {
    BarChart3,
    CalendarDays,
    CalendarRange,
    Table,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DailyReport from "@/components/DailyReport";
import WeeklyReport from "@/components/WeeklyReport";
import MonthlyReport from "@/components/MonthlyReport";
import YearlyReport from "@/components/YearlyReport";

type Tab = 'daily' | 'weekly' | 'monthly' | 'yearly';

const TITLES: Record<Tab, { icon: React.ReactNode; label: string; description: string }> = {
    daily: { icon: <Table className="h-5 w-5" />, label: 'Daily activity', description: 'Review individual arrivals and departures for one day.' },
    weekly: { icon: <BarChart3 className="h-5 w-5" />, label: 'Weekly overview', description: 'Spot complete and incomplete attendance days across the school.' },
    monthly: { icon: <CalendarDays className="h-5 w-5" />, label: 'Monthly detail', description: 'Compare presence or hours for every recorded school day.' },
    yearly: { icon: <CalendarRange className="h-5 w-5" />, label: 'Yearly trends', description: 'See attendance totals and patterns month by month.' },
};

export default function AttendanceReportPage() {
    const [activeTab, setActiveTab] = useState<Tab>('daily');

    return (
        <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
            <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Insights</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Attendance</h1>
                <p className="mt-2 text-slate-500">Understand attendance patterns across your school community.</p>
            </div>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4 sm:p-6">
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => setActiveTab(v as Tab)}
                        className="w-full"
                    >
                        <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 lg:grid-cols-4">
                            <TabsTrigger value="daily">Daily</TabsTrigger>
                            <TabsTrigger value="weekly">Weekly</TabsTrigger>
                            <TabsTrigger value="monthly">Monthly</TabsTrigger>
                            <TabsTrigger value="yearly">Yearly</TabsTrigger>
                        </TabsList>

                        <div className="mb-5 flex items-start gap-3"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">{TITLES[activeTab].icon}</div><div><h2 className="text-xl font-black text-slate-900">{TITLES[activeTab].label}</h2><p className="mt-1 text-sm text-slate-500">{TITLES[activeTab].description}</p></div></div>

                        <TabsContent value="daily">
                            <DailyReport />
                        </TabsContent>

                        <TabsContent value="weekly">
                            <WeeklyReport />
                        </TabsContent>

                        <TabsContent value="monthly">
                            <MonthlyReport />
                        </TabsContent>

                        <TabsContent value="yearly">
                            <YearlyReport />
                        </TabsContent>
                    </Tabs>
                </div>
            </section>
        </main>
    );
}
