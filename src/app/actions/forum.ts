"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createReply, createThread, deletePost, deleteThread, setThreadLocked } from "@/lib/forum";
import { rateLimit } from "@/lib/rate-limit";
import { firstError, replySchema, threadSchema } from "@/lib/validation";
import type { ActionState } from "./types";

export async function createThreadAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in to start a discussion." };
  const parsed = threadSchema.safeParse({
    category: form.get("category"),
    title: form.get("title"),
    body: form.get("body"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!(await rateLimit(`thread:${user.id}`, 5, 3600))) return { error: "You're posting too fast. Try again later." };
  const id = await createThread(user.id, parsed.data.category, parsed.data.title, parsed.data.body);
  redirect(`/forum/${id}`);
}

export async function replyAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in to reply." };
  const threadId = Number(form.get("threadId"));
  if (!Number.isInteger(threadId) || threadId < 1) return { error: "Thread not found." };
  const parsed = replySchema.safeParse({ body: form.get("body") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!(await rateLimit(`reply:${user.id}`, 30, 3600))) return { error: "You're posting too fast. Try again later." };
  const res = await createReply(user.id, threadId, parsed.data.body);
  if (!res.ok) return { error: res.error };
  refresh();
  return { success: "Reply posted." };
}

export async function deleteThreadAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = Number(form.get("threadId"));
  if (Number.isInteger(id) && id > 0 && (await deleteThread(id, user))) redirect("/forum");
  refresh();
}

export async function deletePostAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = Number(form.get("postId"));
  if (Number.isInteger(id) && id > 0) await deletePost(id, user);
  refresh();
}

export async function lockThreadAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return;
  const id = Number(form.get("threadId"));
  if (Number.isInteger(id) && id > 0) await setThreadLocked(id, form.get("locked") === "true");
  refresh();
}
