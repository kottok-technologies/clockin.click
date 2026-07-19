import requireAdmin from "@/utils/auth";
import { getAllUsers } from "@/utils/dynamo";
import AdminUserTable from "@/components/AdminUserTable";
import { withoutPin } from "@/utils/userValidation";
import { getLocalPeople, isLocalPeopleMockEnabled } from "@/utils/localPeopleMock";

export default async function AdminUsersPage() {
    await requireAdmin();
    const users = isLocalPeopleMockEnabled ? await getLocalPeople() : await getAllUsers();

    return (
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Administration</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">People</h1>
            <p className="mb-6 mt-2 text-slate-500">Manage your school community, roles, and family connections.</p>
            <AdminUserTable users={users.map(withoutPin)} />
        </div>
    );
}
