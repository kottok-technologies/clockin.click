import "@/css/globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import type { Metadata, Viewport } from 'next'
import { Nunito } from "next/font/google";

const nunito = Nunito({
    subsets: ["latin"],
    variable: "--font-nunito",
});

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
    title: {
        default: "Clockin.Click",
        template: "%s · Clockin.Click",
    },
    description: "Attendance, without the interruption.",
    applicationName: "Clockin.Click",
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
        title: "Clockin.Click",
        description: "Attendance, without the interruption.",
        type: "website",
        images: [{ url: "/images/clockin-social.png", width: 1200, height: 630, alt: "Clockin.Click" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Clockin.Click",
        description: "Attendance, without the interruption.",
        images: ["/images/clockin-social.png"],
    },
}

export const viewport: Viewport = {
    themeColor: "#047857",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className={`${nunito.variable} min-h-screen`}>
        <Providers>
            <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <footer className="border-t border-slate-200/70 bg-white px-4 py-4 text-center text-xs font-bold tracking-wide text-slate-400">
                    Powered by <a href="https://www.clockin.click" className="text-slate-600 transition hover:text-emerald-700 hover:underline">Clockin<span className="text-emerald-700">.Click</span></a>
                </footer>
            </div>
        </Providers>
        </body>
        </html>
    );
}
