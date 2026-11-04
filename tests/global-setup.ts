import { execFileSync } from "node:child_process";
import pg from "pg";

// Rebuilds the test database from scratch before the suite runs.
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://greenleaf:greenleaf_dev@localhost:5432/greenleaf_test";
  if (!/test/i.test(new URL(url).pathname)) throw new Error("Refusing to wipe a database whose name doesn't contain 'test'");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await client.end();
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  execFileSync("node", ["scripts/migrate.mjs"], { env, stdio: "inherit" });
  execFileSync("node", ["scripts/seed.mjs"], { env, stdio: "inherit" });
}
