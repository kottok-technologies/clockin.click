import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Clockin.Click",
        short_name: "Clockin.Click",
        description: "Attendance, without the interruption.",
        start_url: "/",
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#047857",
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
