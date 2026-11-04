import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setOrderStatusAction } from "@/app/actions/admin";
import { ConfirmButton, SubmitButton } from "@/components/forms";
import { OrderView } from "@/components/OrderView";
import { requireAdmin } from "@/lib/auth";
import { allowedTransitions, getOrder } from "@/lib/orders";

export const metadata: Metadata = { title: "Manage order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = /^\d{1,12}$/.test(id) ? await getOrder(Number(id), null) : null;
  if (!order) notFound();
  const next = allowedTransitions(order.status);

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-moss hover:underline">← All orders</Link>
      <h1 className="mt-2 text-3xl font-semibold text-forest">Order #{order.id}</h1>
      <p className="text-sm text-muted">{order.customer_email}</p>
      <div className="mt-6"><OrderView order={order} /></div>
      {next.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {next.map((st) => (
            <form key={st} action={setOrderStatusAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="status" value={st} />
              {st === "cancelled" ? (
                <ConfirmButton message="Cancel this order and restock its items?">Cancel order</ConfirmButton>
              ) : (
                <SubmitButton className="btn-primary capitalize">Mark as {st}</SubmitButton>
              )}
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
