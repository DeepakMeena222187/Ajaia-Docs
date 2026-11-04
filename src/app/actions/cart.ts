"use server";

import { redirect } from "next/navigation";
import { addToCart, setQty } from "@/lib/cart";
import { readCart, writeCart } from "@/lib/cart-cookie";
import { getVariantsForCart } from "@/lib/catalog";
import { cartLineSchema } from "@/lib/validation";
import type { ActionState } from "./types";

async function parseLine(form: FormData) {
  const parsed = cartLineSchema.safeParse({ variantId: form.get("variantId"), qty: form.get("qty") ?? 1 });
  if (!parsed.success) return null;
  const info = (await getVariantsForCart([parsed.data.variantId])).get(parsed.data.variantId);
  if (!info) return null;
  return { ...parsed.data, info };
}

export async function addToCartAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const line = await parseLine(form);
  if (!line) return { error: "That item isn't available." };
  if (line.info.stock < 1) return { error: "Sorry, this variety is out of stock." };
  const cart = await readCart();
  const already = cart.find((l) => l.variantId === line.variantId)?.qty ?? 0;
  if (already + line.qty > line.info.stock) return { error: `Only ${line.info.stock} in stock.` };
  await writeCart(addToCart(cart, line.variantId, line.qty));
  return { success: `Added ${line.info.plant_name} (${line.info.variant_name}) to your cart.` };
}

export async function buyNowAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const line = await parseLine(form);
  if (!line) return { error: "That item isn't available." };
  if (line.info.stock < line.qty) return { error: `Only ${line.info.stock} in stock.` };
  redirect(`/checkout?buy=${line.variantId}&qty=${line.qty}`);
}

export async function updateCartAction(form: FormData): Promise<void> {
  const variantId = Number(form.get("variantId"));
  const qty = Number(form.get("qty"));
  if (!Number.isInteger(variantId) || !Number.isInteger(qty) || qty < 0 || qty > 20) return;
  await writeCart(setQty(await readCart(), variantId, qty));
}
