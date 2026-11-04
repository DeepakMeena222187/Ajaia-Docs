import type { PoolClient } from "pg";
import { isUniqueViolation, query, transaction } from "./db";
import { shippingFor } from "./money";
import type { CartLine } from "./cart";
import { MAX_CART_LINES, MAX_QTY_PER_LINE } from "./validation";

export type Shipping = {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  payment: "cod" | "upi_on_delivery";
};

export type PlaceOrderResult = { ok: true; orderId: number } | { ok: false; error: string };

export const ORDER_STATUSES = ["placed", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

class OrderError extends Error {}

/**
 * Places an order atomically. Prices come from the database, never from the client.
 * Stock is decremented with a conditional UPDATE, so concurrent buyers can't oversell.
 * Re-submitting the same idempotency key returns the original order instead of a duplicate.
 */
export async function placeOrder(
  userId: number,
  lines: CartLine[],
  shipping: Shipping,
  idempotencyKey: string,
): Promise<PlaceOrderResult> {
  if (!/^[A-Za-z0-9-]{16,64}$/.test(idempotencyKey)) return { ok: false, error: "Invalid checkout session. Reload and try again." };
  if (lines.length === 0) return { ok: false, error: "Your cart is empty." };
  if (lines.length > MAX_CART_LINES) return { ok: false, error: "Too many items in one order." };
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY_PER_LINE || !Number.isInteger(l.variantId) || l.variantId < 1) {
      return { ok: false, error: "Invalid quantity." };
    }
  }

  const existing = await findOrderByKey(userId, idempotencyKey);
  if (existing) return { ok: true, orderId: existing };

  // Lock rows in a consistent order so two checkouts can't deadlock each other.
  const sorted = [...lines].sort((a, b) => a.variantId - b.variantId);
  try {
    const orderId = await transaction(async (c) => {
      const items: { variantId: number; qty: number; price: number; plant: string; variant: string }[] = [];
      for (const line of sorted) {
        const res = await c.query<{ price_paise: number; variant_name: string; plant_name: string }>(
          `UPDATE variants v SET stock = v.stock - $2
           FROM plants p
           WHERE v.id = $1 AND p.id = v.plant_id AND v.active AND p.active AND v.stock >= $2
           RETURNING v.price_paise, v.name AS variant_name, p.name AS plant_name`,
          [line.variantId, line.qty],
        );
        if (res.rowCount === 0) {
          const info = await c.query<{ name: string; stock: number }>(
            `SELECT p.name || ' — ' || v.name AS name, v.stock FROM variants v JOIN plants p ON p.id = v.plant_id
             WHERE v.id = $1 AND v.active AND p.active`,
            [line.variantId],
          );
          const row = info.rows[0];
          throw new OrderError(
            row
              ? `Only ${row.stock} left of ${row.name}. Please lower the quantity.`
              : "An item in your cart is no longer available.",
          );
        }
        const r = res.rows[0];
        items.push({ variantId: line.variantId, qty: line.qty, price: r.price_paise, plant: r.plant_name, variant: r.variant_name });
      }
      const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const ship = shippingFor(subtotal);
      const order = await c.query<{ id: string }>(
        `INSERT INTO orders (user_id, subtotal_paise, shipping_paise, total_paise, payment_method,
           ship_name, ship_phone, ship_address, ship_city, ship_pincode, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [userId, subtotal, ship, subtotal + ship, shipping.payment, shipping.name, shipping.phone,
         shipping.address, shipping.city, shipping.pincode, idempotencyKey],
      );
      const id = Number(order.rows[0].id);
      for (const i of items) {
        await c.query(
          `INSERT INTO order_items (order_id, variant_id, plant_name, variant_name, unit_price_paise, quantity)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, i.variantId, i.plant, i.variant, i.price, i.qty],
        );
      }
      return id;
    });
    return { ok: true, orderId };
  } catch (err) {
    if (err instanceof OrderError) return { ok: false, error: err.message };
    // A concurrent double-submit with the same key lost the race: return the winner's order.
    if (isUniqueViolation(err)) {
      const id = await findOrderByKey(userId, idempotencyKey);
      if (id) return { ok: true, orderId: id };
    }
    throw err;
  }
}

