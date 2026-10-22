import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const tables = [
  'lingo_accounts',
  'lingo_sessions',
  'lingo_progress',
  'lingo_games',
  'lingo_solo'
];

console.log('--- AUDITING SUPABASE RECORDS POST-TEST ---');
for (const table of tables) {
  const { data, error } = await client.from(table).select('id, created_at, payload');
  if (error) {
    console.error(`Error querying ${table}:`, error.message);
    continue;
  }
  console.log(`\nTable: ${table} (Total rows: ${data.length})`);
  for (const row of data) {
    const p = row.payload || {};
    let summary = '';
    if (table === 'lingo_accounts') {
      summary = `name="${p.name}", demo=${p.demo}, username="${p.username}"`;
    } else if (table === 'lingo_sessions') {
      summary = `username="${p.username}", expires=${new Date(p.expires).toISOString()}`;
    } else if (table === 'lingo_progress') {
      summary = `xp=${p.xp}, words=${p.words}, streak=${p.streak}, completed=${p.completed?.length || 0}`;
    } else {
      summary = `status=${p.status}`;
    }
    console.log(`  - ID: ${row.id} | created_at: ${row.created_at} | ${summary}`);
  }
}
