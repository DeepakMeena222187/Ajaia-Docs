import { describe, expect, it } from "vitest";
import { addToCart, parseCart, serializeCart, setQty } from "@/lib/cart";
import { bookableDates, todayIST } from "@/lib/bookings";
import { formatINR, parseRupeesToPaise, shippingFor } from "@/lib/money";
import { safeNextPath } from "@/lib/safe-redirect";
import { imageUrlSchema, shippingSchema, signupSchema, slugify, threadSchema } from "@/lib/validation";

describe("safeNextPath (open redirect protection)", () => {
  it.each(["/account", "/plants?q=a", "/orders/5#x"])("allows same-site path %s", (p) => {
    expect(safeNextPath(p)).toBe(p);
  });
  it.each([
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/\t/evil.com",
    "evil.com",
    "",
    "/%0a/evil.com".replace("%0a", "\n"),
  ])("rejects %j", (p) => {
    expect(safeNextPath(p, "/home")).toBe("/home");
  });
  it("rejects non-strings", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(["/a"])).toBe("/");
  });
});

describe("cart cookie parsing", () => {
  it("round-trips", () => {
    const lines = [{ variantId: 3, qty: 2 }];
    expect(parseCart(serializeCart(lines))).toEqual(lines);
  });
  it("drops tampered entries: negative, zero, fractional, huge, non-numeric", () => {
    const raw = JSON.stringify([[1, -5], [2, 0], [3, 1.5], [4, 999], ["x", 1], [5, "2"], { a: 1 }, [6, 1, 1]]);
    expect(parseCart(raw)).toEqual([{ variantId: 5, qty: 2 }]);
  });
  it("merges duplicates and caps quantity", () => {
    expect(parseCart(JSON.stringify([[7, 15], [7, 15]]))).toEqual([{ variantId: 7, qty: 20 }]);
  });
  it("ignores garbage and oversize input", () => {
    expect(parseCart("not json")).toEqual([]);
    expect(parseCart('{"a":1}')).toEqual([]);
    expect(parseCart("[" + "[1,1],".repeat(2000) + "[1,1]]")).toEqual([]);
    expect(parseCart(undefined)).toEqual([]);
  });
  it("addToCart / setQty", () => {
    let c = addToCart([], 1, 2);
    c = addToCart(c, 1, 30);
    expect(c).toEqual([{ variantId: 1, qty: 20 }]);
    expect(setQty(c, 1, 0)).toEqual([]);
  });
});

describe("money", () => {
  it("parses rupee input strictly", () => {
    expect(parseRupeesToPaise("499")).toBe(49900);
    expect(parseRupeesToPaise("499.5")).toBe(49950);
    expect(parseRupeesToPaise("0.05")).toBe(5);
    for (const bad of ["-1", "1e3", "abc", "4.999", "", "12345678", " ", "Infinity"]) {
      expect(parseRupeesToPaise(bad)).toBeNull();
    }
  });
  it("shipping is free at the threshold", () => {
    expect(shippingFor(0)).toBe(0);
    expect(shippingFor(99_899)).toBe(9_900);
    expect(shippingFor(99_900)).toBe(0);
  });
  it("formats INR", () => {
    expect(formatINR(49900)).toBe("₹499");
    expect(formatINR(199900)).toBe("₹1,999");
  });
});

describe("validation", () => {
  it("normalises email and rejects weak passwords", () => {
    expect(signupSchema.parse({ name: "Asha", email: " A@B.COM ", password: "0123456789" }).email).toBe("a@b.com");
    expect(signupSchema.safeParse({ name: "Asha", email: "a@b.com", password: "short" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "Asha", email: "nope", password: "0123456789" }).success).toBe(false);
  });
  it("validates Indian phone and PIN", () => {
    const base = { name: "A B", address: "1234567890 street", city: "Pune", payment: "cod" };
    expect(shippingSchema.parse({ ...base, phone: "+91 98765-43210", pincode: "411001" }).phone).toBe("9876543210");
    expect(shippingSchema.safeParse({ ...base, phone: "1234567890", pincode: "411001" }).success).toBe(false);
    expect(shippingSchema.safeParse({ ...base, phone: "9876543210", pincode: "011001" }).success).toBe(false);
    expect(shippingSchema.safeParse({ ...base, phone: "9876543210", pincode: "411001", payment: "free" }).success).toBe(false);
  });
  it("strips control characters from forum posts", () => {
    const t = threadSchema.parse({ category: "General", title: "Hello\u0000 world", body: "body text\u0007 here" });
    expect(t.title).toBe("Hello world");
    expect(t.body).toBe("body text here");
  });
  it("only accepts https image URLs", () => {
    expect(imageUrlSchema.safeParse("https://x.com/a.jpg").success).toBe(true);
    expect(imageUrlSchema.safeParse("").success).toBe(true);
    for (const bad of ["javascript:alert(1)", "http://x.com/a.jpg", "data:image/png;base64,AA", "//x.com/a.jpg"]) {
      expect(imageUrlSchema.safeParse(bad).success).toBe(false);
    }
  });
  it("slugify", () => {
    expect(slugify("Peace Lily (Large)!")).toBe("peace-lily-large");
  });
});

describe("booking dates", () => {
  it("starts tomorrow (IST), excludes Mondays, spans 30 days", () => {
    const now = new Date("2026-11-04T20:00:00Z"); // 01:30 on 5 Nov in India
    expect(todayIST(now)).toBe("2026-11-05");
    const dates = bookableDates(now);
    expect(dates[0]).toBe("2026-11-06");
    expect(dates.every((d) => new Date(`${d}T00:00:00Z`).getUTCDay() !== 1)).toBe(true);
    expect(dates.at(-1)! <= "2026-12-05").toBe(true);
  });
});
