import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePostAction, deleteThreadAction, lockThreadAction, replyAction } from "@/app/actions/forum";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";
import { getThread } from "@/lib/forum";

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  return /^\d{1,12}$/.test(id) ? getThread(Number(id)) : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await load((await params).id);
  return { title: t ? t.title : "Discussion not found" };
}

export default async function ThreadPage({ params }: Params) {
  const [thread, user] = await Promise.all([load((await params).id), getCurrentUser()]);
  if (!thread) notFound();
  const isAdmin = user?.role === "admin";

  return (
    <div className="container-page max-w-3xl py-10">
      <Link href="/forum" className="text-sm text-moss hover:underline">← Back to forum</Link>
      <article className="card mt-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{thread.category}</span>
          {thread.locked && <span className="chip bg-stone-200 text-stone-700">Locked</span>}
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-forest">{thread.title}</h1>
        <Meta author={thread.author} date={thread.created_at} />
        {/* React escapes text, so user content can't inject HTML or scripts. */}
        <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed">{thread.body}</p>
        {(user?.id === thread.user_id || isAdmin) && (
          <div className="mt-4 flex gap-2">
            <form action={deleteThreadAction}>
              <input type="hidden" name="threadId" value={thread.id} />
              <ConfirmButton message="Delete this discussion and all replies?" className="btn-danger !py-1.5 text-xs">Delete</ConfirmButton>
            </form>
            {isAdmin && (
              <form action={lockThreadAction}>
                <input type="hidden" name="threadId" value={thread.id} />
                <input type="hidden" name="locked" value={String(!thread.locked)} />
                <button className="btn-ghost !py-1.5 text-xs">{thread.locked ? "Unlock" : "Lock"}</button>
              </form>
            )}
          </div>
        )}
      </article>

      <h2 className="mt-8 text-xl font-semibold text-forest">
        {thread.posts.length} repl{thread.posts.length === 1 ? "y" : "ies"}
      </h2>
      <ul className="mt-3 space-y-3">
        {thread.posts.map((p) => (
          <li key={p.id} className="card p-4">
            <Meta author={p.author} date={p.created_at} />
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{p.body}</p>
            {(user?.id === p.user_id || isAdmin) && (
              <form action={deletePostAction} className="mt-2">
                <input type="hidden" name="postId" value={p.id} />
                <ConfirmButton message="Delete this reply?" className="text-xs text-red-700 hover:underline">Delete</ConfirmButton>
              </form>
            )}
          </li>
        ))}
      </ul>

      {thread.locked ? (
        <p className="card mt-6 p-4 text-sm text-muted">This discussion is locked for new replies.</p>
      ) : user ? (
        <ActionForm action={replyAction} className="card mt-6 space-y-3 p-5">
          <input type="hidden" name="threadId" value={thread.id} />
          <label htmlFor="body" className="label">Your reply</label>
          <textarea id="body" name="body" required minLength={2} maxLength={5000} rows={4} className="input" />
          <SubmitButton pendingText="Posting…">Post reply</SubmitButton>
        </ActionForm>
      ) : (
        <p className="card mt-6 p-4 text-sm">
          <Link href={`/login?next=/forum/${thread.id}`} className="font-semibold text-moss hover:underline">Log in</Link> to join the discussion.
        </p>
      )}
    </div>
  );
}

function Meta({ author, date }: { author: string; date: Date }) {
  return (
    <p className="mt-1 text-xs text-muted">
      <span className="font-medium text-ink">{author}</span> ·{" "}
      {date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
    </p>
  );
}
