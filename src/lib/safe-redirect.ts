/**
 * Returns `next` only if it is a same-site relative path; otherwise the fallback.
 * Blocks open redirects such as "//evil.com", "/\evil.com", "https://evil.com" and
 * dot-segment tricks like "/.//evil.com" that only become "//evil.com" after normalising.
 */
export function safeNextPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  if (!isSafe(next)) return fallback;
  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    const out = url.pathname + url.search + url.hash;
    // Check the normalised result too: that is what the browser will actually follow.
    return isSafe(out) ? out : fallback;
  } catch {
    return fallback;
  }
}

function isSafe(p: string): boolean {
  if (!p.startsWith("/") || p.startsWith("//")) return false;
  // Browsers treat "\" like "/", and control characters can smuggle a second slash.
  return !/[\u0000-\u001f\u007f\\]/.test(p);
}
