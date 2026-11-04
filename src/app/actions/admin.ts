"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addVariant, createPlant, updatePlant, updateVariant } from "@/lib/admin";
import { setBookingStatusByAdmin } from "@/lib/bookings";
import { parseRupeesToPaise } from "@/lib/money";
import { ORDER_STATUSES, setOrderStatusByAdmin, type OrderStatus } from "@/lib/orders";
import { firstError, plantSchema } from "@/lib/validation";
import type { ActionState } from "./types";

// Every admin action re-checks the role itself: server actions are public HTTP endpoints,
// so hiding the button in the UI is not access control.
async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Forbidden");
  return user;
}

function id(form: FormData, key: string): number | null {
  const n = Number(form.get(key));
  return Number.isInteger(n) && n > 0 ? n : null;
}

function variantFields(form: FormData): { error: string } | { name: string; description: string; price_paise: number; stock: number } {
  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const price = parseRupeesToPaise(String(form.get("price") ?? ""));
  const stock = Number(form.get("stock"));
  if (name.length < 1 || name.length > 60) return { error: "Variant name must be 1–60 characters." };
  if (description.length > 200) return { error: "Variant description must be at most 200 characters." };
  if (price === null) return { error: "Price must be a rupee amount like 499 or 499.50." };
  if (!Number.isInteger(stock) || stock < 0 || stock > 100_000) return { error: "Stock must be a whole number from 0 to 100000." };
  return { name, description, price_paise: price, stock };
}

export async function updateVariantAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await assertAdmin();
  const variantId = id(form, "variantId");
  if (!variantId) return { error: "Unknown variant." };
  const fields = variantFields(form);
  if ("error" in fields) return fields;
  const ok = await updateVariant(variantId, { ...fields, active: form.get("active") === "on" });
  if (!ok) return { error: "Variant not found." };
  refresh();
  return { success: "Saved." };
}

export async function addVariantAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await assertAdmin();
  const plantId = id(form, "plantId");
  if (!plantId) return { error: "Unknown plant." };
  const fields = variantFields(form);
  if ("error" in fields) return fields;
  if (!(await addVariant(plantId, fields))) return { error: "Plant not found." };
  refresh();
  return { success: "Variant added." };
}

function plantFields(form: FormData) {
  return plantSchema.safeParse({
    name: form.get("name"),
    scientific_name: form.get("scientific_name"),
    category: form.get("category"),
    summary: form.get("summary"),
    description: form.get("description"),
    benefits: form.get("benefits") ?? "",
    light: form.get("light"),
    water: form.get("water"),
    difficulty: form.get("difficulty"),
    art: form.get("art"),
    hue: form.get("hue"),
    image_url: form.get("image_url") ?? "",
    pet_safe: form.get("pet_safe") === "on",
    air_purifying: form.get("air_purifying") === "on",
    featured: form.get("featured") === "on",
    active: form.get("active") === "on",
  });
}

export async function savePlantAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await assertAdmin();
  const parsed = plantFields(form);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const plantId = form.get("plantId") ? id(form, "plantId") : null;
  if (form.get("plantId") && !plantId) return { error: "Unknown plant." };
  if (plantId) {
    if (!(await updatePlant(plantId, parsed.data))) return { error: "Plant not found." };
    refresh();
    return { success: "Plant saved." };
  }
  const res = await createPlant(parsed.data);
  if (!res.ok) return { error: res.error };
  redirect("/admin/products?created=1");
}

export async function setOrderStatusAction(form: FormData): Promise<void> {
  await assertAdmin();
  const orderId = id(form, "orderId");
  const status = String(form.get("status"));
  if (orderId && (ORDER_STATUSES as readonly string[]).includes(status)) {
    await setOrderStatusByAdmin(orderId, status as OrderStatus);
  }
  refresh();
}

export async function setBookingStatusAction(form: FormData): Promise<void> {
  await assertAdmin();
  const bookingId = id(form, "bookingId");
  const status = String(form.get("status"));
  if (bookingId && (status === "completed" || status === "cancelled")) await setBookingStatusByAdmin(bookingId, status);
  refresh();
}
