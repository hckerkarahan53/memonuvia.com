const { getAdminClient, isConfigured } = require('./supabase');
const printify = require('./printify');
const catalog = require('../data/catalog');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function mapPrintifyProduct(p) {
  const variant =
    (p.variants || []).find((v) => v.is_enabled !== false && v.is_available !== false) ||
    (p.variants || [])[0] ||
    {};
  const image =
    (p.images || []).find((img) => img.is_default)?.src ||
    (p.images || [])[0]?.src ||
    null;
  const priceCents = Number(variant.price || 0);
  const title = p.title || 'Untitled product';
  return {
    id: `printify_${p.id}`,
    slug: slugify(title) || `printify-${p.id}`,
    name: title,
    subtitle: 'Personalized Photo Slate',
    description: p.description || '',
    collection: 'all',
    price: priceCents ? Number((priceCents / 100).toFixed(2)) : 0,
    currency: 'USD',
    shapes: ['square'],
    sizes: ['6x6'],
    image,
    preview_image: image,
    sample_text: '',
    text_placeholder: 'Your text',
    featured: false,
    active: Boolean(p.visible !== false),
    printify_product_id: String(p.id),
    printify_variant_id: variant.id != null ? String(variant.id) : null,
    printify_raw: p,
  };
}

async function listDbProducts({ activeOnly = true } = {}) {
  if (!isConfigured()) {
    return catalog.products.filter((p) => (activeOnly ? p.active !== false : true));
  }
  const db = getAdminClient();
  let query = db.from('products').select('*').order('updated_at', { ascending: false });
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return catalog.products;
  return data;
}

async function syncFromPrintify() {
  if (!printify.isConfigured()) {
    const err = new Error('Printify is not configured');
    err.status = 400;
    throw err;
  }

  const page = await printify.listProducts(1, 50);
  const list = page?.data || page || [];
  const mapped = list.map(mapPrintifyProduct);

  if (!isConfigured()) {
    return { synced: mapped.length, products: mapped, persisted: false };
  }

  const db = getAdminClient();
  const rows = mapped.map((p) => ({
    ...p,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db.from('products').upsert(rows, { onConflict: 'id' });
  if (error) throw error;

  return { synced: rows.length, products: rows, persisted: true };
}

async function updateProduct(id, patch) {
  if (!isConfigured()) {
    const err = new Error('Supabase required to update products');
    err.status = 400;
    throw err;
  }
  const db = getAdminClient();
  const { data, error } = await db
    .from('products')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

module.exports = {
  listDbProducts,
  syncFromPrintify,
  updateProduct,
  mapPrintifyProduct,
};
