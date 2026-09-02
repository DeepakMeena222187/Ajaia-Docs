import { cookies } from "next/headers";
import { getUserById } from "./db";

const COOKIE_NAME = "ajaia-session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export const cookieConfig = {
  name: COOKIE_NAME,
  maxAge: COOKIE_MAX_AGE,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Get the current authenticated user from the session cookie.
 * Returns null if no valid session exists.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    // Validate that the user actually exists in the database
    const user = await getUserById(sessionCookie.value);
    return user || null;
  } catch {
    return null;
  }
}

/**
 * Require a valid authenticated user for the current request.
 * Throws an error if no valid session exists.
 */
export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized: No valid session");
  }

  return user;
}

/**
 * Set the session cookie with the given user ID.
 */
export async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, userId, cookieConfig);
}

/**
 * Clear the session cookie.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
