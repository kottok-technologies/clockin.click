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
