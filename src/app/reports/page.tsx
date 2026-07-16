'use client';

import React, { useState } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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

const TITLES: Record<Tab, { icon: React.ReactNode; label: string }> = {
    daily: { icon: <Table className="w-5 h-5" />, label: 'Daily attendance' },
    weekly: { icon: <BarChart3 className="w-5 h-5" />, label: 'Weekly Summary' },
    monthly: { icon: <CalendarDays className="w-5 h-5" />, label: 'Monthly Summary' },
    yearly: { icon: <CalendarRange className="w-5 h-5" />, label: 'Yearly Summary' },
};

export default function AttendanceReportPage() {
    const [activeTab, setActiveTab] = useState<Tab>('daily');

    return (
        <main className="p-5 sm:p-8 max-w-6xl mx-auto space-y-6">
            <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Insights</p>
                <h1 className="mt-1 text-3xl font-black text-slate-900">Attendance</h1>
                <p className="mt-2 text-slate-500">Understand attendance patterns across your school community.</p>
            </div>
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                            {TITLES[activeTab].icon} {TITLES[activeTab].label}
                        </CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => setActiveTab(v as Tab)}
                        className="w-full"
                    >
                        <TabsList className="mb-4">
                            <TabsTrigger value="daily">Daily</TabsTrigger>
                            <TabsTrigger value="weekly">Weekly</TabsTrigger>
                            <TabsTrigger value="monthly">Monthly</TabsTrigger>
                            <TabsTrigger value="yearly">Yearly</TabsTrigger>
                        </TabsList>

                        <TabsContent value="daily" className="space-y-4">
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
                </CardContent>
            </Card>
        </main>
    );
}
