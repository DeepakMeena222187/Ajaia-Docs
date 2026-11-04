import type { Metadata } from "next";
import Link from "next/link";
import { updateCartAction } from "@/app/actions/cart";
import { PlantArt } from "@/components/PlantArt";
import { readCart } from "@/lib/cart-cookie";
import { getVariantsForCart } from "@/lib/catalog";
import { FREE_SHIPPING_THRESHOLD_PAISE, formatINR, shippingFor } from "@/lib/money";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const lines = await readCart();
  const info = await getVariantsForCart(lines.map((l) => l.variantId));
  const items = lines.flatMap((l) => {
    const v = info.get(l.variantId);
    return v ? [{ ...l, ...v }] : [];
  });
  const subtotal = items.reduce((s, i) => s + i.price_paise * i.qty, 0);
  const shipping = shippingFor(subtotal);

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl font-semibold text-forest">Your cart</h1>
      {items.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-lg text-forest">Your cart is empty.</p>
          <Link href="/plants" className="btn-primary mt-4">Browse plants</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <ul className="space-y-3 lg:col-span-2">
            {items.map((i) => (
              <li key={i.variant_id} className="card flex gap-4 p-3">
                <Link href={`/plants/${i.plant_slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                  <PlantArt art={i.art} hue={i.hue} imageUrl={i.image_url} name={i.plant_name} />
                </Link>
                <div className="flex flex-1 flex-col">
                  <Link href={`/plants/${i.plant_slug}`} className="font-semibold text-forest hover:underline">{i.plant_name}</Link>
                  <span className="text-sm text-muted">{i.variant_name} · {formatINR(i.price_paise)} each</span>
                  {i.qty > i.stock && <span className="text-sm text-red-700">Only {i.stock} in stock — please lower the quantity.</span>}
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                    <form action={updateCartAction} className="flex items-center gap-2">
                      <input type="hidden" name="variantId" value={i.variant_id} />
                      <label className="sr-only" htmlFor={`qty-${i.variant_id}`}>Quantity</label>
                      <select id={`qty-${i.variant_id}`} name="qty" defaultValue={Math.min(i.qty, 20)} className="input !w-20 !py-1.5">
                        {Array.from({ length: 20 }, (_, k) => k + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <button className="btn-ghost !px-3 !py-1.5 text-xs">Update</button>
                    </form>
                    <form action={updateCartAction}>
                      <input type="hidden" name="variantId" value={i.variant_id} />
                      <input type="hidden" name="qty" value="0" />
                      <button className="text-xs text-red-700 hover:underline">Remove</button>
                    </form>
                  </div>
                </div>
                <div className="font-semibold">{formatINR(i.price_paise * i.qty)}</div>
              </li>
            ))}
          </ul>
          <aside className="card h-fit p-6">
            <h2 className="text-xl font-semibold text-forest">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatINR(subtotal + shipping)}</dd></div>
            </dl>
            {shipping > 0 && (
              <p className="mt-3 text-xs text-muted">Add {formatINR(FREE_SHIPPING_THRESHOLD_PAISE - subtotal)} more for free delivery.</p>
            )}
            <Link href="/checkout" className="btn-accent mt-5 w-full !py-3">Proceed to checkout</Link>
            <Link href="/plants" className="mt-3 block text-center text-sm text-moss hover:underline">Continue shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
