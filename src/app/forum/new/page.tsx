import type { Metadata } from "next";
import { createThreadAction } from "@/app/actions/forum";
import { ActionForm, SubmitButton } from "@/components/forms";
import { requireUser } from "@/lib/auth";
import { FORUM_CATEGORIES } from "@/lib/validation";

export const metadata: Metadata = { title: "Start a discussion" };

export default async function NewThreadPage() {
  await requireUser("/forum/new");
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-4xl font-semibold text-forest">Start a discussion</h1>
      <ActionForm action={createThreadAction} className="card mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="category" className="label">Category</label>
          <select id="category" name="category" required className="input">
            {FORUM_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="title" className="label">Title</label>
          <input id="title" name="title" required minLength={5} maxLength={120} className="input" placeholder="e.g. Why are my monstera leaves turning yellow?" />
        </div>
        <div>
          <label htmlFor="body" className="label">Details</label>
          <textarea id="body" name="body" required minLength={10} maxLength={5000} rows={8} className="input" placeholder="Describe the plant, its light, how often you water…" />
        </div>
        <p className="text-xs text-muted">Be kind and helpful. Posts are public.</p>
        <SubmitButton pendingText="Posting…">Post discussion</SubmitButton>
      </ActionForm>
    </div>
  );
}
