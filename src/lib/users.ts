import { isUniqueViolation, query } from "./db";
import { getDummyHash, hashPassword, verifyPassword } from "./password";

export type AuthResult = { ok: true; userId: number } | { ok: false; error: string };

export async function registerUser(name: string, email: string, password: string): Promise<AuthResult> {
  const hash = await hashPassword(password);
  try {
    const res = await query<{ id: string }>(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [name, email, hash],
    );
    return { ok: true, userId: Number(res.rows[0].id) };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "An account with this email already exists." };
    throw err;
  }
}

const BAD_LOGIN = "Incorrect email or password.";

export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const res = await query<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE lower(email) = lower($1)",
    [email],
  );
  const row = res.rows[0];
  // Always run one scrypt verification so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(password, row?.password_hash ?? (await getDummyHash()));
  if (!row || !ok) return { ok: false, error: BAD_LOGIN };
  return { ok: true, userId: Number(row.id) };
}

export async function changePassword(userId: number, current: string, next: string): Promise<AuthResult> {
  const res = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  const row = res.rows[0];
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return { ok: false, error: "Current password is incorrect." };
  }
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(next), userId]);
  return { ok: true, userId };
}
