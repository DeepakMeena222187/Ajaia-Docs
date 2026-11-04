import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { placeOrderAction } from "@/app/actions/shop";
import { ActionForm, SubmitButton } from "@/components/forms";
import { requireUser } from "@/lib/auth";
import { readCart } from "@/lib/cart-cookie";
import { getVariantsForCart } from "@/lib/catalog";
import { formatINR, shippingFor } from "@/lib/money";
import { cartLineSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Checkout" };

type Search = Record<string, string | string[] | undefined>;

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const buyParam = typeof sp.buy === "string" ? sp.buy : null;
  const qtyParam = typeof sp.qty === "string" ? sp.qty : "1";
  const user = await requireUser(buyParam ? `/checkout?buy=${encodeURIComponent(buyParam)}&qty=${encodeURIComponent(qtyParam)}` : "/checkout");

  const buyNow = buyParam ? cartLineSchema.safeParse({ variantId: buyParam, qty: qtyParam }) : null;
  const lines = buyNow?.success ? [buyNow.data] : await readCart();
  const info = await getVariantsForCart(lines.map((l) => l.variantId));
  const items = lines.flatMap((l) => {
    const v = info.get(l.variantId);
    return v ? [{ ...l, ...v }] : [];
  });
  const subtotal = items.reduce((s, i) => s + i.price_paise * i.qty, 0);
  const shipping = shippingFor(subtotal);

  if (items.length === 0) {
    return (
      <div className="container-page py-10">
        <h1 className="text-4xl font-semibold text-forest">Checkout</h1>
        <div className="card mt-6 p-10 text-center">
          <p className="text-lg">There is nothing to check out.</p>
          <Link href="/plants" className="btn-primary mt-4">Browse plants</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl font-semibold text-forest">Checkout</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <ActionForm action={placeOrderAction} className="card space-y-4 p-6 lg:col-span-2">
          <input type="hidden" name="idempotencyKey" value={randomUUID()} />
          {buyNow?.success && (
            <>
              <input type="hidden" name="buy" value={buyNow.data.variantId} />
              <input type="hidden" name="buyQty" value={buyNow.data.qty} />
            </>
          )}
          <h2 className="text-xl font-semibold text-forest">Delivery details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" defaultValue={user.name} autoComplete="name" minLength={2} maxLength={80} />
            <Field label="Mobile number" name="phone" type="tel" autoComplete="tel" placeholder="98765 43210" maxLength={16} />
          </div>
          <div>
            <label htmlFor="address" className="label">Address</label>
            <textarea id="address" name="address" required minLength={10} maxLength={300} rows={3} autoComplete="street-address" className="input" placeholder="House no., street, area, landmark" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" name="city" autoComplete="address-level2" minLength={2} maxLength={60} />
            <Field label="PIN code" name="pincode" inputMode="numeric" autoComplete="postal-code" pattern="[1-9][0-9]{5}" maxLength={6} />
          </div>

          <fieldset>
            <legend className="label">Payment</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <PayOption value="cod" title="Cash on delivery" text="Pay in cash when your plants arrive." defaultChecked />
              <PayOption value="upi_on_delivery" title="UPI on delivery" text="Scan and pay with any UPI app at your door." />
            </div>
            <p className="mt-2 text-xs text-muted">Online card/UPI payment will be added soon.</p>
          </fieldset>

          <SubmitButton className="btn-accent w-full !py-3" pendingText="Placing order…">
            Place order · {formatINR(subtotal + shipping)}
          </SubmitButton>
        </ActionForm>

        <aside className="card h-fit p-6">
          <h2 className="text-xl font-semibold text-forest">{buyNow?.success ? "Buying now" : "Your items"}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((i) => (
              <li key={i.variant_id} className="flex justify-between gap-3">
                <span>
                  {i.plant_name} <span className="text-muted">({i.variant_name}) × {i.qty}</span>
                </span>
                <span className="font-medium">{formatINR(i.price_paise * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{shipping === 0 ? "Free" : formatINR(shipping)}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatINR(subtotal + shipping)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted">Prices are confirmed when you place the order.</p>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} required className="input" {...rest} />
    </div>
  );
}

function PayOption({ value, title, text, defaultChecked }: { value: string; title: string; text: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-line bg-white p-3 text-sm has-[:checked]:border-moss has-[:checked]:bg-sage/40">
      <input type="radio" name="payment" value={value} defaultChecked={defaultChecked} className="mt-1 accent-moss" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-xs text-muted">{text}</span>
      </span>
    </label>
  );
}
