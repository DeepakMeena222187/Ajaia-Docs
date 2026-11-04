import { formatINR } from "@/lib/money";
import type { OrderDetail } from "@/lib/orders";
import { StatusBadge } from "./StatusBadge";

const PAYMENT_LABEL: Record<string, string> = { cod: "Cash on delivery", upi_on_delivery: "UPI on delivery" };

export function OrderView({ order }: { order: OrderDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="card p-6 lg:col-span-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-forest">Items</h2>
          <StatusBadge status={order.status} />
        </div>
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="pb-2 font-medium">Plant</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Price</th>
              <th className="pb-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i, k) => (
              <tr key={k} className="border-t border-line">
                <td className="py-2">
                  {i.plant_name} <span className="text-muted">({i.variant_name})</span>
                </td>
                <td className="py-2 text-right">{i.quantity}</td>
                <td className="py-2 text-right">{formatINR(i.unit_price_paise)}</td>
                <td className="py-2 text-right">{formatINR(i.unit_price_paise * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 ml-auto max-w-xs space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal_paise)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{order.shipping_paise === 0 ? "Free" : formatINR(order.shipping_paise)}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatINR(order.total_paise)}</dd></div>
        </dl>
      </section>
      <aside className="card h-fit space-y-4 p-6 text-sm">
        <div>
          <h3 className="font-sans font-semibold text-forest">Deliver to</h3>
          <p className="mt-1">{order.ship_name}</p>
          <p className="whitespace-pre-line text-muted">{order.ship_address}</p>
          <p className="text-muted">{order.ship_city} – {order.ship_pincode}</p>
          <p className="text-muted">+91 {order.ship_phone}</p>
        </div>
        <div>
          <h3 className="font-sans font-semibold text-forest">Payment</h3>
          <p className="mt-1">{PAYMENT_LABEL[order.payment_method] ?? order.payment_method}</p>
        </div>
        <div>
          <h3 className="font-sans font-semibold text-forest">Placed</h3>
          <p className="mt-1">{order.created_at.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</p>
        </div>
      </aside>
    </div>
  );
}
