export type DayWindow = {
    startTime: string;
    endTime: string;
};

export type SchoolSchedule = {
    student: DayWindow;
    staff: DayWindow;
};

export const DEFAULT_SCHOOL_SCHEDULE: SchoolSchedule = {
    student: { startTime: "08:30", endTime: "15:00" },
    staff: { startTime: "08:00", endTime: "16:00" },
};

export const scheduleGroupForUserType = (userType: string): keyof SchoolSchedule =>
    userType.toLowerCase() === "learner" ? "student" : "staff";
