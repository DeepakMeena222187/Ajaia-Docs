"use server";

import { redirect } from "next/navigation";
import { clientIp, currentSessionToken, endSession, getCurrentUser, startSession } from "@/lib/auth";
import { rateLimit, underLimit } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/safe-redirect";
import { deleteAllSessionsForUser } from "@/lib/session";
import { authenticate, changePassword, registerUser } from "@/lib/users";
import { changePasswordSchema, firstError, loginSchema, signupSchema } from "@/lib/validation";
import type { ActionState } from "./types";

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

export async function signupAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (form.get("password") !== form.get("confirm")) return { error: "Passwords do not match." };

  const ip = await clientIp();
  const ipOk = ip === "untrusted" || (await rateLimit(`signup:ip:${ip}`, 5, 3600));
  if (!ipOk) return { error: TOO_MANY };
  // The global ceiling counts only accounts actually created, so failed or blocked
  // requests can't be used to exhaust it for everyone else.
  if (!(await underLimit("signup:global", 100, 3600))) return { error: TOO_MANY };

  const res = await registerUser(parsed.data.name, parsed.data.email, parsed.data.password);
  if (!res.ok) return { error: res.error };
  await rateLimit("signup:global", 100, 3600);
  await startSession(res.userId);
  redirect(safeNextPath(form.get("next"), "/account"));
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Incorrect email or password." };

  const ip = await clientIp();
  const email = parsed.data.email;
  const trusted = ip !== "untrusted";
  const checks = [
    // Caps password spraying across many accounts and bounds total hashing work.
    rateLimit("login:global", 600, 900),
    // With a trustworthy IP, lock out the attacker's IP for this account rather than the
    // account itself, so strangers can't lock real users out. A higher per-account
    // ceiling still stops distributed guessing.
    trusted ? rateLimit(`login:ip:${ip}`, 30, 900) : Promise.resolve(true),
    trusted ? rateLimit(`login:email-ip:${email}:${ip}`, 10, 900) : rateLimit(`login:email:${email}`, 10, 900),
    trusted ? rateLimit(`login:email:${email}`, 50, 900) : Promise.resolve(true),
  ];
  if ((await Promise.all(checks)).includes(false)) return { error: TOO_MANY };

  const res = await authenticate(parsed.data.email, parsed.data.password);
  if (!res.ok) return { error: res.error };
  // A fresh token on every login prevents session fixation.
  await endSession();
  await startSession(res.userId);
  redirect(safeNextPath(form.get("next"), "/"));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };
  const parsed = changePasswordSchema.safeParse({ current: form.get("current"), password: form.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (form.get("password") !== form.get("confirm")) return { error: "New passwords do not match." };
  if (!(await rateLimit(`pwchange:${user.id}`, 5, 900))) return { error: TOO_MANY };

  const res = await changePassword(user.id, parsed.data.current, parsed.data.password);
  if (!res.ok) return { error: res.error };
  // Sign out every other device that might be using the old password.
  await deleteAllSessionsForUser(user.id, await currentSessionToken());
  return { success: "Password updated. Other devices have been signed out." };
}
