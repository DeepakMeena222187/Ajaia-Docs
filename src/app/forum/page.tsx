import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listThreads, THREADS_PER_PAGE } from "@/lib/forum";
import { FORUM_CATEGORIES } from "@/lib/validation";

export const metadata: Metadata = { title: "Community forum" };

export default async function ForumPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const category = (FORUM_CATEGORIES as readonly string[]).includes(sp.category ?? "") ? sp.category! : null;
  const page = Math.min(1000, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const [user, { threads, total }] = await Promise.all([getCurrentUser(), listThreads(category, page)]);
  const pages = Math.max(1, Math.ceil(total / THREADS_PER_PAGE));
  const qs = (p: number) => `/forum?${new URLSearchParams({ ...(category ? { category } : {}), page: String(p) })}`;

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Community</p>
          <h1 className="mt-2 text-4xl font-semibold text-forest">Greenleaf forum</h1>
          <p className="mt-1 text-muted">Ask questions, share your garden and help fellow plant parents.</p>
        </div>
        <Link href={user ? "/forum/new" : "/login?next=/forum/new"} className="btn-primary">Start a discussion</Link>
      </div>

      <nav aria-label="Forum categories" className="mt-6 flex flex-wrap gap-2">
        <CategoryLink href="/forum" active={!category}>All</CategoryLink>
        {FORUM_CATEGORIES.map((c) => (
          <CategoryLink key={c} href={`/forum?category=${encodeURIComponent(c)}`} active={category === c}>{c}</CategoryLink>
        ))}
      </nav>

      {threads.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-lg text-forest">No discussions here yet.</p>
          <p className="text-sm text-muted">Be the first to start one!</p>
        </div>
      ) : (
        <ul className="card mt-6 divide-y divide-line">
          {threads.map((t) => (
            <li key={t.id}>
              <Link href={`/forum/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-sage/30">
                <span className="w-full font-semibold text-forest sm:w-auto sm:flex-1">
                  {t.locked && <span className="mr-2 text-xs text-muted" title="Locked">🔒</span>}
                  {t.title}
                </span>
                <span className="chip">{t.category}</span>
                <span className="text-xs text-muted">by {t.author}</span>
                <span className="text-xs text-muted">{t.reply_count} repl{t.reply_count === 1 ? "y" : "ies"}</span>
                <span className="text-xs text-muted">{t.last_activity.toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={qs(page - 1)} className="btn-ghost">← Newer</Link>}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages && <Link href={qs(page + 1)} className="btn-ghost">Older →</Link>}
        </nav>
      )}
    </div>
  );
}

function CategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-sm ${active ? "bg-moss text-white" : "bg-paper text-muted ring-1 ring-line hover:text-forest"}`}>
      {children}
    </Link>
  );
}
