import { cartLineSchema, MAX_CART_LINES, MAX_QTY_PER_LINE } from "./validation";

export type CartLine = { variantId: number; qty: number };

/**
 * Parses the cart cookie. The cookie only holds variant ids and quantities — prices are
 * always looked up on the server, so a tampered cookie can't change what anything costs.
 * Invalid entries are dropped silently and duplicate variants are merged.
 */
export function parseCart(raw: string | undefined): CartLine[] {
  if (!raw || raw.length > 4096) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const merged = new Map<number, number>();
  for (const entry of data.slice(0, MAX_CART_LINES * 2)) {
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const parsed = cartLineSchema.safeParse({ variantId: entry[0], qty: entry[1] });
    if (!parsed.success) continue;
    const { variantId, qty } = parsed.data;
    merged.set(variantId, Math.min(MAX_QTY_PER_LINE, (merged.get(variantId) ?? 0) + qty));
  }
  return [...merged.entries()].slice(0, MAX_CART_LINES).map(([variantId, qty]) => ({ variantId, qty }));
}

export function serializeCart(lines: CartLine[]): string {
  return JSON.stringify(lines.slice(0, MAX_CART_LINES).map((l) => [l.variantId, l.qty]));
}

export function addToCart(lines: CartLine[], variantId: number, qty: number): CartLine[] {
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) {
    return lines.map((l) =>
      l.variantId === variantId ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, l.qty + qty) } : l,
    );
  }
  if (lines.length >= MAX_CART_LINES) return lines;
  return [...lines, { variantId, qty: Math.min(MAX_QTY_PER_LINE, qty) }];
}

export function setQty(lines: CartLine[], variantId: number, qty: number): CartLine[] {
  if (qty <= 0) return lines.filter((l) => l.variantId !== variantId);
  return lines.map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(MAX_QTY_PER_LINE, qty) } : l));
}
