import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  createSessionRecord,
  deleteSessionRecord,
  validateSessionToken,
  type SessionUser,
} from "./session";

const secure = process.env.NODE_ENV === "production";
// The __Host- prefix makes browsers reject the cookie unless it is Secure, host-only and Path=/.
export const SESSION_COOKIE = secure ? "__Host-gl_session" : "gl_session";

export async function startSession(userId: number): Promise<void> {
  const { token, expiresAt } = await createSessionRecord(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSessionRecord(token);
  jar.delete(SESSION_COOKIE);
}

export async function currentSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** The signed-in user for this request (memoised per request), or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return validateSessionToken(await currentSessionToken());
});

export async function requireUser(nextPath = "/"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}

/**
 * Client IP for rate limiting. Forwarding headers are client-controlled unless a proxy
 * we trust overwrites them, so they are only used on Vercel (which overwrites
 * x-forwarded-for) or when TRUST_PROXY=1 says a reverse proxy does the same.
 * Otherwise every request shares one bucket and the global limits do the work.
 */
export async function clientIp(): Promise<string> {
  if (!process.env.VERCEL && process.env.TRUST_PROXY !== "1") return "untrusted";
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (fwd || h.get("x-real-ip") || "unknown").slice(0, 64);
}
