"use client";

import { useState } from "react";
import { ArrowLeft, Check, Clock3, Delete, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { KioskUser } from "@/types/user";
import StatusBadge from "@/components/StatusBadge";

type ClockAction = { userId: string; status: "In" | "Out" };

export default function PinEntry() {
    const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || "Your school";
    const [pin, setPin] = useState("");
    const [user, setUser] = useState<KioskUser | null>(null);
    const [error, setError] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedActions, setSelectedActions] = useState<ClockAction[]>([]);

    const updatePin = (value: string) => {
        setPin(value.replace(/\D/g, "").slice(0, 4));
        setError("");
        setConfirmation("");
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (pin.length !== 4) {
            setError("Enter all four digits to continue.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const response = await fetch(`/api/users/by-pin?pin=${encodeURIComponent(pin)}`);
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "We couldn’t find that PIN. Try again.");
                return;
            }
            setUser(data as KioskUser);
        } catch (err) {
            console.error(err);
            setError("We couldn’t connect. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const startOver = () => {
        setPin("");
        setUser(null);
        setError("");
        setSelectedActions([]);
    };

    const toggleAction = (userId: string, status: "In" | "Out") => {
        setError("");
        setSelectedActions((current) => {
            const existing = current.find((action) => action.userId === userId);
            if (existing?.status === status) return current.filter((action) => action.userId !== userId);
            return [...current.filter((action) => action.userId !== userId), { userId, status }];
        });
    };

    const handleClockSubmit = async () => {
        if (selectedActions.length === 0) {
            setError("Choose Clock in or Clock out for at least one person.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            await Promise.all(selectedActions.map(async ({ userId, status }) => {
                const response = await fetch(`/api/users/${userId}/status`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status, pin }),
                });
                if (!response.ok) throw new Error(`Failed to update ${userId}`);
            }));

            const count = selectedActions.length;
            startOver();
            setConfirmation(`${count === 1 ? "Attendance" : `Attendance for ${count} people`} updated successfully.`);
        } catch (err) {
            console.error(err);
            setError("Nothing was cleared. Please try submitting again.");
        } finally {
            setLoading(false);
        }
    };

    const canClockSelf = user?.roles.some((role) => ["staff", "volunteer"].includes(role.toLowerCase()));
    const isGuardian = user?.roles.some((role) => role.toLowerCase() === "guardian");
    const isSelected = (userId: string, status: "In" | "Out") =>
        selectedActions.some((action) => action.userId === userId && action.status === status);

    return (
        <div className="kiosk-shell min-h-[calc(100vh-5rem)] px-4 py-8 sm:px-6 sm:py-12">
            <div className="mx-auto max-w-3xl">
                {!user ? (
                    <div className="grid items-center gap-8 lg:grid-cols-[1fr_25rem]">
                        <section className="hidden lg:block">
                            <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-emerald-800">{schoolName}</p>
                            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm font-bold text-emerald-800">
                                <ShieldCheck className="h-4 w-4" /> Secure school check-in
                            </div>
                            <h1 className="text-5xl font-black leading-[1.08] tracking-tight text-slate-900">
                                A simple start<br />to the school day.
                            </h1>
                            <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">
                                Enter your family PIN, choose who is arriving or leaving, and you’re done.
                            </p>
                        </section>

                        <form onSubmit={handleSubmit} className="surface-card p-5 sm:p-7">
                            <div className="mb-6 text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                    <Clock3 className="h-6 w-6" />
                                </div>
                                <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 lg:hidden">{schoolName}</p>
                                <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Enter your PIN</h1>
                                <p className="mt-2 text-sm text-slate-500">Use your private 4-digit family or staff PIN.</p>
                            </div>

                            <label htmlFor="pin" className="sr-only">Four-digit PIN</label>
                            <input
                                id="pin"
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                                maxLength={4}
                                value={pin}
                                onChange={(event) => updatePin(event.target.value)}
                                autoFocus
                                className="mb-4 h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 text-center font-mono text-4xl tracking-[0.65em] text-slate-900 caret-emerald-600 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                            />

                            <div className="grid grid-cols-3 gap-2" aria-label="PIN keypad">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                                    <button key={digit} type="button" onClick={() => updatePin(`${pin}${digit}`)} className="keypad-button">
                                        {digit}
                                    </button>
                                ))}
                                <button type="button" onClick={() => updatePin("")} className="keypad-button text-sm font-bold text-slate-500">Clear</button>
                                <button type="button" onClick={() => updatePin(`${pin}0`)} className="keypad-button">0</button>
                                <button type="button" aria-label="Delete last digit" onClick={() => updatePin(pin.slice(0, -1))} className="keypad-button text-slate-500">
                                    <Delete className="h-5 w-5" />
                                </button>
                            </div>

                            {(error || confirmation) && (
                                <div role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                                    {error || confirmation}
                                </div>
                            )}

                            <button type="submit" disabled={loading || pin.length !== 4} className="primary-action mt-4 w-full">
                                {loading ? "Looking up…" : "Continue"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <section className="surface-card overflow-hidden">
                        <header className="border-b border-slate-100 bg-white px-5 py-5 sm:px-8">
                            <button type="button" onClick={startOver} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
                                <ArrowLeft className="h-4 w-4" /> Use a different PIN
                            </button>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Welcome</p>
                                    <h1 className="mt-1 text-3xl font-black text-slate-900">{user.firstName} {user.lastName}</h1>
                                </div>
                                {user.status && <div className="flex items-center gap-2 text-sm text-slate-500">Your current status <StatusBadge status={user.status} /></div>}
                            </div>
                        </header>

                        <div className="space-y-6 p-5 sm:p-8">
                            <p className="text-base text-slate-600">Choose an action for each person who is arriving or leaving.</p>

                            {canClockSelf && (
                                <PersonAction
                                    name={`${user.firstName} ${user.lastName}`}
                                    status={user.status}
                                    selectedIn={isSelected(user.userId, "In")}
                                    selectedOut={isSelected(user.userId, "Out")}
                                    onSelect={(status) => toggleAction(user.userId, status)}
                                />
                            )}

                            {isGuardian && (user.learners?.length ?? 0) > 0 && (
                                <div className="space-y-3">
                                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Your learners</h2>
                                    {user.learners?.map((learner) => (
                                        <PersonAction
                                            key={learner.userId}
                                            name={`${learner.firstName} ${learner.lastName}`}
                                            status={learner.status}
                                            selectedIn={isSelected(learner.userId, "In")}
                                            selectedOut={isSelected(learner.userId, "Out")}
                                            onSelect={(status) => toggleAction(learner.userId, status)}
                                        />
                                    ))}
                                </div>
                            )}

                            {error && <div role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}

                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                                <button type="button" onClick={startOver} className="secondary-action">Cancel</button>
                                <button type="button" onClick={handleClockSubmit} disabled={loading || selectedActions.length === 0} className="primary-action sm:min-w-52">
                                    {loading ? "Updating…" : <><Check className="h-5 w-5" /> Confirm {selectedActions.length || ""} {selectedActions.length === 1 ? "change" : "changes"}</>}
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function PersonAction({ name, status, selectedIn, selectedOut, onSelect }: {
    name: string;
    status?: string;
    selectedIn: boolean;
    selectedOut: boolean;
    onSelect: (status: "In" | "Out") => void;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div className="mb-4 min-w-0 sm:mb-0">
                <p className="truncate text-lg font-black text-slate-900">{name}</p>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">Currently <StatusBadge status={status} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-64">
                <button type="button" aria-pressed={selectedIn} onClick={() => onSelect("In")} className={`clock-choice ${selectedIn ? "clock-choice-in-active" : ""}`}>
                    <LogIn className="h-5 w-5" /> Clock in
                </button>
                <button type="button" aria-pressed={selectedOut} onClick={() => onSelect("Out")} className={`clock-choice ${selectedOut ? "clock-choice-out-active" : ""}`}>
                    <LogOut className="h-5 w-5" /> Clock out
                </button>
            </div>
        </div>
    );
}
