// /app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserById, deleteUser, updateUser, getAllUsers } from "@/utils/dynamo";
import {User} from "@/types/user";
import { requireAdminApi } from "@/utils/apiAuth";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const unauthorized = await requireAdminApi("read");
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    const user = await getUserById(id);
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const unauthorized = await requireAdminApi("edit");
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    const body = await req.json();

    try {
        const allowedUpdates: Partial<User> = {};
        if ("firstName" in body) allowedUpdates.firstName = body.firstName;
        if ("lastName" in body) allowedUpdates.lastName = body.lastName;
        if ("pin" in body) allowedUpdates.pin = body.pin;
        if ("email" in body) allowedUpdates.email = body.email;
        if ("adminLevel" in body) allowedUpdates.adminLevel = body.adminLevel;
        if ("roles" in body && Array.isArray(body.roles)) allowedUpdates.roles = body.roles;
        if ("learners" in body && Array.isArray(body.learners)) allowedUpdates.learners = body.learners;

        const updatedUser: User | null = await updateUser(id, allowedUpdates);

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const unauthorized = await requireAdminApi("edit");
    if (unauthorized) return unauthorized;
    const { id } = await context.params;

    try {
        // 1. Get the user to be deleted
        const user = await getUserById(id);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 2. Delete the user
        await deleteUser(id);

        // 3. If the deleted user was a learner, remove references from guardians
        if (user.roles.includes("learner")) {
            // Fetch all guardians
            const allUsers = await getAllUsers(); // implement according to your DB
            const guardians = allUsers.filter(
                (u) => u.roles.includes("guardian") && u.learners?.length
            );

            for (const guardian of guardians) {
                const updatedLearners = (guardian.learners ?? []).filter((l) => l.userId !== id);
                if (updatedLearners.length !== (guardian.learners?.length ?? 0)) {
                    await updateUser(guardian.userId, { learners: updatedLearners });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to delete user:", err);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
