"use client";

import Link from "next/link";
import LoginButton from "./LoginButton";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { BarChart3, Users } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
    const { data: session } = useSession();
    const configuredSchoolLogo = process.env.NEXT_PUBLIC_SCHOOL_LOGO;
    const [showSchoolLogo, setShowSchoolLogo] = useState(Boolean(configuredSchoolLogo));

    return (
        <nav className="relative z-20 flex min-h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6">
            {/* The school owns the primary brand position. Clockin.Click remains
                the quiet platform signature in the footer and browser chrome. */}
            <div className="shrink-0">
                <Link href="/" className="inline-flex items-center rounded-lg" aria-label="School time clock home">
                    {showSchoolLogo && configuredSchoolLogo ? (
                        <Image
                            src={configuredSchoolLogo}
                            alt="School logo"
                            width={200}
                            height={64}
                            className="h-12 w-auto max-w-[11rem] object-contain object-left sm:max-w-[13rem]"
                            onError={() => setShowSchoolLogo(false)}
                            priority
                        />
                    ) : (
                        <span className="inline-flex items-center gap-2.5">
                            <Image
                                src="/images/logo.png"
                                alt=""
                                width={48}
                                height={48}
                                className="h-11 w-11 object-contain"
                                priority
                            />
                            <span className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                                Clockin<span className="text-emerald-700">.Click</span>
                            </span>
                        </span>
                    )}
                </Link>
            </div>

            {/* Center - Navigation links */}
            <div className="ml-auto mr-3 flex items-center gap-1 text-slate-600 sm:mr-6">
                {session && (
                    <>
                        <Link href="/users" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold hover:bg-slate-100 hover:text-slate-900">
                            <Users className="h-4 w-4" /> <span className="hidden md:inline">People</span>
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
