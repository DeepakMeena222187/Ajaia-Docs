import type { Metadata } from "next";
import Link from "next/link";
import { PlantCard } from "@/components/PlantCard";
import { listCategories, listPlants, type CatalogFilter } from "@/lib/catalog";

export const metadata: Metadata = { title: "Shop plants" };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const SORT_OPTIONS = [
  ["featured", "Featured"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["name", "Name A–Z"],
] as const;

export default async function PlantsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 60);
  const category = one(sp.category).slice(0, 40);
  const difficulty = ["Easy", "Moderate", "Expert"].includes(one(sp.difficulty)) ? one(sp.difficulty) : "";
  const sortRaw = one(sp.sort);
  const sort = (SORT_OPTIONS.some(([k]) => k === sortRaw) ? sortRaw : "featured") as CatalogFilter["sort"];
  const petSafe = one(sp.petSafe) === "1";
  const airPurifying = one(sp.air) === "1";

  const [plants, categories] = await Promise.all([
    listPlants({ q, category: category || undefined, difficulty: difficulty || undefined, petSafe, airPurifying, sort }),
    listCategories(),
  ]);

  return (
    <div className="container-page py-10">
      <p className="eyebrow">The nursery</p>
      <h1 className="mt-2 text-4xl font-semibold text-forest">{category || "All plants"}</h1>

      <form method="get" className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="label">Search</label>
          <input id="q" name="q" defaultValue={q} maxLength={60} placeholder="Monstera, tulsi, succulent…" className="input" />
        </div>
        <div>
          <label htmlFor="category" className="label">Category</label>
          <select id="category" name="category" defaultValue={category} className="input">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>{c.category}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="difficulty" className="label">Care level</label>
          <select id="difficulty" name="difficulty" defaultValue={difficulty} className="input">
            <option value="">Any</option>
            <option>Easy</option>
            <option>Moderate</option>
            <option>Expert</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="label">Sort by</label>
          <select id="sort" name="sort" defaultValue={sort} className="input">
            {SORT_OPTIONS.map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="petSafe" value="1" defaultChecked={petSafe} className="accent-moss" /> Pet-safe
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="air" value="1" defaultChecked={airPurifying} className="accent-moss" /> Air-purifying
          </label>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button className="btn-primary">Apply filters</button>
          <Link href="/plants" className="btn-ghost">Reset</Link>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted">{plants.length} plant{plants.length === 1 ? "" : "s"} found</p>
      {plants.length === 0 ? (
        <div className="card mt-4 p-10 text-center">
          <p className="text-lg text-forest">No plants match those filters.</p>
          <Link href="/plants" className="btn-ghost mt-4">Show all plants</Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plants.map((p) => (
            <PlantCard key={p.id} plant={p} />
          ))}
        </div>
      )}
    </div>
  );
}
