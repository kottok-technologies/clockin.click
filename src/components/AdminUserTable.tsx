"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
    Archive,
    Check,
    KeyRound,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    ShieldCheck,
    UserRound,
    UsersRound,
    X,
} from "lucide-react";
import { User } from "@/types/user";
import { formatFullName } from "@/utils/formatters";
import { ADMIN_LEVELS, USER_ROLES } from "@/utils/userValidation";

interface Props {
    users: User[];
}

type View = "all" | "learners" | "families" | "staff" | "administrators" | "archived";

const views: Array<{ id: View; label: string }> = [
    { id: "all", label: "Everyone" },
    { id: "learners", label: "Students" },
    { id: "families", label: "Families" },
    { id: "staff", label: "Staff & volunteers" },
    { id: "administrators", label: "Administrators" },
    { id: "archived", label: "Archived" },
];

const roleLabels: Record<string, string> = {
    learner: "Student",
    guardian: "Family",
    staff: "Staff",
    volunteer: "Volunteer",
    administrator: "Administrator",
};

const emptyUser = (): User => ({
    userId: crypto.randomUUID(),
    firstName: "",
    lastName: "",
    email: "",
    pin: "",
    roles: ["learner"],
    adminLevel: null,
    archived: false,
});

const matchesView = (user: User, view: View) => {
    if (view === "archived") return Boolean(user.archived);
    if (user.archived) return false;
    if (view === "all") return true;
    if (view === "learners") return user.roles.includes("learner");
    if (view === "families") return user.roles.includes("guardian");
    if (view === "staff") return user.roles.some((role) => role === "staff" || role === "volunteer");
    return user.roles.includes("administrator");
};

const generatePin = () => String(Math.floor(1000 + Math.random() * 9000));

