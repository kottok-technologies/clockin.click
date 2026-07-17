import { NextResponse } from "next/server";
import { resetDemoData } from "@/utils/demoData";

export async function POST(request: Request) {
    if (process.env.DEMO_MODE !== "true") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const expected = process.env.DEMO_RESET_TOKEN;
    const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!expected || supplied !== expected) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        return NextResponse.json(await resetDemoData());
    } catch (error) {
        console.error("Demo reset failed:", error);
        return NextResponse.json({ error: "Demo reset failed" }, { status: 500 });
    }
}
