import { query, transaction } from "./db";
import type { SessionUser } from "./session";

export type ThreadSummary = {
  id: number;
  category: string;
  title: string;
  author: string;
  reply_count: number;
  locked: boolean;
  created_at: Date;
  last_activity: Date;
};

export const THREADS_PER_PAGE = 20;

export async function listThreads(category: string | null, page: number): Promise<{ threads: ThreadSummary[]; total: number }> {
  const params: unknown[] = [];
  let where = "";
  if (category) {
    params.push(category);
    where = "WHERE t.category = $1";
  }
  const total = await query<{ n: number }>(`SELECT count(*)::int AS n FROM forum_threads t ${where}`, params);
  const offset = (Math.max(1, page) - 1) * THREADS_PER_PAGE;
  const res = await query<ThreadSummary>(
    `SELECT t.id::int, t.category, t.title, u.name AS author, t.locked, t.created_at, t.last_activity,
            (SELECT count(*)::int FROM forum_posts p WHERE p.thread_id = t.id) AS reply_count
     FROM forum_threads t JOIN users u ON u.id = t.user_id ${where}
     ORDER BY t.last_activity DESC LIMIT ${THREADS_PER_PAGE} OFFSET ${offset}`,
    params,
  );
  return { threads: res.rows, total: total.rows[0].n };
}

export type Thread = {
  id: number;
  user_id: number;
  category: string;
  title: string;
  body: string;
  author: string;
  locked: boolean;
  created_at: Date;
  posts: { id: number; user_id: number; author: string; body: string; created_at: Date }[];
};

export async function getThread(id: number): Promise<Thread | null> {
  if (!Number.isInteger(id) || id < 1) return null;
  const res = await query<Omit<Thread, "posts">>(
    `SELECT t.id::int, t.user_id::int, t.category, t.title, t.body, u.name AS author, t.locked, t.created_at
     FROM forum_threads t JOIN users u ON u.id = t.user_id WHERE t.id = $1`,
    [id],
  );
  const thread = res.rows[0];
  if (!thread) return null;
  const posts = await query<Thread["posts"][number]>(
    `SELECT p.id::int, p.user_id::int, u.name AS author, p.body, p.created_at
     FROM forum_posts p JOIN users u ON u.id = p.user_id WHERE p.thread_id = $1 ORDER BY p.created_at, p.id LIMIT 500`,
    [id],
  );
  return { ...thread, posts: posts.rows };
}

export async function createThread(userId: number, category: string, title: string, body: string): Promise<number> {
  const res = await query<{ id: string }>(
    "INSERT INTO forum_threads (user_id, category, title, body) VALUES ($1,$2,$3,$4) RETURNING id",
    [userId, category, title, body],
  );
  return Number(res.rows[0].id);
}

export async function createReply(userId: number, threadId: number, body: string): Promise<{ ok: boolean; error?: string }> {
  return transaction(async (c) => {
    const t = await c.query<{ locked: boolean }>("SELECT locked FROM forum_threads WHERE id = $1 FOR UPDATE", [threadId]);
    if (!t.rows[0]) return { ok: false, error: "Thread not found." };
    if (t.rows[0].locked) return { ok: false, error: "This thread is locked." };
    await c.query("INSERT INTO forum_posts (thread_id, user_id, body) VALUES ($1,$2,$3)", [threadId, userId, body]);
    await c.query("UPDATE forum_threads SET last_activity = now() WHERE id = $1", [threadId]);
    return { ok: true };
  });
}

/** Authors may delete their own content; admins may delete anything. */
export async function deleteThread(threadId: number, actor: SessionUser): Promise<boolean> {
  const res =
    actor.role === "admin"
      ? await query("DELETE FROM forum_threads WHERE id = $1", [threadId])
      : await query("DELETE FROM forum_threads WHERE id = $1 AND user_id = $2", [threadId, actor.id]);
  return (res.rowCount ?? 0) > 0;
}

export async function deletePost(postId: number, actor: SessionUser): Promise<number | null> {
  const res =
    actor.role === "admin"
      ? await query<{ thread_id: string }>("DELETE FROM forum_posts WHERE id = $1 RETURNING thread_id", [postId])
      : await query<{ thread_id: string }>("DELETE FROM forum_posts WHERE id = $1 AND user_id = $2 RETURNING thread_id", [postId, actor.id]);
  return res.rows[0] ? Number(res.rows[0].thread_id) : null;
}

export async function setThreadLocked(threadId: number, locked: boolean): Promise<void> {
  await query("UPDATE forum_threads SET locked = $2 WHERE id = $1", [threadId, locked]);
}