async function findOrderByKey(userId: number, key: string): Promise<number | null> {
  const res = await query<{ id: string }>("SELECT id FROM orders WHERE user_id = $1 AND idempotency_key = $2", [userId, key]);
  return res.rows[0] ? Number(res.rows[0].id) : null;
}

export type OrderSummary = {
  id: number;
  status: OrderStatus;
  total_paise: number;
  item_count: number;
  created_at: Date;
};

export async function listOrdersForUser(userId: number): Promise<OrderSummary[]> {
  const res = await query<OrderSummary>(
    `SELECT o.id::int, o.status, o.total_paise, o.created_at,
            (SELECT coalesce(sum(quantity), 0)::int FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT 100`,
    [userId],
  );
  return res.rows;
}

export type OrderDetail = {
  id: number;
  user_id: number;
  status: OrderStatus;
  subtotal_paise: number;
  shipping_paise: number;
  total_paise: number;
  payment_method: string;
  ship_name: string;
  ship_phone: string;
  ship_address: string;
  ship_city: string;
  ship_pincode: string;
  created_at: Date;
  customer_email?: string;
  items: { plant_name: string; variant_name: string; unit_price_paise: number; quantity: number }[];
};

/**
 * Loads an order. When `userId` is given the order must belong to that user —
 * this ownership check is what stops one customer from viewing another's order by id.
 */
export async function getOrder(orderId: number, userId: number | null): Promise<OrderDetail | null> {
  if (!Number.isInteger(orderId) || orderId < 1) return null;
  const res = await query<OrderDetail>(
    `SELECT o.id::int, o.user_id::int, o.status, o.subtotal_paise, o.shipping_paise, o.total_paise,
            o.payment_method, o.ship_name, o.ship_phone, o.ship_address, o.ship_city, o.ship_pincode,
            o.created_at, u.email AS customer_email
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.id = $1 ${userId === null ? "" : "AND o.user_id = $2"}`,
    userId === null ? [orderId] : [orderId, userId],
  );
  const order = res.rows[0];
  if (!order) return null;
  const items = await query<OrderDetail["items"][number]>(
    "SELECT plant_name, variant_name, unit_price_paise, quantity FROM order_items WHERE order_id = $1 ORDER BY id",
    [orderId],
  );
  return { ...order, items: items.rows };
}

async function restock(c: PoolClient, orderId: number) {
  await c.query(
    `UPDATE variants v SET stock = v.stock + oi.quantity
     FROM order_items oi WHERE oi.order_id = $1 AND oi.variant_id = v.id`,
    [orderId],
  );
}

/** Customers may cancel only their own orders, and only before they are confirmed. */
export async function cancelOrderByCustomer(orderId: number, userId: number): Promise<boolean> {
  return transaction(async (c) => {
    const res = await c.query(
      "UPDATE orders SET status = 'cancelled' WHERE id = $1 AND user_id = $2 AND status = 'placed' RETURNING id",
      [orderId, userId],
    );
    if (res.rowCount === 0) return false;
    await restock(c, orderId);
    return true;
  });
}

const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export async function setOrderStatusByAdmin(orderId: number, next: OrderStatus): Promise<boolean> {
  return transaction(async (c) => {
    const cur = await c.query<{ status: OrderStatus }>("SELECT status FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
    const status = cur.rows[0]?.status;
    if (!status || !ADMIN_TRANSITIONS[status].includes(next)) return false;
    await c.query("UPDATE orders SET status = $2 WHERE id = $1", [orderId, next]);
    if (next === "cancelled") await restock(c, orderId);
    return true;
  });
}

export function allowedTransitions(status: OrderStatus): OrderStatus[] {
  return ADMIN_TRANSITIONS[status];
}
