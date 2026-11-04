"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addToCartAction, buyNowAction } from "@/app/actions/cart";
import { FormMessage, SubmitButton } from "@/components/forms";
import type { Variant } from "@/lib/catalog";
import { formatINR } from "@/lib/money";

export function BuyBox({ variants }: { variants: Variant[] }) {
  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const [cartState, cartAction] = useActionState(addToCartAction, null);
  const [buyState, buyAction] = useActionState(buyNowAction, null);
  const variant = variants.find((v) => v.id === selected);

  if (!variant) return <p className="mt-6 text-muted">This plant is not available right now.</p>;
  const maxQty = Math.max(1, Math.min(20, variant.stock));
  const soldOut = variant.stock < 1;

  return (
    <div className="card mt-6 p-5">
      <fieldset>
        <legend className="label">Choose a variety</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {variants.map((v) => (
            <label
              key={v.id}
              className={`flex cursor-pointer items-start justify-between gap-2 rounded-xl border p-3 text-sm transition ${
                v.id === selected ? "border-moss bg-sage/50 ring-2 ring-moss/20" : "border-line bg-white hover:border-moss/50"
              } ${v.stock < 1 ? "opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="variant-choice"
                value={v.id}
                checked={v.id === selected}
                onChange={() => {
                  setSelected(v.id);
                  setQty(1);
                }}
                className="sr-only"
              />
              <span>
                <span className="block font-semibold">{v.name}</span>
                <span className="block text-xs text-muted">{v.stock > 0 ? (v.stock < 5 ? `Only ${v.stock} left` : "In stock") : "Sold out"}</span>
              </span>
              <span className="font-semibold">{formatINR(v.price_paise)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div>
          <span className="block text-xs text-muted">Price</span>
          <span className="font-display text-3xl font-semibold text-forest">{formatINR(variant.price_paise * qty)}</span>
        </div>
        <div className="ml-auto flex items-center rounded-full border border-line bg-white">
          <button type="button" className="px-3 py-2 text-lg" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span className="w-8 text-center font-semibold" aria-live="polite" aria-label="Quantity">{qty}</span>
          <button type="button" className="px-3 py-2 text-lg" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>
            +
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <form action={cartAction}>
          <input type="hidden" name="variantId" value={variant.id} />
          <input type="hidden" name="qty" value={qty} />
          <SubmitButton className="btn-ghost w-full !py-3" pendingText="Adding…">
            {soldOut ? "Sold out" : "Add to cart"}
          </SubmitButton>
        </form>
        <form action={buyAction}>
          <input type="hidden" name="variantId" value={variant.id} />
          <input type="hidden" name="qty" value={qty} />
          <SubmitButton className="btn-accent w-full !py-3" pendingText="Loading…">
            Buy now
          </SubmitButton>
        </form>
      </div>
      <FormMessage state={buyState ?? cartState} />
      {cartState?.success && (
        <Link href="/cart" className="mt-2 inline-block text-sm font-semibold text-moss hover:underline">
          View cart →
        </Link>
      )}
      <p className="mt-4 text-xs text-muted">Free delivery on orders above ₹999 · Cash or UPI on delivery · 7-day healthy-plant promise</p>
    </div>
  );
}
