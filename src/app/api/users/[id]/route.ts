// /app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserById, deleteUser, updateUser, getAllUsers, getUserByEmail, getUserByPin } from "@/utils/dynamo";
import {User} from "@/types/user";
import { requireAdminApi } from "@/utils/apiAuth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { normalizeUserInput, validateUserInput, withoutPin } from "@/utils/userValidation";
import {
    deleteLocalPerson,
    getLocalPeople,
    getLocalPerson,
    getLocalPersonByEmail,
    getLocalPersonByPin,
    isLocalPeopleMockEnabled,
    updateLocalPerson,
} from "@/utils/localPeopleMock";

const listPeople = () => isLocalPeopleMockEnabled ? getLocalPeople() : getAllUsers();
const findPerson = (id: string) => isLocalPeopleMockEnabled ? getLocalPerson(id) : getUserById(id);

const isEditAdministrator = (user: User) =>
    !user.archived && user.roles.includes("administrator") && user.adminLevel === "edit";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const unauthorized = await requireAdminApi("read");
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    const user = await findPerson(id);
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(withoutPin(user));
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const unauthorized = await requireAdminApi("edit");
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    const body = await req.json();

    try {
        const currentUser = await findPerson(id);
        if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const normalized = normalizeUserInput({
            ...currentUser,
            ...body,
            roles: Array.isArray(body.roles) ? body.roles : currentUser.roles,
        });
        const validationErrors = validateUserInput(normalized, { requirePin: false });
        if (validationErrors.length) {
            return NextResponse.json({ error: validationErrors[0], errors: validationErrors }, { status: 400 });
        }

        if (body.pin) {
            const duplicate = await (isLocalPeopleMockEnabled ? getLocalPersonByPin(normalized.pin ?? "") : getUserByPin(normalized.pin ?? ""));
            if (duplicate && duplicate.userId !== id) {
                return NextResponse.json({ error: "That PIN is already in use." }, { status: 409 });
            }
        }
        if (normalized.email) {
            const duplicate = await (isLocalPeopleMockEnabled ? getLocalPersonByEmail(normalized.email) : getUserByEmail(normalized.email));
            if (duplicate && duplicate.userId !== id) {
                return NextResponse.json({ error: "That email address is already in use." }, { status: 409 });
            }
        }

        const session = await getServerSession(authOptions);
        const removesEditAccess = isEditAdministrator(currentUser) &&
            (normalized.archived || !normalized.roles.includes("administrator") || normalized.adminLevel !== "edit");
        if (removesEditAccess) {
            if (currentUser.email?.toLowerCase() === session?.user?.email?.toLowerCase()) {
                return NextResponse.json({ error: "You cannot remove your own edit access." }, { status: 409 });
            }
            const editAdministrators = (await listPeople()).filter(isEditAdministrator);
            if (editAdministrators.length <= 1) {
                return NextResponse.json({ error: "The school must retain at least one edit-level administrator." }, { status: 409 });
            }
        }

        const allowedUpdates: Partial<User> = {
            firstName: normalized.firstName,
            lastName: normalized.lastName,
            email: normalized.email ?? null,
            adminLevel: normalized.adminLevel,
            roles: normalized.roles,
            archived: normalized.archived,
            learners: normalized.roles.includes("guardian") ? normalized.learners ?? [] : [],
        };
        if (body.pin) allowedUpdates.pin = normalized.pin;

        const updatedUser: User | null = await (isLocalPeopleMockEnabled
            ? updateLocalPerson(id, allowedUpdates)
            : updateUser(id, allowedUpdates));

        return NextResponse.json({ success: true, user: updatedUser ? withoutPin(updatedUser) : null });
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
        const user = await findPerson(id);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const session = await getServerSession(authOptions);
        if (user.email?.toLowerCase() === session?.user?.email?.toLowerCase()) {
            return NextResponse.json({ error: "You cannot delete your own account." }, { status: 409 });
        }
        if (isEditAdministrator(user)) {
            const editAdministrators = (await listPeople()).filter(isEditAdministrator);
            if (editAdministrators.length <= 1) {
                return NextResponse.json({ error: "The school must retain at least one edit-level administrator." }, { status: 409 });
            }
        }

        // 2. Delete the user
        await (isLocalPeopleMockEnabled ? deleteLocalPerson(id) : deleteUser(id));

        // 3. If the deleted user was a learner, remove references from guardians
        if (user.roles.includes("learner")) {
            // Fetch all guardians
            const allUsers = await listPeople();
            const guardians = allUsers.filter(
                (u) => u.roles.includes("guardian") && u.learners?.length
            );

            for (const guardian of guardians) {
                const updatedLearners = (guardian.learners ?? []).filter((l) => l.userId !== id);
                if (updatedLearners.length !== (guardian.learners?.length ?? 0)) {
                    await (isLocalPeopleMockEnabled
                        ? updateLocalPerson(guardian.userId, { learners: updatedLearners } as Partial<User>)
                        : updateUser(guardian.userId, { learners: updatedLearners }));
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to delete user:", err);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
