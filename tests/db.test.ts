import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { addVariant, updateVariant } from "@/lib/admin";
import { cancelBookingByCustomer, createBooking, bookableDates, MAX_ACTIVE_BOOKINGS } from "@/lib/bookings";
import { getPlantBySlug, listPlants } from "@/lib/catalog";
import { pool, query } from "@/lib/db";
import { createReply, createThread, deletePost, deleteThread, setThreadLocked } from "@/lib/forum";
import { cancelOrderByCustomer, getOrder, placeOrder, setOrderStatusByAdmin } from "@/lib/orders";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { createSessionRecord, deleteAllSessionsForUser, deleteSessionRecord, validateSessionToken } from "@/lib/session";
import { authenticate, changePassword, registerUser } from "@/lib/users";
import { makeUser, ship, variantBySlug } from "./helpers";

afterAll(async () => {
  await pool().end();
});

describe("accounts", () => {
  it("registers, rejects duplicate email case-insensitively, and stores only a hash", async () => {
    const email = `dup-${randomUUID()}@example.com`;
    const a = await registerUser("A", email, "password-123456");
    expect(a.ok).toBe(true);
    const b = await registerUser("B", email.toUpperCase(), "password-123456");
    expect(b).toEqual({ ok: false, error: "An account with this email already exists." });
    const row = (await query("SELECT password_hash FROM users WHERE lower(email) = lower($1)", [email])).rows[0];
    expect(row.password_hash).not.toContain("password-123456");
    expect(await verifyPassword("password-123456", row.password_hash)).toBe(true);
  });

  it("authenticates with the same message for wrong password and unknown email", async () => {
    const u = await makeUser();
    expect((await authenticate(u.email, "a long enough password")).ok).toBe(true);
    const wrong = await authenticate(u.email, "nope nope nope");
    const unknown = await authenticate("nobody-" + randomUUID() + "@example.com", "nope nope nope");
    expect(wrong).toEqual(unknown);
  });

  it("changePassword requires the current password", async () => {
    const u = await makeUser();
    expect((await changePassword(u.id, "wrong", "brand new password")).ok).toBe(false);
    expect((await changePassword(u.id, "a long enough password", "brand new password")).ok).toBe(true);
    expect((await authenticate(u.email, "brand new password")).ok).toBe(true);
  });
});

