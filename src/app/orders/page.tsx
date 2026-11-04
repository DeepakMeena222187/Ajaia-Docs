import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { listOrdersForUser } from "@/lib/orders";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const orders = await listOrdersForUser(user.id);

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl font-semibold text-forest">My orders</h1>
      {orders.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-lg">You haven&apos;t ordered anything yet.</p>
          <Link href="/plants" className="btn-primary mt-4">Start shopping</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="card flex flex-wrap items-center gap-4 p-4 hover:border-moss">
                <span className="font-semibold text-forest">Order #{o.id}</span>
                <span className="text-sm text-muted">{o.created_at.toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                <span className="text-sm text-muted">{o.item_count} item{o.item_count === 1 ? "" : "s"}</span>
                <StatusBadge status={o.status} />
                <span className="ml-auto font-semibold">{formatINR(o.total_paise)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
