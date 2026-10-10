import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          clearMocks: true,
          restoreMocks: true,
          env: { NODE_ENV: "test", LOG_FILES_ENABLED: "false", TZ: "UTC" },
        },
      },
    ],
  },
});
