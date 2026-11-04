import { query } from "./db";

/**
 * Fixed-window counter stored in Postgres (works across serverless instances).
 * Returns true if this hit is within `limit` for the current window.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const res = await query<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2)
                    THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2)
                    THEN now() ELSE rate_limits.window_start END
     RETURNING count`,
    [key, windowSeconds],
  );
  return res.rows[0].count <= limit;
}

/** Deletes expired windows; called opportunistically so the table stays small. */
export async function pruneRateLimits(): Promise<void> {
  await query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'");
}
