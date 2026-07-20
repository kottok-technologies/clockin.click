import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "tmp/**"],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/types/schedule.ts",
        "src/types/user.ts",
        "src/utils/attendance.ts",
        "src/utils/formatters.ts",
        "src/utils/kioskMock.ts",
        "src/utils/localPeopleMock.ts",
        "src/utils/userValidation.ts",
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