describe("sessions", () => {
  it("validates, rejects tampered tokens, and logs out", async () => {
    const u = await makeUser();
    const { token } = await createSessionRecord(u.id);
    expect((await validateSessionToken(token))?.id).toBe(u.id);
    expect(await validateSessionToken(token + "x")).toBeNull();
    expect(await validateSessionToken("' OR 1=1 --")).toBeNull();
    expect(await validateSessionToken(undefined)).toBeNull();
    await deleteSessionRecord(token);
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("stores only the token hash", async () => {
    const u = await makeUser();
    const { token } = await createSessionRecord(u.id);
    const rows = (await query("SELECT id FROM sessions WHERE user_id = $1", [u.id])).rows;
    expect(rows.map((r) => r.id)).not.toContain(token);
  });

  it("expired sessions are rejected", async () => {
    const u = await makeUser();
    const { token } = await createSessionRecord(u.id);
    await query("UPDATE sessions SET expires_at = now() - interval '1 second' WHERE user_id = $1", [u.id]);
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("can sign out all other devices", async () => {
    const u = await makeUser();
    const keep = await createSessionRecord(u.id);
    const other = await createSessionRecord(u.id);
    await deleteAllSessionsForUser(u.id, keep.token);
    expect(await validateSessionToken(keep.token)).not.toBeNull();
    expect(await validateSessionToken(other.token)).toBeNull();
  });
});

describe("catalog", () => {
  it("search treats SQL and LIKE wildcards as plain text", async () => {
    expect(await listPlants({ q: "' OR 1=1 --" })).toEqual([]);
    expect(await listPlants({ q: "%" })).toEqual([]);
    expect((await listPlants({ q: "tulsi" })).map((p) => p.slug)).toEqual(["tulsi-holy-basil"]);
  });
  it("rejects malformed slugs", async () => {
    expect(await getPlantBySlug("../../etc/passwd")).toBeNull();
    expect(await getPlantBySlug("monstera-deliciosa")).not.toBeNull();
  });
});

describe("orders", () => {
  it("charges database prices and decrements stock", async () => {
    const u = await makeUser();
    const v = await variantBySlug("jade-plant");
    const res = await placeOrder(u.id, [{ variantId: v.id, qty: 2 }], ship, randomUUID());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const order = await getOrder(res.orderId, u.id);
    expect(order?.subtotal_paise).toBe(v.price_paise * 2);
    expect(order?.total_paise).toBe(order!.subtotal_paise + order!.shipping_paise);
    expect((await variantBySlug("jade-plant")).stock).toBe(v.stock - 2);
  });

  it("rejects invalid quantities and empty carts", async () => {
    const u = await makeUser();
    const v = await variantBySlug("jade-plant");
    for (const qty of [0, -1, 21, 1.5]) {
      expect((await placeOrder(u.id, [{ variantId: v.id, qty }], ship, randomUUID())).ok).toBe(false);
    }
    expect((await placeOrder(u.id, [], ship, randomUUID())).ok).toBe(false);
  });

  it("refuses to oversell and rolls back the whole order", async () => {
    const u = await makeUser();
    const a = await variantBySlug("anthurium", 2);
    const b = await variantBySlug("monstera-deliciosa", 3);
    await updateVariant(b.id, { name: "Variegata (Medium)", description: "x", price_paise: b.price_paise, stock: 1, active: true });
    const res = await placeOrder(u.id, [{ variantId: a.id, qty: 1 }, { variantId: b.id, qty: 2 }], ship, randomUUID());
    expect(res.ok).toBe(false);
    expect((await variantBySlug("anthurium", 2)).stock).toBe(a.stock);
  });

  it("concurrent buyers can't take the last item twice", async () => {
    const v = await variantBySlug("string-of-pearls");
    await updateVariant(v.id, { name: "Hanging pot", description: "x", price_paise: v.price_paise, stock: 1, active: true });
    const buyers = await Promise.all([makeUser(), makeUser(), makeUser(), makeUser()]);
    const results = await Promise.all(buyers.map((b) => placeOrder(b.id, [{ variantId: v.id, qty: 1 }], ship, randomUUID())));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await variantBySlug("string-of-pearls")).stock).toBe(0);
  });

  it("is idempotent for double-submits", async () => {
    const u = await makeUser();
    const v = await variantBySlug("mint");
    const key = randomUUID();
    const [r1, r2] = await Promise.all([
      placeOrder(u.id, [{ variantId: v.id, qty: 1 }], ship, key),
      placeOrder(u.id, [{ variantId: v.id, qty: 1 }], ship, key),
    ]);
    expect(r1.ok && r2.ok && r1.orderId === r2.orderId).toBe(true);
    expect((await variantBySlug("mint")).stock).toBe(v.stock - 1);
  });

  it("won't sell inactive variants", async () => {
    const u = await makeUser();
    const v = await variantBySlug("neem-sapling");
    await updateVariant(v.id, { name: "Sapling (1 ft)", description: "x", price_paise: v.price_paise, stock: v.stock, active: false });
    expect((await placeOrder(u.id, [{ variantId: v.id, qty: 1 }], ship, randomUUID())).ok).toBe(false);
  });

  it("customers can't read or cancel other customers' orders (IDOR)", async () => {
    const owner = await makeUser();
    const attacker = await makeUser();
    const v = await variantBySlug("lemongrass");
    const res = await placeOrder(owner.id, [{ variantId: v.id, qty: 1 }], ship, randomUUID());
    if (!res.ok) throw new Error(res.error);
    expect(await getOrder(res.orderId, attacker.id)).toBeNull();
    expect(await cancelOrderByCustomer(res.orderId, attacker.id)).toBe(false);
    expect(await cancelOrderByCustomer(res.orderId, owner.id)).toBe(true);
    expect((await variantBySlug("lemongrass")).stock).toBe(v.stock);
    // Already cancelled: can't cancel twice (would double-restock).
    expect(await cancelOrderByCustomer(res.orderId, owner.id)).toBe(false);
    expect((await variantBySlug("lemongrass")).stock).toBe(v.stock);
  });

  it("admin status transitions follow the allowed flow", async () => {
    const u = await makeUser();
    const v = await variantBySlug("curry-leaf");
    const res = await placeOrder(u.id, [{ variantId: v.id, qty: 1 }], ship, randomUUID());
    if (!res.ok) throw new Error(res.error);
    expect(await setOrderStatusByAdmin(res.orderId, "delivered")).toBe(false);
    expect(await setOrderStatusByAdmin(res.orderId, "confirmed")).toBe(true);
    expect(await cancelOrderByCustomer(res.orderId, u.id)).toBe(false);
    expect(await setOrderStatusByAdmin(res.orderId, "shipped")).toBe(true);
    expect(await setOrderStatusByAdmin(res.orderId, "cancelled")).toBe(false);
  });
});

describe("bookings", () => {
  it("books a slot once; a second booking of the same slot fails", async () => {
    const [a, b] = [await makeUser(), await makeUser()];
    const date = bookableDates()[5];
    const r1 = await createBooking(a.id, { service: "consultation", date, time: "10:00", notes: "" });
    const r2 = await createBooking(b.id, { service: "consultation", date, time: "10:00", notes: "" });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(false);
  });

  it("parallel requests for one slot: exactly one wins", async () => {
    const users = await Promise.all([makeUser(), makeUser(), makeUser()]);
    const date = bookableDates()[6];
    const res = await Promise.all(users.map((u) => createBooking(u.id, { service: "nursery_visit", date, time: "14:00", notes: "" })));
    expect(res.filter((r) => r.ok)).toHaveLength(1);
  });

  it("rejects past/today/far-future dates and caps active bookings", async () => {
    const u = await makeUser();
    for (const date of ["2020-01-01", new Date().toISOString().slice(0, 10), "2099-01-01"]) {
      expect((await createBooking(u.id, { service: "consultation", date, time: "11:30", notes: "" })).ok).toBe(false);
    }
    const dates = bookableDates();
    for (let i = 0; i < MAX_ACTIVE_BOOKINGS; i++) {
      expect((await createBooking(u.id, { service: "consultation", date: dates[10 + i], time: "17:00", notes: "" })).ok).toBe(true);
    }
    expect((await createBooking(u.id, { service: "consultation", date: dates[20], time: "17:00", notes: "" })).ok).toBe(false);
  });

  it("only the owner can cancel, and the slot frees up", async () => {
    const [owner, other] = [await makeUser(), await makeUser()];
    const date = bookableDates()[8];
    const r = await createBooking(owner.id, { service: "home_setup", date, time: "15:30", notes: "" });
    if (!r.ok) throw new Error(r.error);
    expect(await cancelBookingByCustomer(r.id, other.id)).toBe(false);
    expect(await cancelBookingByCustomer(r.id, owner.id)).toBe(true);
    expect((await createBooking(other.id, { service: "home_setup", date, time: "15:30", notes: "" })).ok).toBe(true);
  });
});

describe("security regressions", () => {
  it("parallel bookings can't exceed the per-user cap", async () => {
    const u = await makeUser();
    const dates = bookableDates();
    const res = await Promise.all(
      [0, 1, 2, 3, 4, 5].map((i) => createBooking(u.id, { service: "consultation", date: dates[i + 12], time: "11:30", notes: "" })),
    );
    expect(res.filter((r) => r.ok)).toHaveLength(MAX_ACTIVE_BOOKINGS);
  });

  it("admin stock save is refused if stock changed meanwhile", async () => {
    const v = await variantBySlug("hibiscus");
    const fields = { name: "Red single", description: "8-inch pot", price_paise: v.price_paise, active: true };
    const u = await makeUser();
    await placeOrder(u.id, [{ variantId: v.id, qty: 1 }], ship, randomUUID());
    expect(await updateVariant(v.id, { ...fields, stock: 100 }, v.stock)).toBe("stock_changed");
    expect(await updateVariant(v.id, { ...fields, stock: 100 }, v.stock - 1)).toBe("ok");
  });

  it("addVariant on a missing plant returns false instead of crashing", async () => {
    expect(await addVariant(99_999_999, { name: "x", description: "", price_paise: 100, stock: 1 })).toBe(false);
  });
});

describe("forum", () => {
  it("authors can delete their own content but not others'; admins can delete anything", async () => {
    const [author, stranger, admin] = [await makeUser(), await makeUser(), await makeUser("admin")];
    const t = await createThread(author.id, "General", "A title here", "Body body body");
    await createReply(stranger.id, t, "a reply");
    const post = (await query<{ id: number }>("SELECT id::int FROM forum_posts WHERE thread_id = $1", [t])).rows[0];
    expect(await deleteThread(t, stranger)).toBe(false);
    expect(await deletePost(post.id, author)).toBeNull();
    expect(await deletePost(post.id, admin)).toBe(t);
    expect(await deleteThread(t, author)).toBe(true);
  });

  it("locked threads reject replies", async () => {
    const u = await makeUser();
    const t = await createThread(u.id, "General", "Locked title", "Body body body");
    await setThreadLocked(t, true);
    expect((await createReply(u.id, t, "hello")).ok).toBe(false);
  });
});

describe("rate limiting", () => {
  it("allows up to the limit within a window", async () => {
    const key = "test:" + randomUUID();
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await rateLimit(key, 3, 60));
    expect(results).toEqual([true, true, true, false, false]);
  });
  it("is atomic under concurrency", async () => {
    const key = "test:" + randomUUID();
    const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit(key, 5, 60)));
    expect(results.filter(Boolean)).toHaveLength(5);
  });
});
