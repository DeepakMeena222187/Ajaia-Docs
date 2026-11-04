import { isUniqueViolation, query, transaction } from "./db";
import { BOOKING_SLOTS, type BOOKING_SERVICES } from "./validation";

export const MAX_ACTIVE_BOOKINGS = 3;
export const BOOKING_WINDOW_DAYS = 30;

/** Today's date in India (bookings are for an Indian nursery), as YYYY-MM-DD. */
export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Bookable dates: tomorrow through BOOKING_WINDOW_DAYS ahead, closed on Mondays. */
export function bookableDates(now = new Date()): string[] {
  const today = todayIST(now);
  const dates: string[] = [];
  for (let i = 1; i <= BOOKING_WINDOW_DAYS; i++) {
    const d = addDays(today, i);
    if (new Date(`${d}T00:00:00Z`).getUTCDay() !== 1) dates.push(d);
  }
  return dates;
}

export type BookingResult = { ok: true; id: number } | { ok: false; error: string };

export async function createBooking(
  userId: number,
  input: { service: keyof typeof BOOKING_SERVICES; date: string; time: (typeof BOOKING_SLOTS)[number]; notes: string },
  now = new Date(),
): Promise<BookingResult> {
  if (!bookableDates(now).includes(input.date)) return { ok: false, error: "That date can't be booked. Pick another day." };
  if (!BOOKING_SLOTS.includes(input.time)) return { ok: false, error: "Invalid time slot." };

  try {
    return await transaction(async (c): Promise<BookingResult> => {
      // Serialises this user's bookings so parallel requests can't slip past the cap.
      await c.query("SELECT pg_advisory_xact_lock(42, $1::int)", [userId]);
      const active = await c.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM bookings WHERE user_id = $1 AND status = 'booked' AND slot_date >= $2::date",
        [userId, todayIST(now)],
      );
      if (active.rows[0].n >= MAX_ACTIVE_BOOKINGS) {
        return { ok: false, error: `You can hold up to ${MAX_ACTIVE_BOOKINGS} upcoming bookings. Cancel one to book another.` };
      }
      const res = await c.query<{ id: string }>(
        "INSERT INTO bookings (user_id, service, slot_date, slot_time, notes) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [userId, input.service, input.date, input.time, input.notes],
      );
      return { ok: true, id: Number(res.rows[0].id) };
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "Sorry, that slot was just taken. Please choose another." };
    throw err;
  }
}

export async function takenSlots(dates: string[]): Promise<Set<string>> {
  if (dates.length === 0) return new Set();
  const res = await query<{ d: string; t: string }>(
    `SELECT to_char(slot_date, 'YYYY-MM-DD') AS d, slot_time AS t FROM bookings
     WHERE status <> 'cancelled' AND slot_date = ANY($1::date[])`,
    [dates],
  );
  return new Set(res.rows.map((r) => `${r.d} ${r.t}`));
}

export type Booking = {
  id: number;
  service: keyof typeof BOOKING_SERVICES;
  slot_date: string;
  slot_time: string;
  notes: string;
  status: "booked" | "completed" | "cancelled";
  user_email?: string;
  user_name?: string;
};

export async function listBookingsForUser(userId: number): Promise<Booking[]> {
  const res = await query<Booking>(
    `SELECT id::int, service, to_char(slot_date, 'YYYY-MM-DD') AS slot_date, slot_time, notes, status
     FROM bookings WHERE user_id = $1 ORDER BY slot_date DESC, slot_time DESC LIMIT 50`,
    [userId],
  );
  return res.rows;
}

export async function listAllBookings(): Promise<Booking[]> {
  const res = await query<Booking>(
    `SELECT b.id::int, b.service, to_char(b.slot_date, 'YYYY-MM-DD') AS slot_date, b.slot_time, b.notes, b.status,
            u.email AS user_email, u.name AS user_name
     FROM bookings b JOIN users u ON u.id = b.user_id
     ORDER BY b.slot_date DESC, b.slot_time DESC LIMIT 300`,
  );
  return res.rows;
}

/** A customer can cancel only their own, still-upcoming booking. */
export async function cancelBookingByCustomer(bookingId: number, userId: number, now = new Date()): Promise<boolean> {
  const res = await query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND user_id = $2 AND status = 'booked' AND slot_date > $3::date`,
    [bookingId, userId, todayIST(now)],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function setBookingStatusByAdmin(bookingId: number, status: "completed" | "cancelled"): Promise<boolean> {
  const res = await query("UPDATE bookings SET status = $2 WHERE id = $1 AND status = 'booked'", [bookingId, status]);
  return (res.rowCount ?? 0) > 0;
}
