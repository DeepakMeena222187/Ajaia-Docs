import { isUniqueViolation, query } from "./db";
import { slugify } from "./validation";

export type PlantInput = {
  name: string;
  scientific_name: string;
  category: string;
  summary: string;
  description: string;
  benefits: string[];
  light: string;
  water: string;
  difficulty: "Easy" | "Moderate" | "Expert";
  art: string;
  hue: number;
  image_url: string;
  pet_safe: boolean;
  air_purifying: boolean;
  featured: boolean;
  active: boolean;
};

const FIELDS = [
  "name", "scientific_name", "category", "summary", "description", "benefits", "light", "water",
  "difficulty", "art", "hue", "image_url", "pet_safe", "air_purifying", "featured", "active",
] as const;

function values(p: PlantInput) {
  return FIELDS.map((f) => (f === "image_url" ? p.image_url || null : p[f]));
}

export async function createPlant(p: PlantInput): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const slug = slugify(p.name);
  if (!slug) return { ok: false, error: "Name must contain letters or numbers." };
  try {
    await query(
      `INSERT INTO plants (slug, ${FIELDS.join(", ")}) VALUES ($1, ${FIELDS.map((_, i) => `$${i + 2}`).join(", ")})`,
      [slug, ...values(p)],
    );
    return { ok: true, slug };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "A plant with this name already exists." };
    throw err;
  }
}

export async function updatePlant(id: number, p: PlantInput): Promise<boolean> {
  const res = await query(
    `UPDATE plants SET ${FIELDS.map((f, i) => `${f} = $${i + 2}`).join(", ")} WHERE id = $1`,
    [id, ...values(p)],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function listAllPlantsWithVariants() {
  const plants = await query<{ id: number; slug: string; name: string; category: string; active: boolean; featured: boolean }>(
    "SELECT id::int, slug, name, category, active, featured FROM plants ORDER BY name",
  );
  const variants = await query<{ id: number; plant_id: number; name: string; description: string; price_paise: number; stock: number; active: boolean }>(
    "SELECT id::int, plant_id::int, name, description, price_paise, stock, active FROM variants ORDER BY plant_id, sort_order, id",
  );
  return plants.rows.map((p) => ({ ...p, variants: variants.rows.filter((v) => v.plant_id === p.id) }));
}

/**
 * Updates a variant. When `stockWas` is given, stock is only written if it still has that
 * value — so an order placed while the admin had the form open isn't silently undone.
 */
export async function updateVariant(
  id: number,
  v: { name: string; description: string; price_paise: number; stock: number; active: boolean },
  stockWas?: number,
): Promise<"ok" | "not_found" | "stock_changed"> {
  const res = await query(
    `UPDATE variants SET name = $2, description = $3, price_paise = $4, stock = $5, active = $6
     WHERE id = $1 ${stockWas === undefined ? "" : "AND stock = $7"}`,
    stockWas === undefined
      ? [id, v.name, v.description, v.price_paise, v.stock, v.active]
      : [id, v.name, v.description, v.price_paise, v.stock, v.active, stockWas],
  );
  if ((res.rowCount ?? 0) > 0) return "ok";
  const exists = await query("SELECT 1 FROM variants WHERE id = $1", [id]);
  return exists.rowCount ? "stock_changed" : "not_found";
}

export async function addVariant(
  plantId: number,
  v: { name: string; description: string; price_paise: number; stock: number },
): Promise<boolean> {
  const res = await query(
    `INSERT INTO variants (plant_id, name, description, price_paise, stock, sort_order)
     SELECT p.id, $2, $3, $4, $5,
            coalesce((SELECT max(sort_order) + 1 FROM variants WHERE plant_id = p.id), 0)
     FROM plants p WHERE p.id = $1
     RETURNING id`,
    [plantId, v.name, v.description, v.price_paise, v.stock],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function listAllOrders(status: string | null) {
  const res = await query<{ id: number; status: string; total_paise: number; created_at: Date; email: string; ship_name: string; ship_city: string }>(
    `SELECT o.id::int, o.status, o.total_paise, o.created_at, u.email, o.ship_name, o.ship_city
     FROM orders o JOIN users u ON u.id = o.user_id
     ${status ? "WHERE o.status = $1" : ""} ORDER BY o.created_at DESC LIMIT 300`,
    status ? [status] : [],
  );
  return res.rows;
}

export async function dashboardStats() {
  const res = await query<{ users: number; orders: number; open_orders: number; revenue: number; low_stock: number; upcoming_bookings: number; threads: number }>(
    `SELECT
       (SELECT count(*)::int FROM users) AS users,
       (SELECT count(*)::int FROM orders) AS orders,
       (SELECT count(*)::int FROM orders WHERE status IN ('placed','confirmed')) AS open_orders,
       (SELECT coalesce(sum(total_paise),0)::int FROM orders WHERE status <> 'cancelled') AS revenue,
       (SELECT count(*)::int FROM variants WHERE active AND stock < 5) AS low_stock,
       (SELECT count(*)::int FROM bookings WHERE status = 'booked' AND slot_date >= current_date) AS upcoming_bookings,
       (SELECT count(*)::int FROM forum_threads) AS threads`,
  );
  return res.rows[0];
}

export async function getPlantForEdit(id: number) {
  const res = await query<PlantInput & { id: number; slug: string; image_url: string | null }>(
    `SELECT id::int, slug, ${FIELDS.join(", ")} FROM plants WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}
