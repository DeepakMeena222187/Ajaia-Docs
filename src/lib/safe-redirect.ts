/**
 * Returns `next` only if it is a same-site relative path; otherwise the fallback.
 * Blocks open redirects such as "//evil.com", "/\evil.com" and "https://evil.com".
 */
export function safeNextPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  // Browsers treat "\" like "/", and control characters can smuggle a second slash.
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
