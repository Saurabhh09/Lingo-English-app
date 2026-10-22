import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const tablesToCheck = [
  'lingo_accounts',
  'lingo_sessions',
  'lingo_progress',
  'lingo_games',
  'lingo_solo'
];

console.log('--- CHECKING TABLES IN SUPABASE ---');

for (const tbl of tablesToCheck) {
  try {
    const { data, error, status } = await client.from(tbl).select('id').limit(1);
    if (error) {
      console.log(`[${tbl}]: MISSING (${error.code}: ${error.message})`);
    } else {
      console.log(`[${tbl}]: EXISTS (Status: ${status}, sampled rows: ${data.length})`);
    }
  } catch (err) {
    console.log(`[${tbl}]: EXCEPTION (${err.message})`);
  }
}
