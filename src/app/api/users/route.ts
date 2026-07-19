import { NextRequest, NextResponse } from "next/server";
import { putUser, getAllUsers, getUsersByRoles, getUserByEmail, getUserByPin } from "@/utils/dynamo";
import { User } from "@/types/user";
import { requireAdminApi } from "@/utils/apiAuth";
import { normalizeUserInput, validateUserInput, withoutPin } from "@/utils/userValidation";
import {
    getLocalPeople,
    getLocalPersonByEmail,
    getLocalPersonByPin,
    isLocalPeopleMockEnabled,
    putLocalPerson,
} from "@/utils/localPeopleMock";

// -------------------- GET: fetch users (with optional filtering) --------------------
export async function GET(req: NextRequest) {
    const unauthorized = await requireAdminApi("read");
    if (unauthorized) return unauthorized;
    try {
        const { searchParams } = new URL(req.url);
        const rolesParam = searchParams.get("roles");
        const roles = rolesParam
            ? rolesParam.split(",").map((r) => r.trim().toLowerCase())
            : [];

        const users: User[] = isLocalPeopleMockEnabled
            ? (await getLocalPeople()).filter((user) => !roles.length || user.roles.some((role) => roles.includes(role)))
            : roles.length
                ? await getUsersByRoles(roles)
                : await getAllUsers();

        return NextResponse.json(users.map(withoutPin));
    } catch (err) {
        console.error("Error fetching users:", err);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}

// -------------------- POST: create a new user --------------------
export async function POST(req: NextRequest) {
    const unauthorized = await requireAdminApi("edit");
    if (unauthorized) return unauthorized;
    try {
        const body = await req.json();

        const requiredFields = ["userId", "firstName", "lastName", "roles"];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json(
                    { error: `${field} is required` },
                    { status: 400 }
                );
            }
        }

        const normalized = normalizeUserInput(body);
        const validationErrors = validateUserInput(normalized, { requirePin: true });
        if (validationErrors.length) {
            return NextResponse.json({ error: validationErrors[0], errors: validationErrors }, { status: 400 });
        }

        const existingPin = normalized.pin
            ? await (isLocalPeopleMockEnabled ? getLocalPersonByPin(normalized.pin) : getUserByPin(normalized.pin))
            : null;
        if (existingPin) {
            return NextResponse.json({ error: "That PIN is already in use." }, { status: 409 });
        }
        const existingEmail = normalized.email
            ? await (isLocalPeopleMockEnabled ? getLocalPersonByEmail(normalized.email) : getUserByEmail(normalized.email))
            : null;
        if (existingEmail) {
            return NextResponse.json({ error: "That email address is already in use." }, { status: 409 });
        }

        const isGuardian = normalized.roles.includes("guardian");

        const newUser: User = {
            userId: body.userId,
            firstName: normalized.firstName,
            lastName: normalized.lastName,
            roles: normalized.roles,
            email: normalized.email,
            pin: normalized.pin ?? "",
            status: body.status,
            lastClockTransaction: body.lastClockTransaction,
            adminLevel: normalized.adminLevel,
            archived: false,
            ...(isGuardian ? { learners: normalized.learners || [] } : {}),
        };

        await (isLocalPeopleMockEnabled ? putLocalPerson(newUser) : putUser(newUser));
        return NextResponse.json({ success: true, user: withoutPin(newUser) });
    } catch (err) {
        console.error("Error creating user:", err);
        return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
        );
    }
}
