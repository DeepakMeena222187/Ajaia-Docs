"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { clearCart, readCart } from "@/lib/cart-cookie";
import { cancelOrderByCustomer, placeOrder } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { cartLineSchema, firstError, shippingSchema } from "@/lib/validation";
import type { ActionState } from "./types";

export async function placeOrderAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in to place your order." };

  const shipping = shippingSchema.safeParse({
    name: form.get("name"),
    phone: form.get("phone"),
    address: form.get("address"),
    city: form.get("city"),
    pincode: form.get("pincode"),
    payment: form.get("payment"),
  });
  if (!shipping.success) return { error: firstError(shipping.error) };

  // "Buy now" checks out a single item; otherwise the whole cart is used.
  const buyNow = form.get("buy");
  let lines;
  let fromCart = false;
  if (buyNow) {
    const parsed = cartLineSchema.safeParse({ variantId: buyNow, qty: form.get("buyQty") });
    if (!parsed.success) return { error: "Invalid item." };
    lines = [parsed.data];
  } else {
    lines = await readCart();
    fromCart = true;
  }

  if (!(await rateLimit(`order:${user.id}`, 10, 3600))) {
    return { error: "You've placed many orders in a short time. Please wait a while or contact us." };
  }

  const res = await placeOrder(user.id, lines, shipping.data, String(form.get("idempotencyKey") ?? ""));
  if (!res.ok) return { error: res.error };
  if (fromCart) await clearCart();
  redirect(`/orders/${res.orderId}?placed=1`);
}

export async function cancelOrderAction(form: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = Number(form.get("orderId"));
  if (Number.isInteger(id) && id > 0) await cancelOrderByCustomer(id, user.id);
  refresh();
}
