import Link from "next/link";
import { PlantArt } from "@/components/PlantArt";
import { PlantCard } from "@/components/PlantCard";
import { listCategories, listFeatured } from "@/lib/catalog";

const CATEGORY_ART: Record<string, { art: string; hue: number }> = {
  "Indoor Foliage": { art: "monstera", hue: 150 },
  "Succulents & Cacti": { art: "succulent", hue: 120 },
  Flowering: { art: "flower", hue: 350 },
  "Herbs & Medicinal": { art: "herb", hue: 115 },
  "Outdoor & Trees": { art: "tree", hue: 105 },
};

export default async function Home() {
  const [featured, categories] = await Promise.all([listFeatured(8), listCategories()]);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="eyebrow">Nursery-grown · Delivered across India</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] text-forest sm:text-5xl lg:text-6xl">
              Bring home plants that make every room breathe easier.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              From air-purifying snake plants to sacred tulsi, every Greenleaf plant comes with honest care notes, its real
              benefits, and a community that helps it thrive.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/plants" className="btn-primary !px-7 !py-3">
                Shop all plants
              </Link>
              <Link href="/guide" className="btn-ghost !px-7 !py-3">
                Discover plant benefits
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
              <Stat value="23+" label="plant species" />
              <Stat value="₹999" label="free delivery above" />
              <Stat value="7-day" label="healthy-plant promise" />
            </dl>
          </div>
          <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4">
            <div className="card col-span-2 aspect-[2/1] overflow-hidden">
              <PlantArt art="monstera" hue={150} name="Monstera illustration" />
            </div>
            <div className="card aspect-square overflow-hidden">
              <PlantArt art="snake" hue={120} name="Snake plant illustration" />
            </div>
            <div className="card aspect-square overflow-hidden">
              <PlantArt art="flower" hue={350} name="Anthurium illustration" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Browse</p>
            <h2 className="mt-2 text-3xl font-semibold text-forest">Shop by category</h2>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => {
            const a = CATEGORY_ART[c.category] ?? { art: "leafy", hue: 130 };
            return (
              <Link key={c.category} href={`/plants?category=${encodeURIComponent(c.category)}`} className="card group overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <PlantArt art={a.art} hue={a.hue} name={c.category} className="transition group-hover:scale-105" />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-forest">{c.category}</p>
                  <p className="text-xs text-muted">{c.count} plants</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Customer favourites</p>
            <h2 className="mt-2 text-3xl font-semibold text-forest">Bestselling plants</h2>
          </div>
          <Link href="/plants" className="text-sm font-semibold text-moss hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <PlantCard key={p.id} plant={p} />
          ))}
        </div>
      </section>

      <section className="container-page py-10">
        <div className="grid gap-5 rounded-3xl bg-forest p-8 text-sage sm:p-12 md:grid-cols-3">
          <Feature title="Air you can feel" text="Snake plants, pothos and peace lilies were studied for filtering common indoor pollutants." />
          <Feature title="Safe for pets" text="Filter for plants that are non-toxic to cats and dogs before you buy." />
          <Feature title="Expert help, booked" text="Book a video consultation or a guided nursery visit with our gardeners." />
          <div className="md:col-span-3">
            <Link href="/book" className="btn-accent">
              Book a plant expert
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="card flex flex-col items-start justify-between gap-4 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-forest">Got a yellow leaf? Ask the community.</h2>
            <p className="mt-1 text-muted">Share photos of your garden, swap tips and get help with pests and problems.</p>
          </div>
          <Link href="/forum" className="btn-primary">
            Visit the forum
          </Link>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-2xl font-semibold text-forest">{value}</dd>
      <dd className="text-xs text-muted">{label}</dd>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-sage/80">{text}</p>
    </div>
  );
}
