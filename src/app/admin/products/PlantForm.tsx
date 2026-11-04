import { savePlantAction } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";

const ARTS = ["monstera", "snake", "trailing", "flower", "palm", "leafy", "tree", "fern", "succulent", "cactus", "herb"];

export type PlantFormValues = {
  id?: number;
  name: string;
  scientific_name: string;
  category: string;
  summary: string;
  description: string;
  benefits: string[];
  light: string;
  water: string;
  difficulty: string;
  art: string;
  hue: number;
  image_url: string | null;
  pet_safe: boolean;
  air_purifying: boolean;
  featured: boolean;
  active: boolean;
};

export const EMPTY_PLANT: PlantFormValues = {
  name: "", scientific_name: "", category: "Indoor Foliage", summary: "", description: "", benefits: [],
  light: "", water: "", difficulty: "Easy", art: "leafy", hue: 130, image_url: "", pet_safe: false,
  air_purifying: false, featured: false, active: true,
};

export function PlantForm({ plant }: { plant: PlantFormValues }) {
  return (
    <ActionForm action={savePlantAction} className="card grid gap-4 p-6 sm:grid-cols-2">
      {plant.id && <input type="hidden" name="plantId" value={plant.id} />}
      <F label="Name"><input name="name" defaultValue={plant.name} required minLength={2} maxLength={80} className="input" /></F>
      <F label="Scientific name"><input name="scientific_name" defaultValue={plant.scientific_name} required maxLength={120} className="input" /></F>
      <F label="Category"><input name="category" defaultValue={plant.category} required maxLength={40} list="categories" className="input" /></F>
      <datalist id="categories">
        {["Indoor Foliage", "Succulents & Cacti", "Flowering", "Herbs & Medicinal", "Outdoor & Trees"].map((c) => <option key={c} value={c} />)}
      </datalist>
      <F label="Care difficulty">
        <select name="difficulty" defaultValue={plant.difficulty} className="input">
          <option>Easy</option><option>Moderate</option><option>Expert</option>
        </select>
      </F>
      <F label="Summary (one line)" wide><input name="summary" defaultValue={plant.summary} required minLength={10} maxLength={200} className="input" /></F>
      <F label="Description" wide><textarea name="description" defaultValue={plant.description} required minLength={10} maxLength={3000} rows={4} className="input" /></F>
      <F label="Benefits (one per line)" wide><textarea name="benefits" defaultValue={plant.benefits.join("\n")} rows={4} maxLength={2000} className="input" /></F>
      <F label="Light"><input name="light" defaultValue={plant.light} required maxLength={80} className="input" /></F>
      <F label="Water"><input name="water" defaultValue={plant.water} required maxLength={80} className="input" /></F>
      <F label="Photo URL (https://…, optional)" wide>
        <input name="image_url" type="url" defaultValue={plant.image_url ?? ""} maxLength={500} placeholder="https://images.example.com/monstera.jpg" className="input" />
      </F>
      <F label="Illustration (used when no photo)">
        <select name="art" defaultValue={plant.art} className="input">{ARTS.map((a) => <option key={a}>{a}</option>)}</select>
      </F>
      <F label="Illustration colour (hue 0–360)"><input name="hue" type="number" min={0} max={360} defaultValue={plant.hue} className="input" /></F>
      <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
        {([["pet_safe", "Pet-safe"], ["air_purifying", "Air-purifying"], ["featured", "Featured on home page"], ["active", "Visible in shop"]] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2">
            <input type="checkbox" name={k} defaultChecked={plant[k]} className="accent-moss" /> {label}
          </label>
        ))}
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Saving…">{plant.id ? "Save plant" : "Create plant"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function F({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
