import Link from "next/link";
import { PlantArt } from "@/components/PlantArt";

export default function NotFound() {
  return (
    <div className="container-page grid place-items-center py-20 text-center">
      <div className="h-40 w-40 overflow-hidden rounded-3xl">
        <PlantArt art="cactus" hue={75} name="A lonely cactus" />
      </div>
      <h1 className="mt-6 text-4xl font-semibold text-forest">This page has wilted</h1>
      <p className="mt-2 text-muted">We couldn&apos;t find what you were looking for.</p>
      <Link href="/plants" className="btn-primary mt-6">Browse plants</Link>
    </div>
  );
}
