import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlantArt } from "@/components/PlantArt";
import { getPlantBySlug } from "@/lib/catalog";
import { BuyBox } from "./BuyBox";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const plant = await getPlantBySlug((await params).slug);
  return plant ? { title: plant.name, description: plant.summary } : { title: "Plant not found" };
}

export default async function PlantPage({ params }: Params) {
  const plant = await getPlantBySlug((await params).slug);
  if (!plant) notFound();

  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/plants" className="hover:text-moss">Plants</Link> /{" "}
        <Link href={`/plants?category=${encodeURIComponent(plant.category)}`} className="hover:text-moss">{plant.category}</Link> /{" "}
        <span className="text-ink">{plant.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="card aspect-square overflow-hidden">
          <PlantArt art={plant.art} hue={plant.hue} imageUrl={plant.image_url} name={plant.name} />
        </div>

        <div>
          <p className="eyebrow">{plant.category}</p>
          <h1 className="mt-2 text-4xl font-semibold text-forest">{plant.name}</h1>
          <p className="mt-1 italic text-muted">{plant.scientific_name}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">{plant.difficulty} care</span>
            {plant.pet_safe ? <span className="chip">Pet-safe</span> : <span className="chip bg-amber-100 text-amber-900">Keep away from pets</span>}
            {plant.air_purifying && <span className="chip">Air-purifying</span>}
          </div>
          <p className="mt-5 text-lg text-ink">{plant.summary}</p>

          <BuyBox variants={plant.variants} />

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <CareItem label="Light" value={plant.light} />
            <CareItem label="Water" value={plant.water} />
          </dl>
        </div>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="text-2xl font-semibold text-forest">About this plant</h2>
          <p className="mt-3 leading-relaxed text-ink">{plant.description}</p>

          <h2 className="mt-10 text-2xl font-semibold text-forest">Varieties available</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-sage/60 text-forest">
                <tr>
                  <th className="px-4 py-2 font-semibold">Variety</th>
                  <th className="px-4 py-2 font-semibold">Details</th>
                  <th className="px-4 py-2 text-right font-semibold">Availability</th>
                </tr>
              </thead>
              <tbody className="bg-paper">
                {plant.variants.map((v) => (
                  <tr key={v.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{v.name}</td>
                    <td className="px-4 py-3 text-muted">{v.description}</td>
                    <td className="px-4 py-3 text-right">
                      {v.stock > 0 ? <span className="text-moss">In stock</span> : <span className="text-muted">Sold out</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="card h-fit p-6">
          <h2 className="text-xl font-semibold text-forest">Benefits</h2>
          <ul className="mt-4 space-y-3">
            {plant.benefits.map((b) => (
              <li key={b} className="flex gap-3 text-sm">
                <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage text-xs text-forest">✓</span>
                {b}
              </li>
            ))}
          </ul>
          <Link href="/forum/new" className="mt-6 inline-block text-sm font-semibold text-moss hover:underline">
            Have a question about this plant? Ask the community →
          </Link>
        </aside>
      </div>
    </div>
  );
}

function CareItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper p-3 ring-1 ring-line">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
