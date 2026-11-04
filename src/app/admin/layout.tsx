import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Pages check again themselves: a layout alone isn't a reliable guard on client navigation.
  await requireAdmin();
  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
        <span className="mr-4 font-display text-2xl font-semibold text-forest">Admin</span>
        {[
          ["/admin", "Dashboard"],
          ["/admin/products", "Products & prices"],
          ["/admin/orders", "Orders"],
          ["/admin/bookings", "Bookings"],
          ["/forum", "Moderate forum"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-sage hover:text-forest">
            {label}
          </Link>
        ))}
      </div>
      <div className="pt-6">{children}</div>
    </div>
  );
}
