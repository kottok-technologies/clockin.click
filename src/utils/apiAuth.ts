import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Guard for report API routes.
 *
 * Sign-in already rejects anyone without an admin level (see the signIn
 * callback in authOptions), so holding a session is sufficient here.
 * Returns a 401 response to hand straight back, or null when authorised.
 */
export const requireSession = async (): Promise<NextResponse | null> => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null;
};

export const requireAdminApi = async (
    access: "read" | "edit" = "read"
): Promise<NextResponse | null> => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (access === "edit" && session.user.adminLevel !== "edit") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
};
