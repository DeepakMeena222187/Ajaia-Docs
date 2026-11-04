import type { Metadata } from "next";
import Link from "next/link";
import { changePasswordAction } from "@/app/actions/auth";
import { cancelBookingAction } from "@/app/actions/booking";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { listBookingsForUser, todayIST } from "@/lib/bookings";
import { BOOKING_SERVICES } from "@/lib/validation";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("/account");
  const bookings = await listBookingsForUser(user.id);
  const booked = (await searchParams).booked === "1";
  const today = todayIST();

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl font-semibold text-forest">Hello, {user.name}</h1>
      <p className="mt-1 text-muted">{user.email}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section id="bookings" className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-forest">My bookings</h2>
            <Link href="/book" className="btn-ghost !py-1.5 text-xs">New booking</Link>
          </div>
          {booked && <p role="status" className="mt-3 rounded-xl bg-sage px-3 py-2 text-sm text-forest">Your booking is confirmed. See you then!</p>}
          {bookings.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No bookings yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="font-medium">{BOOKING_SERVICES[b.service]}</span>
                  <span className="text-muted">
                    {new Date(`${b.slot_date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} at {b.slot_time}
                  </span>
                  <StatusBadge status={b.status} />
                  {b.status === "booked" && b.slot_date > today && (
                    <form action={cancelBookingAction} className="ml-auto">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <ConfirmButton message="Cancel this booking?" className="text-xs text-red-700 hover:underline">Cancel</ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link href="/orders" className="mt-6 inline-block text-sm font-semibold text-moss hover:underline">View my orders →</Link>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-semibold text-forest">Change password</h2>
          <ActionForm action={changePasswordAction} className="mt-4 space-y-3">
            <div>
              <label htmlFor="current" className="label">Current password</label>
              <input id="current" name="current" type="password" required autoComplete="current-password" maxLength={128} className="input" />
            </div>
            <div>
              <label htmlFor="password" className="label">New password</label>
              <input id="password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="input" />
            </div>
            <div>
              <label htmlFor="confirm" className="label">Confirm new password</label>
              <input id="confirm" name="confirm" type="password" required minLength={10} maxLength={128} autoComplete="new-password" className="input" />
            </div>
            <SubmitButton className="btn-primary w-full">Update password</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
