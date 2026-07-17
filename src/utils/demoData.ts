import { DeleteItemCommand, PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
    client,
    marshallUser,
    putSchoolSchedule,
    SETTINGS_TABLE,
    TIME_ATTENDANCE_TABLE,
    USERS_TABLE,
} from "@/utils/dynamo";
import type { User } from "@/types/user";
import { TIME_ZONE } from "@/utils/attendance";

const DEMO_USERS: User[] = [
    {
        userId: "demo-guardian-rivera",
        firstName: "Jordan",
        lastName: "Rivera",
        roles: ["guardian"],
        pin: "2468",
        learners: [
            { userId: "demo-learner-maya", firstName: "Maya", lastName: "Rivera", roles: ["learner"], pin: "" },
            { userId: "demo-learner-theo", firstName: "Theo", lastName: "Rivera", roles: ["learner"], pin: "" },
        ],
    },
    { userId: "demo-learner-maya", firstName: "Maya", lastName: "Rivera", roles: ["learner"], pin: "", status: "Out" },
    { userId: "demo-learner-theo", firstName: "Theo", lastName: "Rivera", roles: ["learner"], pin: "", status: "Out" },
    { userId: "demo-learner-avery", firstName: "Avery", lastName: "Chen", roles: ["learner"], pin: "", status: "Out" },
    { userId: "demo-staff-morgan", firstName: "Alex", lastName: "Morgan", roles: ["staff"], pin: "1357", status: "Out" },
    { userId: "demo-staff-patel", firstName: "Sam", lastName: "Patel", roles: ["staff"], pin: "8642", status: "Out" },
    { userId: "demo-volunteer-brooks", firstName: "Taylor", lastName: "Brooks", roles: ["volunteer"], pin: "9753", status: "Out" },
];

const deleteAll = async (tableName: string, keyNames: string[]) => {
    let exclusiveStartKey: Record<string, import("@aws-sdk/client-dynamodb").AttributeValue> | undefined;
    do {
        const page = await client.send(new ScanCommand({ TableName: tableName, ExclusiveStartKey: exclusiveStartKey }));
        await Promise.all((page.Items ?? []).map((item) =>
            client.send(new DeleteItemCommand({
                TableName: tableName,
                Key: Object.fromEntries(keyNames.map((key) => [key, item[key]])),
            }))
        ));
        exclusiveStartKey = page.LastEvaluatedKey;
    } while (exclusiveStartKey);
};

const demoDays = () => {
    const days: string[] = [];
    const cursor = toZonedTime(new Date(), TIME_ZONE);
    while (days.length < 5) {
        const local = format(cursor, "yyyy-MM-dd");
        const weekday = cursor.getDay();
        if (weekday !== 0 && weekday !== 6) days.unshift(local);
        cursor.setDate(cursor.getDate() - 1);
    }
    return days;
};

const attendanceItem = (userId: string, userType: string, day: string, time: string, state: "In" | "Out") => {
    const timestamp = fromZonedTime(`${day}T${time}:00`, TIME_ZONE).toISOString();
    return {
        UserTypeYearMonth: { S: `${userType}#${timestamp.slice(0, 7)}` },
        DateTimeStamp: { S: timestamp },
        UserId: { S: userId },
        State: { S: state },
        ClockedBy: { S: userType === "learner" ? "demo-guardian-rivera" : userId },
        Id: { S: crypto.randomUUID() },
    };
};

export const resetDemoData = async () => {
    if (process.env.DEMO_MODE !== "true") throw new Error("Demo reset is disabled for this tenant");

    await Promise.all([
        deleteAll(USERS_TABLE, ["UserId"]),
        deleteAll(TIME_ATTENDANCE_TABLE, ["UserTypeYearMonth", "DateTimeStamp"]),
        deleteAll(SETTINGS_TABLE, ["SettingId"]),
    ]);

    await Promise.all(DEMO_USERS.map((user) => client.send(new PutItemCommand({
        TableName: USERS_TABLE,
        Item: marshallUser(user),
    }))));

    await putSchoolSchedule({
        student: { startTime: "08:30", endTime: "15:00" },
        staff: { startTime: "08:00", endTime: "16:00" },
    });

    const punches = demoDays().flatMap((day, index) => [
        attendanceItem("demo-learner-maya", "learner", day, index % 3 === 0 ? "08:38" : "08:18", "In"),
        attendanceItem("demo-learner-maya", "learner", day, "15:08", "Out"),
        attendanceItem("demo-learner-theo", "learner", day, "08:24", "In"),
        attendanceItem("demo-learner-theo", "learner", day, index === 2 ? "14:40" : "15:05", "Out"),
        attendanceItem("demo-learner-avery", "learner", day, index % 2 ? "08:35" : "08:12", "In"),
        attendanceItem("demo-learner-avery", "learner", day, "15:02", "Out"),
        attendanceItem("demo-staff-morgan", "staff", day, "07:48", "In"),
        attendanceItem("demo-staff-morgan", "staff", day, "16:12", "Out"),
        attendanceItem("demo-staff-patel", "staff", day, index === 1 ? "08:09" : "07:55", "In"),
        attendanceItem("demo-staff-patel", "staff", day, "16:04", "Out"),
    ]);

    await Promise.all(punches.map((Item) => client.send(new PutItemCommand({ TableName: TIME_ATTENDANCE_TABLE, Item }))));

    return { users: DEMO_USERS.length, punches: punches.length, resetAt: new Date().toISOString() };
};
