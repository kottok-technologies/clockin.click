import { describe, expect, it } from "vitest";
import {
  deleteLocalPerson,
  getLocalPeople,
  getLocalPerson,
  getLocalPersonByEmail,
  getLocalPersonByPin,
  putLocalPerson,
  updateLocalPerson,
} from "./localPeopleMock";

describe("local people data store", () => {
  it("returns cloned seed data and supports lookups", async () => {
    const people = await getLocalPeople();
    expect(people.length).toBeGreaterThan(0);
    people[0].firstName = "Mutated";
    expect((await getLocalPeople())[0].firstName).not.toBe("Mutated");
    expect((await getLocalPerson("local-admin"))?.firstName).toBe("Demo");
    expect((await getLocalPersonByPin("9090"))?.userId).toBe("local-admin");
    expect((await getLocalPersonByEmail("DEMO@CLOCKIN.CLICK"))?.userId).toBe("local-admin");
  });

  it("returns null for missing people", async () => {
    expect(await getLocalPerson("missing")).toBeNull();
    expect(await getLocalPersonByPin("0000")).toBeNull();
    expect(await getLocalPersonByEmail("missing@example.com")).toBeNull();
    expect(await updateLocalPerson("missing", { firstName: "Nobody" })).toBeNull();
  });

  it("creates, updates, clones, and deletes a person", async () => {
    const person = { userId: "test-person", firstName: "Test", lastName: "Person", pin: "1010", roles: ["staff"] };
    await putLocalPerson(person);
    person.firstName = "Changed outside";
    expect((await getLocalPerson("test-person"))?.firstName).toBe("Test");
    expect(await updateLocalPerson("test-person", { firstName: "Updated" })).toMatchObject({ firstName: "Updated" });
    await deleteLocalPerson("test-person");
    expect(await getLocalPerson("test-person")).toBeNull();
  });
});
