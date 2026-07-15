import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/utils/dynamo";
import { requireAdminApi } from "@/utils/apiAuth";

export async function GET(req: NextRequest) {
    const unauthorized = await requireAdminApi("read");
    if (unauthorized) return unauthorized;
    const email = req.nextUrl.searchParams.get("email");
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const user = await getUserByEmail(email);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(user);
}
