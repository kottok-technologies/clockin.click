import { describe, expect, it } from "vitest";
import type { TimeAttendanceRecord } from "@/types/attendance";
import type { User } from "@/types/user";
import {
  attendedDays,
  buildDayStat,
  buildDayStatsByUser,
  buildSummaryRows,
  enumerateMonths,
  enumeratePeriods,
  localDayKey,
  localTime,
  toUtcRange,
} from "./attendance";

const record = (userId: string, dateTimeStamp: string, state: string): TimeAttendanceRecord => ({
  userId,
  dateTimeStamp,
  state,
  clockedBy: userId,
  userTypeYearMonth: `learner#${dateTimeStamp.slice(0, 7)}`,
});

describe("attendance date helpers", () => {
  it("converts instants and date ranges using the school timezone", () => {
    expect(localDayKey("2026-01-01T02:00:00.000Z")).toBe("2025-12-31");
    expect(localTime("2026-01-01T14:15:00.000Z")).toBe("08:15");
    expect(toUtcRange("2026-03-08", "2026-03-08")).toEqual({
      start: "2026-03-08T06:00:00.000Z",
      end: "2026-03-09T04:59:59.999Z",
    });
  });

  it("enumerates inclusive month and day periods", () => {
    expect(enumerateMonths("2025-12-01T00:00:00Z", "2026-02-28T23:59:59Z")).toEqual([
      "2025-12", "2026-01", "2026-02",
    ]);
    expect(enumeratePeriods("2026-02-27", "2026-03-01", "day")).toEqual([
      "2026-02-27", "2026-02-28", "2026-03-01",
    ]);
    expect(enumeratePeriods("2026-01-01", "2026-03-31", "month")).toEqual([
      "2026-01", "2026-02", "2026-03",
    ]);
  });
});

describe("attendance aggregation", () => {
  it("pairs sorted punches and calculates hours", () => {
    const stat = buildDayStat("2026-01-05", [
      record("u1", "2026-01-05T23:00:00Z", "out"),
      record("u1", "2026-01-05T15:00:00Z", "IN"),
    ]);
    expect(stat).toMatchObject({ hours: 8, incomplete: false, present: true });
    expect(stat.inTimes).toEqual(["09:00"]);
    expect(stat.outTimes).toEqual(["17:00"]);
  });

  it.each([
    ["an unmatched out", [record("u1", "2026-01-05T15:00:00Z", "out")]],
    ["an unmatched in", [record("u1", "2026-01-05T15:00:00Z", "in")]],
    ["a doubled in", [
      record("u1", "2026-01-05T14:00:00Z", "in"),
      record("u1", "2026-01-05T15:00:00Z", "in"),
      record("u1", "2026-01-05T16:00:00Z", "out"),
    ]],
  ])("marks %s incomplete without inventing hours", (_label, records) => {
    expect(buildDayStat("2026-01-05", records)).toMatchObject({ hours: 0, incomplete: true });
  });

  it("groups records by user and local day", () => {
    const stats = buildDayStatsByUser([
      record("u1", "2026-01-01T02:00:00Z", "in"),
      record("u2", "2026-01-02T15:00:00Z", "in"),
    ]);
    expect([...stats.get("u1")!.keys()]).toEqual(["2025-12-31"]);
    expect([...stats.get("u2")!.keys()]).toEqual(["2026-01-02"]);
  });

  it("returns unique sorted attended days", () => {
    expect(attendedDays([
      record("u1", "2026-01-03T15:00:00Z", "in"),
      record("u2", "2026-01-02T15:00:00Z", "in"),
      record("u1", "2026-01-02T20:00:00Z", "out"),
    ])).toEqual(["2026-01-02", "2026-01-03"]);
  });

  it("builds daily summary rows with details and totals", () => {
    const users = [{ userId: "u1", firstName: "Maya", lastName: "Rivera", pin: "1234", roles: ["Learner"] }] as User[];
    const records = [
      record("u1", "2026-01-05T15:00:00Z", "in"),
      record("u1", "2026-01-05T23:00:00Z", "out"),
      record("u1", "2026-01-06T15:00:00Z", "in"),
    ];
    const [row] = buildSummaryRows(users, records, ["2026-01-05", "2026-01-06"], "day", ["learner"]);
    expect(row.userType).toBe("Learner");
    expect(row.cells[0].detail).toContain("IN: 09:00 | OUT: 17:00 (8.00h)");
    expect(row.cells[1].detail).toContain("(incomplete)");
    expect(row.totals).toEqual({ daysPresent: 2, hours: 8, incompleteDays: 1 });
  });

  it("rolls daily stats into monthly cells and handles users without records", () => {
    const users = [
      { userId: "u1", firstName: "Alex", lastName: "Morgan", pin: "1234", roles: ["staff"] },
      { userId: "u2", firstName: "No", lastName: "Punches", pin: "5678", roles: [] },
    ] as User[];
    const rows = buildSummaryRows(users, [
      record("u1", "2026-01-05T15:00:00Z", "in"),
      record("u1", "2026-01-05T16:30:00Z", "out"),
    ], ["2026-01", "2026-02"], "month", ["staff"]);
    expect(rows[0].cells[0]).toMatchObject({ daysPresent: 1, hours: 1.5, detail: "" });
    expect(rows[1]).toMatchObject({ userType: "", totals: { daysPresent: 0, hours: 0, incompleteDays: 0 } });
  });
});
