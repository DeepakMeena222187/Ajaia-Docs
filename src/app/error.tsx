"use client";

import Link from "next/link";

// Shown for unexpected server errors. Details stay in the server logs, never in the page.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page grid place-items-center py-20 text-center">
      <h1 className="text-4xl font-semibold text-forest">Something went wrong</h1>
      <p className="mt-2 text-muted">Please try again. If it keeps happening, contact us.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-ghost">Go home</Link>
      </div>
    </div>
  );
}
