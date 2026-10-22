/**
 * Strict Single-Account Migration Script
 *
 * MIGRATION TARGET: ONLY the personal account 'saurabhhsingh'
 * DESTINATION TABLES: public.lingo_accounts, public.lingo_progress
 *
 * SAFETY RULES:
 * - Refuses to touch any account other than 'saurabhhsingh'.
 * - Refuses to write in default dry-run mode. Requires explicit --execute flag.
 * - Stops if destination records already exist (conflict protection).
 * - Never logs or prints passwords, password hashes, salts, or tokens.
 * - Leaves local data.json and backups completely untouched.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_ACCOUNT_ID = 'saurabhhsingh';
const isExecuteMode = process.argv.includes('--execute');

async function run() {
  console.log('========================================================================');
  console.log(`--- STRICT ACCOUNT MIGRATION: [${ALLOWED_ACCOUNT_ID}] ---`);
  console.log(`--- MODE: ${isExecuteMode ? 'EXECUTE (WRITES ENABLED)' : 'DRY-RUN (READ-ONLY PRE-FLIGHT)'} ---`);
  console.log('========================================================================\n');

  // 1. Source verification
  const dataPath = path.resolve('data.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Source file not found: ${dataPath}`);
  }

  const raw = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(raw);

  // 2. Strict allowlist check & extraction
  const account = data.accounts?.[ALLOWED_ACCOUNT_ID];
  if (!account) {
    throw new Error(`CRITICAL: Account record '${ALLOWED_ACCOUNT_ID}' not found in data.json accounts.`);
  }

  if (account.username !== ALLOWED_ACCOUNT_ID) {
    throw new Error(`CRITICAL: Mismatched account username '${account.username}' !== '${ALLOWED_ACCOUNT_ID}'.`);
  }

  // Validate account structure
  if (typeof account.salt !== 'string' || account.salt.length !== 32) {
    throw new Error('CRITICAL: Account salt is invalid or missing.');
  }
  if (typeof account.password !== 'string' || account.password.length !== 128) {
    throw new Error('CRITICAL: Account password hash is invalid or missing.');
  }
  if (typeof account.name !== 'string' || !account.name.trim()) {
    throw new Error('CRITICAL: Account display name is invalid or missing.');
  }

  console.log(`[PASS] 1. Source account validated:`);
  console.log(`   ID: ${ALLOWED_ACCOUNT_ID}`);
  console.log(`   Display Name: ${account.name}`);
  console.log(`   Demo Account: ${account.demo}`);
  console.log(`   Credentials Format: Valid 32-hex salt, 128-hex scrypt hash (secrets protected)`);

  // 3. Progress record validation
  const progress = data.progress?.[ALLOWED_ACCOUNT_ID];
  if (!progress) {
    throw new Error(`CRITICAL: Progress record '${ALLOWED_ACCOUNT_ID}' not found in data.json progress.`);
  }

  if (typeof progress.xp !== 'number' || typeof progress.words !== 'number' || !Array.isArray(progress.completed)) {
    throw new Error('CRITICAL: Progress record structure is invalid.');
  }

  console.log(`\n[PASS] 2. Source progress validated:`);
  console.log(`   ID: ${ALLOWED_ACCOUNT_ID}`);
  console.log(`   XP: ${progress.xp}`);
  console.log(`   Words: ${progress.words}`);
  console.log(`   Streak: ${progress.streak}`);
  console.log(`   Completed Lessons: ${progress.completed.length}`);
  console.log(`   Saved Words: ${progress.saved?.length || 0}`);

  // 4. Supabase connection & pre-flight destination check
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('CRITICAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.');
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  console.log('\n--- 3. DESTINATION CONFLICT CHECK (SUPABASE) ---');
  const { data: existingAccount, error: accCheckErr } = await client
    .from('lingo_accounts')
    .select('id')
    .eq('id', ALLOWED_ACCOUNT_ID)
    .maybeSingle();

  if (accCheckErr) {
    throw new Error(`Destination check failed on lingo_accounts: ${accCheckErr.message}`);
  }

  const { data: existingProgress, error: progCheckErr } = await client
    .from('lingo_progress')
    .select('id')
    .eq('id', ALLOWED_ACCOUNT_ID)
    .maybeSingle();

  if (progCheckErr) {
    throw new Error(`Destination check failed on lingo_progress: ${progCheckErr.message}`);
  }

  if (existingAccount) {
    throw new Error(`CONFLICT: Destination record '${ALLOWED_ACCOUNT_ID}' already exists in lingo_accounts! Stopping.`);
  } else {
    console.log(`[PASS] lingo_accounts: No existing record for '${ALLOWED_ACCOUNT_ID}'. Destination is clean.`);
  }

  if (existingProgress) {
    throw new Error(`CONFLICT: Destination record '${ALLOWED_ACCOUNT_ID}' already exists in lingo_progress! Stopping.`);
  } else {
    console.log(`[PASS] lingo_progress: No existing record for '${ALLOWED_ACCOUNT_ID}'. Destination is clean.`);
  }

  // 5. Execution or Dry-Run Exit
  if (!isExecuteMode) {
    console.log('\n========================================================================');
    console.log('DRY-RUN COMPLETE: Validation passed with 100% success.');
    console.log('NO RECORDS WERE WRITTEN (0 destination writes performed).');
    console.log('To perform the migration once approved, execute with: --execute');
    console.log('========================================================================\n');
    return;
  }

  // 6. Execute Approved Migration
  console.log('\n--- 4. EXECUTING APPROVED WRITES ---');

  // Write lingo_accounts
  const { error: insertAccErr } = await client
    .from('lingo_accounts')
    .insert({ id: ALLOWED_ACCOUNT_ID, payload: account });

  if (insertAccErr) {
    throw new Error(`Migration failed inserting into lingo_accounts: ${insertAccErr.message}`);
  }
  console.log(`[MIGRATED] public.lingo_accounts -> 1 record written: '${ALLOWED_ACCOUNT_ID}'`);

  // Write lingo_progress
  const { error: insertProgErr } = await client
    .from('lingo_progress')
    .insert({ id: ALLOWED_ACCOUNT_ID, payload: progress });

  if (insertProgErr) {
    throw new Error(`Migration failed inserting into lingo_progress: ${insertProgErr.message}`);
  }
  console.log(`[MIGRATED] public.lingo_progress -> 1 record written: '${ALLOWED_ACCOUNT_ID}'`);

  // 7. Post-migration verification
  console.log('\n--- 5. POST-MIGRATION VERIFICATION ---');
  const { data: verifyAcc, error: vAccErr } = await client
    .from('lingo_accounts')
    .select('id, payload, created_at')
    .eq('id', ALLOWED_ACCOUNT_ID)
    .single();

  if (vAccErr || !verifyAcc) {
    throw new Error(`Post-migration readback failed on lingo_accounts: ${vAccErr?.message}`);
  }

  const { data: verifyProg, error: vProgErr } = await client
    .from('lingo_progress')
    .select('id, payload, created_at')
    .eq('id', ALLOWED_ACCOUNT_ID)
    .single();

  if (vProgErr || !verifyProg) {
    throw new Error(`Post-migration readback failed on lingo_progress: ${vProgErr?.message}`);
  }

  console.log(`[VERIFIED] Destination lingo_accounts: readback confirmed for '${verifyAcc.id}'`);
  console.log(`[VERIFIED] Destination lingo_progress: readback confirmed for '${verifyProg.id}' (XP: ${verifyProg.payload.xp})`);

  // Check total table count in Supabase to guarantee no other records were touched
  const { count: totalAccCount } = await client
    .from('lingo_accounts')
    .select('*', { count: 'exact', head: true });

  const { count: totalProgCount } = await client
    .from('lingo_progress')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTable Count Check:`);
  console.log(`   lingo_accounts total rows: ${totalAccCount} (Expected: exactly 1)`);
  console.log(`   lingo_progress total rows: ${totalProgCount} (Expected: exactly 1)`);

  if (totalAccCount !== 1 || totalProgCount !== 1) {
    throw new Error(`SECURITY ALERT: Expected exactly 1 record in each table, found accounts=${totalAccCount}, progress=${totalProgCount}`);
  }

  console.log('\n========================================================================');
  console.log('🎉 MIGRATION OF [saurabhhsingh] COMPLETED AND VERIFIED WITH 100% INTEGRITY!');
  console.log('========================================================================\n');
}

run().catch(err => {
  console.error('\n[MIGRATION ERROR]:', err.message);
  process.exit(1);
});
