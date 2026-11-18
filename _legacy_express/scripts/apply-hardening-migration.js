/**
 * Applies platform hardening migration via Supabase SQL Editor instructions
 * and verifies critical columns/tables exist using the service role client.
 *
 * Usage: node scripts/apply-hardening-migration.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getAdminClient, isConfigured, hasSecretKey, checkConnection } = require('../services/supabase');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20260322140000_platform_hardening.sql'
);

async function main() {
  console.log('MemoNuvia — platform hardening check\n');

  if (!isConfigured()) {
    console.error('Supabase is not configured in .env');
    process.exit(1);
  }

  const status = await checkConnection();
  console.log('Connection:', status);

  if (!hasSecretKey()) {
    console.warn('Secret key missing — cannot verify admin tables fully.');
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log('\n--- ACTION REQUIRED ---');
  console.log('Open Supabase SQL Editor for project bxmdcyidpqtoshdwpqmn');
  console.log('Paste and run this file:');
  console.log(migrationPath);
  console.log(`SQL length: ${sql.length} characters\n`);

  const db = getAdminClient();
  if (!db) {
    process.exit(0);
  }

  const checks = [
    { table: 'profiles', column: 'shipping_address' },
    { table: 'orders', column: 'fulfillment_status' },
    { table: 'order_items', column: 'font_family' },
    { table: 'personalizations', column: 'id' },
    { table: 'fulfillment_jobs', column: 'id' },
    { table: 'webhook_events', column: 'id' },
  ];

  for (const check of checks) {
    const { error } = await db.from(check.table).select(check.column).limit(1);
    if (error) {
      console.log(`✗ ${check.table}.${check.column} — ${error.message}`);
    } else {
      console.log(`✓ ${check.table}.${check.column}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
