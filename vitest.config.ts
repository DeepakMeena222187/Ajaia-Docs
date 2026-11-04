import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    // DB tests share one database, so run files one after another.
    fileParallelism: false,
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://greenleaf:greenleaf_dev@localhost:5432/greenleaf_test",
    },
  },
});
