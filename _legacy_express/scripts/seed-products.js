/**
 * Seed local catalog into Supabase products table.
 * Requires schema applied + publishable (or secret) key in .env
 */
require('dotenv').config();
const catalog = require('../data/catalog');
const { getAdminClient, isConfigured, checkConnection } = require('../services/supabase');

async function main() {
  if (!isConfigured()) {
    console.error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
    process.exit(1);
  }

  const status = await checkConnection();
  if (status.reason === 'schema_missing') {
    console.error(status.message);
    process.exit(1);
  }

  const db = getAdminClient();
  const rows = catalog.products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle,
    description: p.description,
    collection: p.collection,
    price: p.price,
    currency: p.currency,
    shapes: p.shapes,
    sizes: p.sizes,
    image: null,
    preview_image: null,
    sample_text: p.sample_text,
    text_placeholder: p.text_placeholder,
    featured: p.featured,
    active: true,
    printify_product_id: p.printify_product_id,
    printify_variant_id: p.printify_variant_id,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await db.from('products').upsert(rows, { onConflict: 'id' }).select('id');
  if (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
  console.log(`Seeded ${data.length} products into Supabase.`);
}

main();
