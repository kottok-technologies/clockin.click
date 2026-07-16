"use client"; // make it a client component for interactivity (optional)

import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
    const router = useRouter();

    const handleGoBack = () => {
        router.push("/");
    };

    return (
        <div className="kiosk-shell flex min-h-[calc(100vh-9rem)] items-center justify-center p-4 text-center">
            <div className="surface-card w-full max-w-lg p-8 sm:p-10">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><ShieldX className="h-7 w-7" /></div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">Administrator access</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">This account isn’t authorized</h1>
            <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-600">
                Your Google account is working, but it isn’t listed as a Clockin.Click administrator for this school.
            </p>
            <button
                onClick={handleGoBack}
                className="secondary-action mt-7 gap-2"
            >
                <ArrowLeft className="h-4 w-4" /> Return to the time clock
            </button>
            </div>
        </div>
    );
}
