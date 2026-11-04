import type { Metadata } from "next";
import { setBookingStatusAction } from "@/app/actions/admin";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { listAllBookings } from "@/lib/bookings";
import { BOOKING_SERVICES } from "@/lib/validation";

export const metadata: Metadata = { title: "Bookings" };

export default async function AdminBookings() {
  await requireAdmin();
  const bookings = await listAllBookings();
  return (
    <div>
      <h1 className="text-3xl font-semibold text-forest">Bookings</h1>
      {bookings.length === 0 ? (
        <p className="card mt-6 p-6 text-muted">No bookings yet.</p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sage/50 text-left text-forest">
              <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Service</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Notes</th><th className="px-4 py-2">Status</th><th className="px-4 py-2" /></tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-line align-top">
                  <td className="px-4 py-2 whitespace-nowrap">{b.slot_date} {b.slot_time}</td>
                  <td className="px-4 py-2">{BOOKING_SERVICES[b.service]}</td>
                  <td className="px-4 py-2">{b.user_name}<br /><span className="text-xs text-muted">{b.user_email}</span></td>
                  <td className="max-w-xs px-4 py-2 whitespace-pre-wrap break-words text-muted">{b.notes}</td>
                  <td className="px-4 py-2"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-2">
                    {b.status === "booked" && (
                      <div className="flex gap-2">
                        {(["completed", "cancelled"] as const).map((st) => (
                          <form key={st} action={setBookingStatusAction}>
                            <input type="hidden" name="bookingId" value={b.id} />
                            <input type="hidden" name="status" value={st} />
                            <button className={st === "completed" ? "btn-ghost !px-3 !py-1 text-xs" : "btn-danger !px-3 !py-1 text-xs"}>
                              {st === "completed" ? "Done" : "Cancel"}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
