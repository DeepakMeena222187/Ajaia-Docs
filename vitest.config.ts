import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
    testTimeout: 20000,
    setupFiles: ["./vitest.setup.ts"],
    env: {
      TEST_DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/ajaia_docs_test",
    },
  },
});
