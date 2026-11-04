import Link from "next/link";
import type { Plant } from "@/lib/catalog";
import { formatINR } from "@/lib/money";
import { PlantArt } from "./PlantArt";

export function PlantCard({ plant }: { plant: Plant }) {
  return (
    <Link
      href={`/plants/${plant.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(28,58,38,0.35)]"
    >
      <div className="relative aspect-square overflow-hidden">
        <PlantArt art={plant.art} hue={plant.hue} imageUrl={plant.image_url} name={plant.name} className="transition duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {plant.pet_safe && <span className="chip bg-white/90">Pet-safe</span>}
          {plant.air_purifying && <span className="chip bg-white/90">Air purifier</span>}
        </div>
        {!plant.in_stock && (
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white">Out of stock</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs text-muted">{plant.category}</p>
        <h3 className="text-lg font-semibold leading-snug text-forest">{plant.name}</h3>
        <p className="line-clamp-2 text-sm text-muted">{plant.summary}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm">
            {plant.min_price_paise !== null ? (
              <>
                <span className="text-muted">from </span>
                <span className="font-semibold text-ink">{formatINR(plant.min_price_paise)}</span>
              </>
            ) : (
              <span className="text-muted">Coming soon</span>
            )}
          </span>
          <span className="text-xs font-medium text-clay">{plant.difficulty} care →</span>
        </div>
      </div>
    </Link>
  );
}
