import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signupAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNextPath((await searchParams).next, "/account");
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-10">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-3xl font-semibold text-forest">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Order plants, book an expert and talk plants with the community.</p>
        <ActionForm action={signupAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="name" className="label">Name</label>
            <input id="name" name="name" required minLength={2} maxLength={60} autoComplete="name" className="input" />
          </div>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="input" aria-describedby="pw-help" />
            <p id="pw-help" className="mt-1 text-xs text-muted">At least 10 characters. A short phrase is easier to remember.</p>
          </div>
          <div>
            <label htmlFor="confirm" className="label">Confirm password</label>
            <input id="confirm" name="confirm" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="input" />
          </div>
          <SubmitButton className="btn-primary w-full !py-3" pendingText="Creating account…">Create account</SubmitButton>
        </ActionForm>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-moss hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
