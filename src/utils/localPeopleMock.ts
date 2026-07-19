import { User } from "@/types/user";

export const isLocalPeopleMockEnabled =
    process.env.NODE_ENV !== "production" && process.env.LOCAL_PEOPLE_MOCK === "true";

const seedPeople = (): User[] => {
    const maya: User = { userId: "local-student-maya", firstName: "Maya", lastName: "Rivera", pin: "4821", roles: ["learner"], status: "Out", archived: false };
    const theo: User = { userId: "local-student-theo", firstName: "Theo", lastName: "Rivera", pin: "5932", roles: ["learner"], status: "In", archived: false };
    return [
        maya,
        theo,
        { userId: "local-family-jordan", firstName: "Jordan", lastName: "Rivera", email: "jordan@example.com", pin: "2468", roles: ["guardian"], learners: [maya, theo], archived: false },
        { userId: "local-staff-alex", firstName: "Alex", lastName: "Morgan", email: "alex@example.com", pin: "1357", roles: ["staff"], status: "Out", archived: false },
        { userId: "local-volunteer-sam", firstName: "Sam", lastName: "Patel", email: "sam@example.com", pin: "8642", roles: ["volunteer"], status: "Out", archived: false },
        { userId: "local-admin", firstName: "Demo", lastName: "Administrator", email: "demo@clockin.click", pin: "9090", roles: ["administrator"], adminLevel: "edit", archived: false },
        { userId: "local-archived", firstName: "Taylor", lastName: "Former", email: "taylor@example.com", pin: "7788", roles: ["staff"], archived: true },
    ];
};

const globalStore = globalThis as typeof globalThis & { __clockinClickLocalPeople?: User[] };
globalStore.__clockinClickLocalPeople ??= seedPeople();

export const getLocalPeople = async (): Promise<User[]> => structuredClone(globalStore.__clockinClickLocalPeople ?? []);

export const getLocalPerson = async (userId: string): Promise<User | null> => {
    const person = globalStore.__clockinClickLocalPeople?.find((item) => item.userId === userId);
    return person ? structuredClone(person) : null;
};

export const getLocalPersonByPin = async (pin: string): Promise<User | null> => {
    const person = globalStore.__clockinClickLocalPeople?.find((item) => item.pin === pin);
    return person ? structuredClone(person) : null;
};

export const getLocalPersonByEmail = async (email: string): Promise<User | null> => {
    const person = globalStore.__clockinClickLocalPeople?.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    return person ? structuredClone(person) : null;
};

export const putLocalPerson = async (person: User): Promise<void> => {
    globalStore.__clockinClickLocalPeople = [...(globalStore.__clockinClickLocalPeople ?? []), structuredClone(person)];
};

export const updateLocalPerson = async (userId: string, updates: Partial<User>): Promise<User | null> => {
    const people = globalStore.__clockinClickLocalPeople ?? [];
    const index = people.findIndex((person) => person.userId === userId);
    if (index < 0) return null;
    const updated = { ...people[index], ...structuredClone(updates) } as User;
    people[index] = updated;
    return structuredClone(updated);
};

export const deleteLocalPerson = async (userId: string): Promise<void> => {
    globalStore.__clockinClickLocalPeople = (globalStore.__clockinClickLocalPeople ?? []).filter((person) => person.userId !== userId);
};
