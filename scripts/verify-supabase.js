require('dotenv').config();
const { checkConnection, isConfigured, hasSecretKey } = require('../services/supabase');
const config = require('../config');

async function main() {
  console.log('SUPABASE_URL:', config.supabase.url || '(missing)');
  console.log('Publishable key:', config.supabase.publishableKey ? 'set' : '(missing)');
  console.log('Secret key:', hasSecretKey() ? 'set' : '(missing — add SUPABASE_SECRET_KEY)');
  console.log('Configured:', isConfigured());

  const status = await checkConnection();
  console.log('Connection:', JSON.stringify(status, null, 2));

  if (status.reason === 'schema_missing') {
    console.log('\nNext step: open SQL Editor and run:');
    console.log('  supabase/migrations/20260322120000_init_schema.sql');
    console.log(
      `  https://supabase.com/dashboard/project/bxmdcyidpqtoshdwpqmn/sql/new`
    );
  }
}

main();
