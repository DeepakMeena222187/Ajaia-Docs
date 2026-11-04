import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelOrderAction } from "@/app/actions/shop";
import { ConfirmButton } from "@/components/forms";
import { OrderView } from "@/components/OrderView";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/lib/orders";

export const metadata: Metadata = { title: "Order details" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const user = await requireUser(`/orders/${encodeURIComponent(id)}`);
  // Scoped to the signed-in user: someone else's order id returns 404, not their data.
  const order = /^\d{1,12}$/.test(id) ? await getOrder(Number(id), user.id) : null;
  if (!order) notFound();
  const placed = (await searchParams).placed === "1";

  return (
    <div className="container-page py-10">
      <Link href="/orders" className="text-sm text-moss hover:underline">← All orders</Link>
      <h1 className="mt-2 text-4xl font-semibold text-forest">Order #{order.id}</h1>
      {placed && (
        <div role="status" className="mt-4 rounded-2xl bg-sage p-4 text-forest">
          <strong>Thank you! Your order is placed.</strong> We&apos;ll confirm it shortly and keep you updated here.
        </div>
      )}
      <div className="mt-6">
        <OrderView order={order} />
      </div>
      {order.status === "placed" && (
        <form action={cancelOrderAction} className="mt-6">
          <input type="hidden" name="orderId" value={order.id} />
          <ConfirmButton message="Cancel this order?">Cancel order</ConfirmButton>
        </form>
      )}
    </div>
  );
}
