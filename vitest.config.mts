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
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/helpers/integrationGlobalSetup.ts"],
          setupFiles: ["tests/helpers/integrationSetup.ts"],
          fileParallelism: false,
          maxWorkers: 1,
          testTimeout: 20_000,
          hookTimeout: 20_000,
          restoreMocks: true,
        },
      },
    ],
  },
});
