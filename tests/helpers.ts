import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import { registerUser } from "@/lib/users";

export async function makeUser(role: "customer" | "admin" = "customer") {
  const email = `u-${randomUUID()}@example.com`;
  const res = await registerUser("Tester", email, "a long enough password");
  if (!res.ok) throw new Error(res.error);
  if (role === "admin") await query("UPDATE users SET role = 'admin' WHERE id = $1", [res.userId]);
  return { id: res.userId, email, name: "Tester", role } as const;
}

export async function variantBySlug(slug: string, index = 0) {
  const res = await query<{ id: number; price_paise: number; stock: number }>(
    `SELECT v.id::int, v.price_paise, v.stock FROM variants v JOIN plants p ON p.id = v.plant_id
     WHERE p.slug = $1 ORDER BY v.sort_order, v.id`,
    [slug],
  );
  return res.rows[index];
}

export const ship = {
  name: "Test Buyer",
  phone: "9876543210",
  address: "12 Green Street, Indiranagar",
  city: "Bengaluru",
  pincode: "560038",
  payment: "cod" as const,
};