export default function AdminUserTable({ users }: Props) {
    const { data: session } = useSession();
    const canEdit = session?.user.adminLevel === "edit";
    const [people, setPeople] = useState(users);
    const [view, setView] = useState<View>("all");
    const [query, setQuery] = useState("");
    const [editing, setEditing] = useState<User | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const counts = useMemo(() => Object.fromEntries(
        views.map(({ id }) => [id, people.filter((person) => matchesView(person, id)).length]),
    ), [people]);

    const visiblePeople = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return people
            .filter((person) => matchesView(person, view))
            .filter((person) => !normalizedQuery ||
                formatFullName(person).toLowerCase().includes(normalizedQuery) ||
                person.email?.toLowerCase().includes(normalizedQuery) ||
                person.roles.some((role) => roleLabels[role]?.toLowerCase().includes(normalizedQuery)))
            .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
    }, [people, query, view]);

    const openNewPerson = () => {
        setIsNew(true);
        setEditing(emptyUser());
        setNotice(null);
    };

    const openPerson = (person: User) => {
        setIsNew(false);
        setEditing({ ...person, pin: "", learners: person.learners ? [...person.learners] : undefined } as User);
        setNotice(null);
    };

    const updateEditing = (updates: Partial<User>) => {
        setEditing((current) => current ? ({ ...current, ...updates } as User) : current);
    };

    const toggleRole = (role: string) => {
        if (!editing) return;
        const roles = editing.roles.includes(role)
            ? editing.roles.filter((currentRole) => currentRole !== role)
            : [...editing.roles, role];
        updateEditing({
            roles,
            adminLevel: roles.includes("administrator") ? editing.adminLevel ?? "read-only" : null,
            learners: roles.includes("guardian") ? editing.learners ?? [] : undefined,
        } as Partial<User>);
    };

    const toggleLearner = (learner: User) => {
        if (!editing || !editing.roles.includes("guardian")) return;
        const learners = editing.learners ?? [];
        const connected = learners.some(({ userId }) => userId === learner.userId);
        updateEditing({
            learners: connected
                ? learners.filter(({ userId }) => userId !== learner.userId)
                : [...learners, learner],
        } as Partial<User>);
    };

    const savePerson = async (event: FormEvent) => {
        event.preventDefault();
        if (!editing) return;
        setSaving(true);
        setNotice(null);
        try {
            const response = await fetch(isNew ? "/api/users" : `/api/users/${editing.userId}`, {
                method: isNew ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editing),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unable to save this person.");
            setPeople((current) => current.some(({ userId }) => userId === result.user.userId)
                ? current.map((person) => person.userId === result.user.userId ? result.user : person)
                : [...current, result.user]);
            setEditing(null);
            setNotice({ type: "success", text: `${formatFullName(result.user)} was ${isNew ? "added" : "updated"}.` });
        } catch (error) {
            setNotice({ type: "error", text: error instanceof Error ? error.message : "Unable to save this person." });
        } finally {
            setSaving(false);
        }
    };

    const setArchived = async (person: User, archived: boolean) => {
        setNotice(null);
        try {
            const response = await fetch(`/api/users/${person.userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ archived }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unable to update this person.");
            setPeople((current) => current.map((item) => item.userId === person.userId ? result.user : item));
            setEditing(null);
            setNotice({ type: "success", text: `${formatFullName(person)} was ${archived ? "archived" : "reactivated"}.` });
        } catch (error) {
            setNotice({ type: "error", text: error instanceof Error ? error.message : "Unable to update this person." });
        }
    };

    return (
        <div>
            {notice && (
                <div role="status" className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                    <span className="flex items-center gap-2"><Check className="h-4 w-4" />{notice.text}</span>
                    <button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative flex-1 lg:max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, or role" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                        </div>
                        {canEdit && <button onClick={openNewPerson} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white transition hover:bg-emerald-800"><Plus className="h-4 w-4" />Add person</button>}
                    </div>
                    <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="People groups">
                        {views.map(({ id, label }) => (
                            <button key={id} onClick={() => setView(id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${view === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                {label} <span className={view === id ? "text-white/65" : "text-slate-400"}>{counts[id]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {visiblePeople.length === 0 ? (
                    <div className="px-6 py-16 text-center"><UsersRound className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-black text-slate-800">No people found</h2><p className="mt-1 text-sm text-slate-500">Try another group or search.</p></div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {visiblePeople.map((person) => (
                            <div key={person.userId} className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><UserRound className="h-5 w-5" /></div>
                                    <div className="min-w-0"><p className="truncate font-black text-slate-900">{formatFullName(person)}</p><p className="truncate text-sm text-slate-500">{person.email || "No email address"}</p></div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {person.roles.map((role) => <span key={role} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{roleLabels[role] ?? role}</span>)}
                                </div>
                                <div className="text-sm text-slate-500">
                                    {person.roles.includes("guardian") ? `${person.learners?.length ?? 0} connected student${person.learners?.length === 1 ? "" : "s"}` : person.roles.includes("administrator") ? `${person.adminLevel === "edit" ? "Full" : "Read-only"} admin access` : person.archived ? "Attendance history retained" : "Active"}
                                </div>
                                {canEdit && <button onClick={() => openPerson(person)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" />Manage</button>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editing && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="person-editor-title" className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
                        <form onSubmit={savePerson}>
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                                <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{isNew ? "New person" : "People profile"}</p><h2 id="person-editor-title" className="text-xl font-black text-slate-900">{isNew ? "Add someone" : formatFullName(editing)}</h2></div>
                                <button type="button" onClick={() => setEditing(null)} aria-label="Close editor" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                            </div>

                            <div className="space-y-8 p-5 sm:p-7">
                                <section>
                                    <h3 className="font-black text-slate-900">Basic information</h3>
                                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                        <label className="text-sm font-bold text-slate-700">First name<input required value={editing.firstName} onChange={(event) => updateEditing({ firstName: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                                        <label className="text-sm font-bold text-slate-700">Last name<input required value={editing.lastName} onChange={(event) => updateEditing({ lastName: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                                        <label className="text-sm font-bold text-slate-700 sm:col-span-2">Email address <span className="font-normal text-slate-400">(required for administrators)</span><input type="email" value={editing.email ?? ""} onChange={(event) => updateEditing({ email: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="font-black text-slate-900">School roles</h3><p className="mt-1 text-sm text-slate-500">Choose every role this person has.</p>
                                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {USER_ROLES.map((role) => {
                                            const selected = editing.roles.includes(role);
                                            return <button key={role} type="button" onClick={() => toggleRole(role)} className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition ${selected ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>{selected && <Check className="mr-1 inline h-4 w-4" />}{roleLabels[role]}</button>;
                                        })}
                                    </div>
                                    {!editing.roles.length && <p className="mt-2 text-sm font-bold text-red-600">Select at least one role.</p>}
                                </section>

                                {editing.roles.includes("administrator") && (
                                    <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                                        <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-indigo-700" /><div className="flex-1"><h3 className="font-black text-indigo-950">Administrator access</h3><p className="mt-1 text-sm text-indigo-800/75">Read-only administrators can view records. Full administrators can change people, settings, and attendance.</p><select value={editing.adminLevel ?? "read-only"} onChange={(event) => updateEditing({ adminLevel: event.target.value })} className="mt-3 min-h-11 w-full rounded-xl border border-indigo-200 bg-white px-3 text-sm font-bold text-slate-800">{ADMIN_LEVELS.map((level) => <option key={level} value={level}>{level === "edit" ? "Full edit access" : "Read-only access"}</option>)}</select></div></div>
                                    </section>
                                )}

                                {editing.roles.includes("guardian") && (
                                    <section>
                                        <h3 className="font-black text-slate-900">Family connections</h3><p className="mt-1 text-sm text-slate-500">Select the students this person may clock in and out.</p>
                                        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                                            {people.filter((person) => !person.archived && person.roles.includes("learner") && person.userId !== editing.userId).map((learner) => {
                                                const selected = editing.learners?.some(({ userId }) => userId === learner.userId);
                                                return <button key={learner.userId} type="button" onClick={() => toggleLearner(learner)} className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-bold ${selected ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50"}`}><span>{formatFullName(learner)}</span>{selected && <Check className="h-4 w-4" />}</button>;
                                            })}
                                        </div>
                                    </section>
                                )}

                                <section className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-start gap-3"><KeyRound className="mt-0.5 h-5 w-5 text-slate-500" /><div className="flex-1"><h3 className="font-black text-slate-900">Kiosk PIN</h3><p className="mt-1 text-sm text-slate-500">{isNew ? "Set a private four-digit PIN." : "The current PIN is hidden. Generate a replacement only when needed."}</p><div className="mt-3 flex gap-2"><input aria-label="New four-digit PIN" inputMode="numeric" maxLength={4} placeholder={isNew ? "4 digits" : "Unchanged"} value={editing.pin} onChange={(event) => updateEditing({ pin: event.target.value.replace(/\D/g, "").slice(0, 4) })} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 font-mono tracking-[0.25em] outline-none focus:border-emerald-600" /><button type="button" onClick={() => updateEditing({ pin: generatePin() })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Generate</button></div></div></div>
                                </section>

                                {!isNew && canEdit && (
                                    <section className="border-t border-slate-200 pt-6">
                                        <h3 className="font-black text-slate-900">Account status</h3><p className="mt-1 text-sm text-slate-500">Archiving removes kiosk access while preserving attendance history.</p>
                                        <button type="button" onClick={() => setArchived(editing, !editing.archived)} className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-black ${editing.archived ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-amber-300 text-amber-800 hover:bg-amber-50"}`}>{editing.archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{editing.archived ? "Reactivate person" : "Archive person"}</button>
                                    </section>
                                )}
                            </div>

                            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur"><button type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700">Cancel</button><button disabled={saving || !editing.firstName.trim() || !editing.lastName.trim() || !editing.roles.length || (isNew && !/^\d{4}$/.test(editing.pin))} className="min-h-11 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{saving ? "Saving…" : isNew ? "Add person" : "Save changes"}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
