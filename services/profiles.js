const { getAdminClient, isConfigured } = require('./supabase');

async function getProfile(userId) {
  if (!userId || !isConfigured()) return null;
  const db = getAdminClient();
  if (!db) return null;
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertProfile(userId, patch = {}) {
  if (!userId) {
    const err = new Error('user_id required');
    err.status = 400;
    throw err;
  }
  if (!isConfigured()) {
    return { id: userId, ...patch, demo: true };
  }
  const db = getAdminClient();
  const payload = {
    id: userId,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function saveShippingAddress(userId, address, extras = {}) {
  return upsertProfile(userId, {
    shipping_address: address || {},
    phone: extras.phone || address?.phone || null,
    full_name: extras.full_name || address?.name || undefined,
    email: extras.email || undefined,
  });
}

module.exports = {
  getProfile,
  upsertProfile,
  saveShippingAddress,
};
