import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const secretFile = process.argv[2];
if (!secretFile) throw new Error("Expected the Secrets Manager JSON file path");

const secrets = JSON.parse(readFileSync(secretFile, "utf8"));
const isDemo = process.env.SCHOOL_NAME?.toLowerCase() === "demo";
const runtime = {
    ...secrets,
    SCHOOL_NAME: process.env.SCHOOL_NAME,
    NEXT_PUBLIC_SCHOOL_NAME: process.env.SCHOOL_NAME,
    DEMO_MODE: String(isDemo),
    NEXT_PUBLIC_DEMO_MODE: String(isDemo),
    ...(existsSync("public/images/school-logo.png")
        ? { NEXT_PUBLIC_SCHOOL_LOGO: "/images/school-logo.png" }
        : {}),
    NEXTAUTH_URL: `https://${process.env.SCHOOL_NAME.toLowerCase()}.clockin.click`,
};

const contents = Object.entries(runtime)
    .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
    .join("\n");

writeFileSync(".env.production", `${contents}\n`, { mode: 0o600 });
rmSync(secretFile);
