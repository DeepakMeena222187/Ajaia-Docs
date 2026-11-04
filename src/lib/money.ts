export const FREE_SHIPPING_THRESHOLD_PAISE = 99_900;
export const SHIPPING_FEE_PAISE = 9_900;

export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function shippingFor(subtotalPaise: number): number {
  if (subtotalPaise === 0) return 0;
  return subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : SHIPPING_FEE_PAISE;
}

/** Parses a rupee amount typed by an admin ("499", "499.50") into paise. Returns null if invalid. */
export function parseRupeesToPaise(input: string): number | null {
  const s = input.trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
