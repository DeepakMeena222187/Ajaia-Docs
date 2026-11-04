import type { Metadata } from "next";
import Link from "next/link";
import { listAllPlantsWithVariants } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { AddVariantForm, VariantRow } from "./VariantForms";

export const metadata: Metadata = { title: "Products & prices" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const plants = await listAllPlantsWithVariants();
  const created = (await searchParams).created === "1";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-forest">Products &amp; prices</h1>
        <Link href="/admin/products/new" className="btn-primary">Add a plant</Link>
      </div>
      {created && <p role="status" className="mt-3 rounded-xl bg-sage px-3 py-2 text-sm text-forest">Plant created. Add its variants and prices below.</p>}
      <div className="mt-6 space-y-6">
        {plants.map((p) => (
          <section key={p.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-forest">{p.name}</h2>
              <span className="chip">{p.category}</span>
              {!p.active && <span className="chip bg-stone-200 text-stone-700">Hidden</span>}
              {p.featured && <span className="chip bg-amber-100 text-amber-900">Featured</span>}
              <Link href={`/admin/products/${p.id}`} className="ml-auto text-sm font-semibold text-moss hover:underline">Edit details</Link>
              <Link href={`/plants/${p.slug}`} className="text-sm text-muted hover:underline">View</Link>
            </div>
            <div className="mt-3 space-y-2">
              {p.variants.map((v) => (
                <VariantRow key={v.id} v={v} />
              ))}
              <AddVariantForm plantId={p.id} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
