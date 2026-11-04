import { addVariantAction, updateVariantAction } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";

type V = { id: number; name: string; description: string; price_paise: number; stock: number; active: boolean };

const rupees = (paise: number) => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));

export function VariantRow({ v }: { v: V }) {
  return (
    <ActionForm action={updateVariantAction} className="grid items-end gap-2 rounded-xl bg-white p-3 ring-1 ring-line sm:grid-cols-[1.2fr_1.6fr_0.8fr_0.7fr_auto_auto]">
      <input type="hidden" name="variantId" value={v.id} />
      <Small label="Variant">
        <input name="name" defaultValue={v.name} required maxLength={60} className="input !py-1.5" />
      </Small>
      <Small label="Description">
        <input name="description" defaultValue={v.description} maxLength={200} className="input !py-1.5" />
      </Small>
      <Small label="Price (₹)">
        <input name="price" defaultValue={rupees(v.price_paise)} required inputMode="decimal" pattern="\d{1,7}(\.\d{1,2})?" className="input !py-1.5" />
      </Small>
      <Small label="Stock">
        <input name="stock" type="number" min={0} max={100000} defaultValue={v.stock} required className="input !py-1.5" />
      </Small>
      <label className="flex items-center gap-1.5 pb-2 text-xs">
        <input type="checkbox" name="active" defaultChecked={v.active} className="accent-moss" /> On sale
      </label>
      <SubmitButton className="btn-primary !py-1.5 text-xs" pendingText="Saving…">Save</SubmitButton>
    </ActionForm>
  );
}

export function AddVariantForm({ plantId }: { plantId: number }) {
  return (
    <ActionForm action={addVariantAction} className="grid items-end gap-2 rounded-xl border border-dashed border-line p-3 sm:grid-cols-[1.2fr_1.6fr_0.8fr_0.7fr_auto]">
      <input type="hidden" name="plantId" value={plantId} />
      <Small label="New variant">
        <input name="name" required maxLength={60} placeholder="e.g. Extra large" className="input !py-1.5" />
      </Small>
      <Small label="Description">
        <input name="description" maxLength={200} placeholder="14-inch planter" className="input !py-1.5" />
      </Small>
      <Small label="Price (₹)">
        <input name="price" required inputMode="decimal" pattern="\d{1,7}(\.\d{1,2})?" className="input !py-1.5" />
      </Small>
      <Small label="Stock">
        <input name="stock" type="number" min={0} max={100000} defaultValue={0} required className="input !py-1.5" />
      </Small>
      <SubmitButton className="btn-ghost !py-1.5 text-xs" pendingText="Adding…">Add</SubmitButton>
    </ActionForm>
  );
}

function Small({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
