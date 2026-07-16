"use client";

import Link from "next/link";
import LoginButton from "./LoginButton";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { BarChart3, Users } from "lucide-react";

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="relative z-20 flex min-h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6">
            {/* Left side - App name / Logo */}
            <div className="shrink-0">
                <Link href="/" className="inline-flex items-center rounded-lg" aria-label="Clockin.Click home">
                    <Image
                        src={"/images/logo.png"}
                        alt={"School logo"}
                        width={180}
                        height={64}
                        className="h-12 w-auto object-contain"
                        priority
                    />
                </Link>
            </div>

            {/* Center - Navigation links */}
            <div className="ml-auto mr-3 flex items-center gap-1 text-slate-600 sm:mr-6">
                {session && (
                    <>
                        <Link href="/users" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold hover:bg-slate-100 hover:text-slate-900">
                            <Users className="h-4 w-4" /> <span className="hidden md:inline">Users</span>
                        </Link>
                        <Link href="/reports" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold hover:bg-slate-100 hover:text-slate-900">
                            <BarChart3 className="h-4 w-4" /> <span className="hidden md:inline">Reports</span>
                        </Link>
                    </>
                )}
            </div>

            {/* Right side - Login / User */}
            <LoginButton />
        </nav>
    );
}
