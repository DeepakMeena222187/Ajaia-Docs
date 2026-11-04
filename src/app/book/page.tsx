import type { Metadata } from "next";
import Link from "next/link";
import { createBookingAction } from "@/app/actions/booking";
import { ActionForm, SubmitButton } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";
import { bookableDates, takenSlots } from "@/lib/bookings";
import { BOOKING_SERVICES, BOOKING_SLOTS } from "@/lib/validation";

export const metadata: Metadata = { title: "Book a plant expert" };

export default async function BookPage() {
  const user = await getCurrentUser();
  const dates = bookableDates().slice(0, 14);
  const taken = await takenSlots(dates);

  return (
    <div className="container-page py-10">
      <p className="eyebrow">Expert help</p>
      <h1 className="mt-2 text-4xl font-semibold text-forest">Book a plant expert</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Get one-to-one help from our gardeners — a video call about a struggling plant, a guided walk through the nursery, or a
        visit to plan your balcony or garden. We&apos;re closed on Mondays.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Object.entries(BOOKING_SERVICES).map(([k, label]) => (
          <div key={k} className="card p-5">
            <h2 className="text-lg font-semibold text-forest">{label}</h2>
            <p className="mt-1 text-sm text-muted">
              {k === "consultation" && "Show us your plant on camera and get a care plan."}
              {k === "nursery_visit" && "Walk the nursery with a gardener and pick plants for your space."}
              {k === "home_setup" && "We visit, measure your light and suggest the right plants."}
            </p>
          </div>
        ))}
      </div>

      {!user ? (
        <div className="card mt-8 p-6 text-center">
          <p>Please log in to book a slot.</p>
          <Link href="/login?next=/book" className="btn-primary mt-3">Log in to book</Link>
        </div>
      ) : (
        <ActionForm action={createBookingAction} className="card mt-8 space-y-5 p-6">
          <div>
            <label htmlFor="service" className="label">Service</label>
            <select id="service" name="service" required className="input sm:max-w-md">
              {Object.entries(BOOKING_SERVICES).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="label">Pick a slot</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dates.map((d) => (
                <div key={d} className="rounded-xl border border-line bg-white p-3">
                  <p className="text-sm font-semibold text-forest">
                    {new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {BOOKING_SLOTS.map((t) => {
                      const isTaken = taken.has(`${d} ${t}`);
                      return (
                        <label
                          key={t}
                          className={`rounded-lg px-2 py-1 text-xs ring-1 ${isTaken ? "cursor-not-allowed bg-stone-100 text-stone-400 line-through ring-stone-200" : "cursor-pointer ring-line hover:ring-moss has-[:checked]:bg-moss has-[:checked]:text-white"}`}
                        >
                          <input type="radio" name="slot" value={`${d} ${t}`} disabled={isTaken} required className="sr-only" />
                          {t}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="notes" className="label">Anything we should know? (optional)</label>
            <textarea id="notes" name="notes" maxLength={500} rows={3} className="input" placeholder="Which plants, your city, balcony direction…" />
          </div>
          <SubmitButton className="btn-accent" pendingText="Booking…">Confirm booking</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
