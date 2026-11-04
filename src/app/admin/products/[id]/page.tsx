import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlantForEdit, listAllPlantsWithVariants } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { PlantForm } from "../PlantForm";
import { AddVariantForm, VariantRow } from "../VariantForms";

export const metadata: Metadata = { title: "Edit plant" };

export default async function EditPlantPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const plant = /^\d{1,12}$/.test(id) ? await getPlantForEdit(Number(id)) : null;
  if (!plant) notFound();
  const variants = (await listAllPlantsWithVariants()).find((p) => p.id === plant.id)?.variants ?? [];

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-moss hover:underline">← All products</Link>
      <h1 className="mb-6 mt-2 text-3xl font-semibold text-forest">Edit {plant.name}</h1>
      <PlantForm plant={plant} />
      <h2 className="mb-3 mt-8 text-xl font-semibold text-forest">Varieties &amp; prices</h2>
      <div className="space-y-2">
        {variants.map((v) => (
          <VariantRow key={v.id} v={v} />
        ))}
        <AddVariantForm plantId={plant.id} />
      </div>
    </div>
  );
}
