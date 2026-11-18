require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

if (process.env.NODE_ENV === 'production') {
  for (const [key, value] of [
    ['SUPABASE_URL', supabaseUrl],
    ['SUPABASE_PUBLISHABLE_KEY', supabasePublishableKey],
  ]) {
    if (!value) console.warn(`[config] Missing required env: ${key}`);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  supabase: {
    url: supabaseUrl,
    /** Public client key (publishable or legacy anon) */
    publishableKey: supabasePublishableKey,
    /** @deprecated use publishableKey — kept for compatibility */
    anonKey: supabasePublishableKey,
    /** Server-only key (secret or legacy service_role) */
    secretKey: supabaseSecretKey,
    /** @deprecated use secretKey */
    serviceRoleKey: supabaseSecretKey,
  },
  printify: {
    apiKey: process.env.PRINTIFY_API_KEY || '',
    shopId: process.env.PRINTIFY_SHOP_ID || '',
    baseUrl: 'https://api.printify.com/v1',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  currency: {
    default: 'USD',
    supported: ['USD', 'EUR', 'GBP'],
  },
};
