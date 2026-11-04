import { createHash, randomBytes } from "node:crypto";
import { query } from "./db";

export const SESSION_TTL_DAYS = 30;

export type SessionUser = { id: number; email: string; name: string; role: "customer" | "admin" };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a session row and returns the raw token (only its hash is stored). */
export async function createSessionRecord(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    userId,
    expiresAt,
  ]);
  // Housekeeping: drop this user's expired sessions.
  await query("DELETE FROM sessions WHERE user_id = $1 AND expires_at < now()", [userId]);
  return { token, expiresAt };
}

export async function validateSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token || token.length > 100 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  const res = await query<{ id: string; email: string; name: string; role: SessionUser["role"] }>(
    `SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  const row = res.rows[0];
  return row ? { id: Number(row.id), email: row.email, name: row.name, role: row.role } : null;
}

export async function deleteSessionRecord(token: string): Promise<void> {
  await query("DELETE FROM sessions WHERE id = $1", [hashToken(token)]);
}

export async function deleteAllSessionsForUser(userId: number, exceptToken?: string): Promise<void> {
  if (exceptToken) {
    await query("DELETE FROM sessions WHERE user_id = $1 AND id <> $2", [userId, hashToken(exceptToken)]);
  } else {
    await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  }
}
