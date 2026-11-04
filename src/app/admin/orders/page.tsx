import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { listAllOrders } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { ORDER_STATUSES } from "@/lib/orders";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const s = (await searchParams).status;
  const status = s && (ORDER_STATUSES as readonly string[]).includes(s) ? s : null;
  const orders = await listAllOrders(status);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-forest">Orders</h1>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/orders" className={`rounded-full px-3 py-1 ${!status ? "bg-moss text-white" : "bg-paper ring-1 ring-line"}`}>All</Link>
        {ORDER_STATUSES.map((st) => (
          <Link key={st} href={`/admin/orders?status=${st}`} className={`rounded-full px-3 py-1 capitalize ${status === st ? "bg-moss text-white" : "bg-paper ring-1 ring-line"}`}>{st}</Link>
        ))}
      </nav>
      {orders.length === 0 ? (
        <p className="card mt-6 p-6 text-muted">No orders.</p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sage/50 text-left text-forest">
              <tr>
                <th className="px-4 py-2">Order</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Placed</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-4 py-2"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-moss hover:underline">#{o.id}</Link></td>
                  <td className="px-4 py-2">{o.ship_name}<br /><span className="text-xs text-muted">{o.email}</span></td>
                  <td className="px-4 py-2">{o.ship_city}</td>
                  <td className="px-4 py-2">{o.created_at.toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
                  <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-2 text-right font-medium">{formatINR(o.total_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
