"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { cancelBookingByCustomer, createBooking } from "@/lib/bookings";
import { rateLimit } from "@/lib/rate-limit";
import { bookingSchema, firstError } from "@/lib/validation";
import type { ActionState } from "./types";

export async function createBookingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in to book." };
  const slot = String(form.get("slot") ?? "");
  const [date, time] = slot.split(" ");
  const parsed = bookingSchema.safeParse({
    service: form.get("service"),
    date,
    time,
    notes: form.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!(await rateLimit(`booking:${user.id}`, 10, 3600))) return { error: "Too many booking attempts. Try again later." };
  const res = await createBooking(user.id, parsed.data);
  if (!res.ok) return { error: res.error };
  redirect("/account?booked=1#bookings");
}

export async function cancelBookingAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = Number(form.get("bookingId"));
  if (Number.isInteger(id) && id > 0) await cancelBookingByCustomer(id, user.id);
  refresh();
}
