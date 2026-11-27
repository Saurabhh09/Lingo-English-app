import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const lingoDir = path.resolve(__dirname, '..');

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

const applyMode = process.argv.includes('--apply');
const listUsernames = process.argv.includes('--list');
const backupArg = getArgValue('--file');
const backupPath = backupArg
  ? path.resolve(process.cwd(), backupArg)
  : path.join(lingoDir, 'data.backup.2026-10-22T11-23-26-223Z.json');

if (!fs.existsSync(backupPath)) {
  console.error(`Backup file not found: ${backupPath}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const accountsObj = raw?.accounts && typeof raw.accounts === 'object' ? raw.accounts : {};
const targetUsernames = Object.entries(accountsObj)
  .filter(([, acc]) => acc && !acc.demo)
  .map(([uname, acc]) => String(acc.username || uname).toLowerCase().trim())
  .filter(Boolean)
  .sort();

console.log(`Backup file: ${path.basename(backupPath)}`);
console.log(`Total accounts in backup: ${Object.keys(accountsObj).length}`);
console.log(`Non-demo accounts to flag: ${targetUsernames.length}`);

if (listUsernames) {
  for (const uname of targetUsernames) {
    console.log(uname);
  }
} else {
  console.log('Preview (first 10 usernames):', targetUsernames.slice(0, 10).join(', '));
  console.log('Pass --list to print all non-demo usernames.');
}

if (!applyMode) {
  console.log('\n[DRY-RUN] No database changes were made. Re-run with --apply to set mustChangePassword=true.');
  process.exit(0);
}

const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
if (hasSupabase) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
  let updated = 0;
  let missing = 0;
  const CHUNK_SIZE = 100;
  for (let i = 0; i < targetUsernames.length; i += CHUNK_SIZE) {
    const chunk = targetUsernames.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('lingo_accounts')
      .select('id, payload')
      .in('id', chunk);
    if (error) {
      console.error(`Supabase read error: ${error.message}`);
      process.exit(1);
    }
    const foundMap = new Map((data || []).map((row) => [row.id, row.payload]));
    const upserts = [];
    for (const uname of chunk) {
      const payload = foundMap.get(uname);
      if (!payload) {
        missing += 1;
        continue;
      }
      if (!payload.mustChangePassword) {
        upserts.push({
          id: uname,
          payload: { ...payload, mustChangePassword: true }
        });
      }
      updated += 1;
    }
    if (upserts.length > 0) {
      const { error: upErr } = await supabase
        .from('lingo_accounts')
        .upsert(upserts, { onConflict: 'id' });
      if (upErr) {
        console.error(`Supabase write error: ${upErr.message}`);
        process.exit(1);
      }
    }
  }
  console.log(`\n[APPLIED - SUPABASE] Flagged ${updated} accounts (${missing} not found in live table).`);
} else {
  const dataPath = process.env.DATA_PATH
    ? path.resolve(process.cwd(), process.env.DATA_PATH)
    : path.join(lingoDir, 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`Local storage file not found: ${dataPath}`);
    process.exit(1);
  }
  const dbData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const liveAccounts = dbData?.accounts && typeof dbData.accounts === 'object' ? dbData.accounts : {};
  let updated = 0;
  let missing = 0;
  for (const uname of targetUsernames) {
    if (!liveAccounts[uname]) {
      missing += 1;
      continue;
    }
    liveAccounts[uname].mustChangePassword = true;
    updated += 1;
  }
  const tmpPath = `${dataPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(dbData, null, 2), 'utf8');
  fs.renameSync(tmpPath, dataPath);
  console.log(`\n[APPLIED - LOCAL] Flagged ${updated} accounts in ${path.basename(dataPath)} (${missing} not found).`);
}
