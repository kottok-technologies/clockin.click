"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";

export default function LoginButton() {
    const { data: session } = useSession();

    if (session) {
        return (
            <div className="flex items-center gap-2">
                <span className="hidden text-sm font-bold text-slate-600 lg:inline">{session.user?.name}</span>
                <button
                    onClick={() => signOut()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                    <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
                </button>
            </div>
        );
    }
    return (
        <button
            onClick={() => signIn("google")}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
           <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Admin sign in</span>
        </button>
    );
}
