import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { readCart } from "@/lib/cart-cookie";
import { Logo } from "./Logo";

const NAV = [
  { href: "/plants", label: "Shop plants" },
  { href: "/guide", label: "Plant benefits" },
  { href: "/forum", label: "Community" },
  { href: "/book", label: "Book a visit" },
];

export async function Header() {
  const [user, cart] = await Promise.all([getCurrentUser(), readCart()]);
  const count = cart.reduce((n, l) => n + l.qty, 0);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-6">
        <Link href="/" className="flex items-center gap-2 text-forest" aria-label="Greenleaf home">
          <Logo className="h-8 w-8" />
          <span className="font-display text-xl font-semibold">Greenleaf</span>
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm text-muted hover:bg-sage hover:text-forest">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/cart" className="btn-ghost relative !px-4" aria-label={`Cart, ${count} items`}>
            <CartIcon />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <details className="relative">
              <summary className="btn-ghost cursor-pointer list-none !px-4">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-moss text-xs font-bold text-white">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-28 truncate sm:inline">{user.name}</span>
              </summary>
              <div className="card absolute right-0 mt-2 w-52 p-2 shadow-lg">
                <MenuLink href="/account">My account</MenuLink>
                <MenuLink href="/orders">My orders</MenuLink>
                <MenuLink href="/account#bookings">My bookings</MenuLink>
                {user.role === "admin" && <MenuLink href="/admin">Admin dashboard</MenuLink>}
                <form action={logoutAction}>
                  <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">Log out</button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden sm:inline-flex">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
      <nav aria-label="Main mobile" className="container-page flex gap-1 overflow-x-auto pb-2 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-full bg-paper px-3 py-1.5 text-xs text-muted">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-lg px-3 py-2 text-sm hover:bg-sage">
      {children}
    </Link>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20.5" r="1.3" />
      <circle cx="17" cy="20.5" r="1.3" />
    </svg>
  );
}
