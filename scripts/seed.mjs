// Inserts catalogue plants that don't exist yet. Existing plants (and any prices
// set in the admin panel) are left untouched, so it is safe to re-run.
import pg from "pg";
import { plants } from "../db/plants.mjs";

const client = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
await client.connect();
let added = 0;
try {
  await client.query("BEGIN");
  for (const p of plants) {
    const res = await client.query(
      `INSERT INTO plants (slug, name, scientific_name, category, summary, description, benefits,
         light, water, difficulty, pet_safe, air_purifying, art, hue, featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (slug) DO NOTHING RETURNING id`,
      [p.slug, p.name, p.scientific_name, p.category, p.summary, p.description, p.benefits,
       p.light, p.water, p.difficulty, p.pet_safe, p.air_purifying, p.art, p.hue, p.featured],
    );
    if (res.rowCount === 0) continue;
    added++;
    const plantId = res.rows[0].id;
    for (const [i, v] of p.variants.entries()) {
      await client.query(
        `INSERT INTO variants (plant_id, name, description, price_paise, stock, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [plantId, v.name, v.description, v.price_paise, v.stock, i],
      );
    }
  }
  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  await client.end();
}
console.log(`seeded ${added} new plant(s)`);
