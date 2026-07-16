import ScheduleSettingsForm from "@/components/ScheduleSettingsForm";
import requireAdmin from "@/utils/auth";

export default async function SettingsPage() {
    await requireAdmin();

    return (
        <main className="mx-auto max-w-6xl p-5 sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Administration</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">School settings</h1>
            <p className="mb-6 mt-2 text-slate-500">Set the expected day for accurate on-time attendance reporting.</p>
            <ScheduleSettingsForm />
        </main>
    );
}
