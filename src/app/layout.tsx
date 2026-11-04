import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Greenleaf — Plants delivered to your door", template: "%s · Greenleaf" },
  description:
    "Shop indoor plants, succulents, herbs and flowering plants. Learn each plant's benefits and care, join the community, and book a plant expert.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-2">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="mt-20 bg-forest text-sage">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-white">
            <Logo className="h-8 w-8" />
            <span className="font-display text-xl">Greenleaf</span>
          </div>
          <p className="mt-3 text-sm text-sage/80">Healthy, nursery-grown plants with honest care advice, delivered across India.</p>
        </div>
        <FooterCol title="Shop" links={[["/plants", "All plants"], ["/plants?category=Indoor+Foliage", "Indoor foliage"], ["/plants?category=Succulents+%26+Cacti", "Succulents & cacti"], ["/plants?petSafe=1", "Pet-safe plants"]]} />
        <FooterCol title="Learn" links={[["/guide", "Plant benefits"], ["/forum", "Community forum"], ["/book", "Book an expert"]]} />
        <FooterCol title="Account" links={[["/account", "My account"], ["/orders", "My orders"], ["/cart", "Cart"]]} />
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-sage/60">© {new Date().getFullYear()} Greenleaf. All plants are nursery-grown.</div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="font-sans text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-sage/80 hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
