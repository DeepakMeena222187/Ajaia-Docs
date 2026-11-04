// Promotes an existing account to admin: npm run make-admin -- someone@example.com
// Admin rights are granted only from the server shell, never through the website.
import pg from "pg";

const email = process.argv[2];
if (!email) {
  console.error("usage: npm run make-admin -- <email>");
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();
const res = await client.query("UPDATE users SET role = 'admin' WHERE lower(email) = lower($1) RETURNING id", [email]);
await client.end();
if (res.rowCount === 0) {
  console.error(`no account with email ${email} — sign up on the site first`);
  process.exit(1);
}
console.log(`${email} is now an admin`);
