const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let publicClient = null;
let adminClient = null;

function isConfigured() {
  return Boolean(config.supabase.url && config.supabase.publishableKey);
}

function hasSecretKey() {
  return Boolean(config.supabase.url && config.supabase.secretKey);
}

function getPublicClient() {
  if (!isConfigured()) return null;
  if (!publicClient) {
    publicClient = createClient(config.supabase.url, config.supabase.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return publicClient;
}

/** @deprecated use getPublicClient */
function getAnonClient() {
  return getPublicClient();
}

/**
 * Server admin client — prefers secret key (bypasses RLS).
 * Falls back to publishable key when secret is not set (RLS still applies).
 */
function getAdminClient() {
  if (!isConfigured()) return null;

  if (hasSecretKey()) {
    if (!adminClient) {
      adminClient = createClient(config.supabase.url, config.supabase.secretKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return adminClient;
  }

  // Without secret key, use public client (guest inserts must be allowed by RLS)
  return getPublicClient();
}

function createUserClient(accessToken) {
  if (!isConfigured() || !accessToken) return null;
  return createClient(config.supabase.url, config.supabase.publishableKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function checkConnection() {
  if (!isConfigured()) {
    return { ok: false, reason: 'missing_url_or_publishable_key' };
  }

  try {
    const client = getPublicClient();
    const { error } = await client.from('products').select('id').limit(1);
    if (error && error.code === 'PGRST205') {
      return {
        ok: false,
        reason: 'schema_missing',
        message:
          'Connected to Supabase, but tables are missing. Run supabase/migrations/20260322120000_init_schema.sql in the SQL Editor.',
        hasSecretKey: hasSecretKey(),
      };
    }
    if (error) {
      return { ok: false, reason: 'query_error', message: error.message, hasSecretKey: hasSecretKey() };
    }
    return { ok: true, reason: 'ready', hasSecretKey: hasSecretKey() };
  } catch (err) {
    return { ok: false, reason: 'exception', message: err.message, hasSecretKey: hasSecretKey() };
  }
}

module.exports = {
  isConfigured,
  hasSecretKey,
  getPublicClient,
  getAnonClient,
  getAdminClient,
  createUserClient,
  checkConnection,
};
