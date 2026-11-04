import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { EMPTY_PLANT, PlantForm } from "../PlantForm";

export const metadata: Metadata = { title: "Add a plant" };

export default async function NewPlantPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold text-forest">Add a plant</h1>
      <PlantForm plant={EMPTY_PLANT} />
    </div>
  );
}
