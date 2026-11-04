import { cookies } from "next/headers";
import { parseCart, serializeCart, type CartLine } from "./cart";

// Kept out of "use server" files on purpose: every export there becomes a public endpoint.
const CART_COOKIE = "gl_cart";

export async function readCart(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCart(lines: CartLine[]): Promise<void> {
  (await cookies()).set(CART_COOKIE, serializeCart(lines), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCart(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}
