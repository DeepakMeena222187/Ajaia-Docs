import type { Metadata } from "next";
import Link from "next/link";
import { dashboardStats } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/money";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  await requireAdmin();
  const s = await dashboardStats();
  const tiles = [
    ["Revenue (excl. cancelled)", formatINR(s.revenue), "/admin/orders"],
    ["Open orders", s.open_orders, "/admin/orders?status=placed"],
    ["Total orders", s.orders, "/admin/orders"],
    ["Low-stock variants (<5)", s.low_stock, "/admin/products"],
    ["Upcoming bookings", s.upcoming_bookings, "/admin/bookings"],
    ["Customers", s.users, "/admin"],
    ["Forum threads", s.threads, "/forum"],
  ] as const;
  return (
    <div>
      <h1 className="text-3xl font-semibold text-forest">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value, href]) => (
          <Link key={label} href={href} className="card p-5 hover:border-moss">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-forest">{value}</p>
          </Link>
        ))}
      </div>
      <div className="card mt-6 p-5 text-sm text-muted">
        <strong className="text-ink">Setting prices:</strong> open <Link className="text-moss underline" href="/admin/products">Products &amp; prices</Link>,
        change a variant&apos;s price or stock and press Save. Prices take effect for new orders immediately; past orders keep the price they were placed at.
      </div>
    </div>
  );
}
