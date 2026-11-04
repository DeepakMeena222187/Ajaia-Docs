import { query } from "./db";

export type Variant = {
  id: number;
  name: string;
  description: string;
  price_paise: number;
  stock: number;
  active: boolean;
};

export type Plant = {
  id: number;
  slug: string;
  name: string;
  scientific_name: string;
  category: string;
  summary: string;
  description: string;
  benefits: string[];
  light: string;
  water: string;
  difficulty: "Easy" | "Moderate" | "Expert";
  pet_safe: boolean;
  air_purifying: boolean;
  art: string;
  hue: number;
  image_url: string | null;
  featured: boolean;
  active: boolean;
  min_price_paise: number | null;
  in_stock: boolean;
};

const PLANT_COLUMNS = `p.id::int, p.slug, p.name, p.scientific_name, p.category, p.summary, p.description,
  p.benefits, p.light, p.water, p.difficulty, p.pet_safe, p.air_purifying, p.art, p.hue, p.image_url,
  p.featured, p.active,
  (SELECT min(v.price_paise) FROM variants v WHERE v.plant_id = p.id AND v.active) AS min_price_paise,
  EXISTS (SELECT 1 FROM variants v WHERE v.plant_id = p.id AND v.active AND v.stock > 0) AS in_stock`;

export type CatalogFilter = {
  q?: string;
  category?: string;
  petSafe?: boolean;
  airPurifying?: boolean;
  difficulty?: string;
  sort?: "featured" | "price_asc" | "price_desc" | "name";
};

const SORTS: Record<NonNullable<CatalogFilter["sort"]>, string> = {
  featured: "p.featured DESC, p.name ASC",
  price_asc: "min_price_paise ASC NULLS LAST, p.name ASC",
  price_desc: "min_price_paise DESC NULLS LAST, p.name ASC",
  name: "p.name ASC",
};

export async function listPlants(filter: CatalogFilter = {}): Promise<Plant[]> {
  const where = ["p.active"];
  const params: unknown[] = [];
  if (filter.q) {
    params.push(`%${filter.q.replace(/[\\%_]/g, (c) => "\\" + c)}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.scientific_name ILIKE $${params.length} OR p.summary ILIKE $${params.length})`);
  }
  if (filter.category) {
    params.push(filter.category);
    where.push(`p.category = $${params.length}`);
  }
  if (filter.difficulty) {
    params.push(filter.difficulty);
    where.push(`p.difficulty = $${params.length}`);
  }
  if (filter.petSafe) where.push("p.pet_safe");
  if (filter.airPurifying) where.push("p.air_purifying");
  // Sort comes from a fixed whitelist, never from raw user input.
  const order = SORTS[filter.sort ?? "featured"] ?? SORTS.featured;
  const res = await query<Plant>(
    `SELECT ${PLANT_COLUMNS} FROM plants p WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT 200`,
    params,
  );
  return res.rows;
}

export async function listFeatured(limit = 8): Promise<Plant[]> {
  const res = await query<Plant>(
    `SELECT ${PLANT_COLUMNS} FROM plants p WHERE p.active AND p.featured ORDER BY p.name LIMIT $1`,
    [limit],
  );
  return res.rows;
}

export async function listCategories(): Promise<{ category: string; count: number }[]> {
  const res = await query<{ category: string; count: number }>(
    "SELECT category, count(*)::int AS count FROM plants WHERE active GROUP BY category ORDER BY category",
  );
  return res.rows;
}

export async function getPlantBySlug(
  slug: string,
  { includeInactive = false } = {},
): Promise<(Plant & { variants: Variant[] }) | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const res = await query<Plant>(
    `SELECT ${PLANT_COLUMNS} FROM plants p WHERE p.slug = $1 ${includeInactive ? "" : "AND p.active"}`,
    [slug],
  );
  const plant = res.rows[0];
  if (!plant) return null;
  const variants = await query<Variant>(
    `SELECT id::int, name, description, price_paise, stock, active FROM variants
     WHERE plant_id = $1 ${includeInactive ? "" : "AND active"} ORDER BY sort_order, id`,
    [plant.id],
  );
  return { ...plant, variants: variants.rows };
}

export type CartVariantInfo = {
  variant_id: number;
  variant_name: string;
  price_paise: number;
  stock: number;
  plant_name: string;
  plant_slug: string;
  art: string;
  hue: number;
  image_url: string | null;
};

/** Live info for purchasable variants; inactive variants/plants are omitted. */
export async function getVariantsForCart(ids: number[]): Promise<Map<number, CartVariantInfo>> {
  if (ids.length === 0) return new Map();
  const res = await query<CartVariantInfo>(
    `SELECT v.id::int AS variant_id, v.name AS variant_name, v.price_paise, v.stock,
            p.name AS plant_name, p.slug AS plant_slug, p.art, p.hue, p.image_url
     FROM variants v JOIN plants p ON p.id = v.plant_id
     WHERE v.id = ANY($1::bigint[]) AND v.active AND p.active`,
    [ids],
  );
  return new Map(res.rows.map((r) => [r.variant_id, r]));
}
