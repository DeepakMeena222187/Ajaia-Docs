import { query } from "./db";

/**
 * Fixed-window counter stored in Postgres (works across serverless instances).
 * Returns true if this hit is within `limit` for the current window.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  // Occasionally clear expired windows so random keys can't grow the table forever.
  if (Math.random() < 0.01) await pruneRateLimits().catch(() => {});
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

/** True if `key` is still under `limit` in its current window, without counting a hit. */
export async function underLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const res = await query<{ count: number }>(
    "SELECT count FROM rate_limits WHERE key = $1 AND window_start >= now() - make_interval(secs => $2)",
    [key, windowSeconds],
  );
  return (res.rows[0]?.count ?? 0) < limit;
}

export async function pruneRateLimits(): Promise<void> {
  await query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'");
}

/** Groups IPv6 addresses by /64, since one customer usually controls a whole /64. */
export function ipBucket(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head] = ip.split("%");
  const parts = head.split("::");
  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts[1] ? parts[1].split(":") : [];
  const full = parts.length > 1 ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right] : left;
  return full.slice(0, 4).map((h) => h.toLowerCase().replace(/^0+(?=.)/, "")).join(":") + "::/64";
}
