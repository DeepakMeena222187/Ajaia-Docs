import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNextPath((await searchParams).next, "/");
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-10">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-3xl font-semibold text-forest">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to check out, track orders and join the community.</p>
        <ActionForm action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" maxLength={254} className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" maxLength={128} className="input" />
          </div>
          <SubmitButton className="btn-primary w-full !py-3" pendingText="Logging in…">Log in</SubmitButton>
        </ActionForm>
        <p className="mt-6 text-center text-sm text-muted">
          New to Greenleaf?{" "}
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-moss hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
