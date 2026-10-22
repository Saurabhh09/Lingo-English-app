/**
 * Controlled Cleanup Script for Orphaned & Legacy Demo Records in Supabase
 *
 * PERMITTED TARGETS (STRICT ALLOWLIST):
 * - demo_f20c36816cc4 (Legacy demo account, progress, session)
 * - demo_d47df5ea6b01 (Orphaned progress, session)
 * - demo_8d77e65e5c88 (Orphaned progress, session)
 * - demo_13a05e0fd0ce (Orphaned progress)
 * - saurabh09        (Orphaned progress, session)
 *
 * STRICTLY PROTECTED PERSONAL ACCOUNTS (NEVER TOUCHED):
 * - saurabhhsingh (110 XP, 10 words, 1 streak, 2 lessons)
 * - zayn09        (Personal account)
 *
 * SAFETY RULES:
 * - Default mode is DRY-RUN. Deletions require the explicit --execute flag.
 * - Refuses to touch any table other than lingo_sessions, lingo_progress, lingo_accounts.
 * - Never touches lingo_games or lingo_solo.
 * - Refuses to proceed if protected accounts are missing or compromised.
 * - Refuses to proceed if unexpected IDs are encountered.
 * - Deletes in strict dependency order: sessions -> progress -> demo accounts.
 * - Never prints passwords, hashes, salts, or session tokens.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const TARGET_ALLOWLIST = new Set([
  'demo_f20c36816cc4',
  'demo_d47df5ea6b01',
  'demo_8d77e65e5c88',
  'demo_13a05e0fd0ce',
  'saurabh09'
]);

const PROTECTED_ACCOUNTS = new Set([
  'saurabhhsingh',
  'zayn09'
]);

const isExecuteMode = process.argv.includes('--execute');

async function run() {
  console.log('========================================================================');
  console.log('   LINGO PLAY & LEARN — SUPABASE RECORD CLEANUP PRE-FLIGHT             ');
  console.log(`   MODE: ${isExecuteMode ? '🔴 EXECUTE (WRITES ENABLED)' : '🟢 DRY-RUN (READ-ONLY INSPECTION)'}`);
  console.log('========================================================================\n');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  }

  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  // 1. Initial State Audit
  console.log('[1/4] Reading initial table row counts...');
  const tables = ['lingo_accounts', 'lingo_progress', 'lingo_sessions', 'lingo_games', 'lingo_solo'];
  const initialCounts = {};
  for (const t of tables) {
    const { count, error } = await client.from(t).select('*', { count: 'exact', head: true });
    if (error) throw new Error(`Failed to query count for ${t}: ${error.message}`);
    initialCounts[t] = count;
  }
  console.log('Current row counts:', initialCounts);

  // 2. Fetch all records to inspect
  const { data: accounts, error: accErr } = await client.from('lingo_accounts').select('id, created_at, payload');
  if (accErr) throw new Error(`Failed to fetch accounts: ${accErr.message}`);

  const { data: progs, error: progErr } = await client.from('lingo_progress').select('id, created_at, payload');
  if (progErr) throw new Error(`Failed to fetch progress: ${progErr.message}`);

  const { data: sess, error: sessErr } = await client.from('lingo_sessions').select('id, created_at, payload');
  if (sessErr) throw new Error(`Failed to fetch sessions: ${sessErr.message}`);

  // 3. Verify Protected Personal Accounts
  console.log('\n[2/4] Verifying protected personal accounts...');
  const saurabhAccount = accounts.find(a => a.id === 'saurabhhsingh');
  const saurabhProg = progs.find(p => p.id === 'saurabhhsingh');
  if (!saurabhAccount) throw new Error('CRITICAL: Personal account saurabhhsingh is missing from lingo_accounts!');
  if (!saurabhProg) throw new Error('CRITICAL: Personal progress for saurabhhsingh is missing from lingo_progress!');
  if (
    saurabhProg.payload?.xp !== 110 ||
    saurabhProg.payload?.words !== 10 ||
    saurabhProg.payload?.streak !== 1 ||
    saurabhProg.payload?.completed?.length !== 2
  ) {
    throw new Error(`CRITICAL: saurabhhsingh progress mismatch! xp=${saurabhProg.payload?.xp}, completed=${saurabhProg.payload?.completed?.length}`);
  }

  const zaynAccount = accounts.find(a => a.id === 'zayn09');
  const zaynProg = progs.find(p => p.id === 'zayn09');
  if (!zaynAccount) throw new Error('CRITICAL: Personal account zayn09 is missing from lingo_accounts!');
  if (!zaynProg) throw new Error('CRITICAL: Personal progress for zayn09 is missing from lingo_progress!');
  if (zaynProg.payload?.xp !== 0) {
    throw new Error(`CRITICAL: zayn09 progress mismatch! xp=${zaynProg.payload?.xp}`);
  }

  console.log('✔ Personal account saurabhhsingh verified intact (110 XP, 10 words, 1 streak, 2 completed lessons).');
  console.log('✔ Personal account zayn09 verified intact (0 XP).');

  // 4. Identify Target Records
  console.log('\n[3/4] Identifying target records matching allowlist...');
  
  // Target Sessions
  const targetSessions = sess.filter(s => TARGET_ALLOWLIST.has(s.payload?.username));
  for (const s of targetSessions) {
    if (PROTECTED_ACCOUNTS.has(s.payload?.username)) {
      throw new Error(`CRITICAL: Protected username found in target sessions! Aborting.`);
    }
  }

  // Target Progress
  const targetProgress = progs.filter(p => TARGET_ALLOWLIST.has(p.id));
  for (const p of targetProgress) {
    if (PROTECTED_ACCOUNTS.has(p.id)) {
      throw new Error(`CRITICAL: Protected ID found in target progress! Aborting.`);
    }
  }

  // Target Accounts
  const targetAccounts = accounts.filter(a => TARGET_ALLOWLIST.has(a.id));
  for (const a of targetAccounts) {
    if (PROTECTED_ACCOUNTS.has(a.id)) {
      throw new Error(`CRITICAL: Protected ID found in target accounts! Aborting.`);
    }
  }

  console.log(`\nIdentified for cleanup:`);
  console.log(`  - Sessions: ${targetSessions.length} record(s)`);
  for (const s of targetSessions) {
    console.log(`      ID: ${s.id.slice(0, 8)}... | username: "${s.payload?.username}" | expires: ${new Date(s.payload?.expires).toISOString()}`);
  }

  console.log(`  - Progress: ${targetProgress.length} record(s)`);
  for (const p of targetProgress) {
    console.log(`      ID: "${p.id}" | xp: ${p.payload?.xp} | words: ${p.payload?.words}`);
  }

  console.log(`  - Accounts: ${targetAccounts.length} record(s)`);
  for (const a of targetAccounts) {
    console.log(`      ID: "${a.id}" | username: "${a.payload?.username}" | name: "${a.payload?.name}" | demo: ${a.payload?.demo}`);
  }

  // Check for any unclassified accounts
  const unclassifiedAccounts = accounts.filter(a => !PROTECTED_ACCOUNTS.has(a.id) && !TARGET_ALLOWLIST.has(a.id));
  if (unclassifiedAccounts.length > 0) {
    throw new Error(`CRITICAL: Found unexpected unclassified accounts in DB: ${unclassifiedAccounts.map(a => a.id).join(', ')}`);
  }

  if (!isExecuteMode) {
    console.log('\n========================================================================');
    console.log('✔ DRY-RUN COMPLETE: All targets matched allowlist. NO records were changed.');
    console.log('To execute this cleanup, rerun with the explicit --execute flag:');
    console.log('  node scripts/cleanup-orphaned-demo-records.mjs --execute');
    console.log('========================================================================\n');
    return;
  }

  // 5. Execution Mode
  console.log('\n[4/4] Executing deletions in strict dependency order...');

  // Final pre-deletion guardrails
  for (const s of targetSessions) {
    if (!TARGET_ALLOWLIST.has(s.payload?.username) || PROTECTED_ACCOUNTS.has(s.payload?.username)) {
      throw new Error(`Guard violation on session delete: ${s.payload?.username}`);
    }
  }
  for (const p of targetProgress) {
    if (!TARGET_ALLOWLIST.has(p.id) || PROTECTED_ACCOUNTS.has(p.id)) {
      throw new Error(`Guard violation on progress delete: ${p.id}`);
    }
  }
  for (const a of targetAccounts) {
    if (!TARGET_ALLOWLIST.has(a.id) || PROTECTED_ACCOUNTS.has(a.id)) {
      throw new Error(`Guard violation on account delete: ${a.id}`);
    }
  }

  // Step A: Delete target sessions
  if (targetSessions.length > 0) {
    const sessionIds = targetSessions.map(s => s.id);
    const { error: delSessErr } = await client.from('lingo_sessions').delete().in('id', sessionIds);
    if (delSessErr) throw new Error(`Failed to delete sessions: ${delSessErr.message}`);
    console.log(`✔ Deleted ${targetSessions.length} session(s) from lingo_sessions.`);
  }

  // Step B: Delete target progress
  if (targetProgress.length > 0) {
    const progIds = targetProgress.map(p => p.id);
    const { error: delProgErr } = await client.from('lingo_progress').delete().in('id', progIds);
    if (delProgErr) throw new Error(`Failed to delete progress records: ${delProgErr.message}`);
    console.log(`✔ Deleted ${targetProgress.length} progress record(s) from lingo_progress.`);
  }

  // Step C: Delete target accounts
  if (targetAccounts.length > 0) {
    const accIds = targetAccounts.map(a => a.id);
    const { error: delAccErr } = await client.from('lingo_accounts').delete().in('id', accIds);
    if (delAccErr) throw new Error(`Failed to delete accounts: ${delAccErr.message}`);
    console.log(`✔ Deleted ${targetAccounts.length} account(s) from lingo_accounts.`);
  }

  // 6. Post-execution Verification
  console.log('\n--- POST-CLEANUP VERIFICATION ---');
  const finalCounts = {};
  for (const t of tables) {
    const { count, error } = await client.from(t).select('*', { count: 'exact', head: true });
    if (error) throw new Error(`Failed to query final count for ${t}: ${error.message}`);
    finalCounts[t] = count;
  }
  console.log('Final row counts:', finalCounts);

  const { data: remainingAccounts } = await client.from('lingo_accounts').select('id');
  const { data: remainingProgress } = await client.from('lingo_progress').select('id, payload');
  const { data: remainingSessions } = await client.from('lingo_sessions').select('id, payload');

  const remAccIds = remainingAccounts.map(a => a.id).sort();
  const remProgIds = remainingProgress.map(p => p.id).sort();
  const remSessUsers = remainingSessions.map(s => s.payload?.username);

  console.log('Remaining Accounts:', remAccIds);
  console.log('Remaining Progress:', remProgIds);
  console.log('Remaining Sessions (usernames):', remSessUsers);

  // Strict post-execution assertions
  if (finalCounts.lingo_accounts !== 2 || finalCounts.lingo_progress !== 2 || finalCounts.lingo_sessions !== 1) {
    throw new Error(`CRITICAL: Final row counts unexpected! accounts=${finalCounts.lingo_accounts}, progress=${finalCounts.lingo_progress}, sessions=${finalCounts.lingo_sessions}`);
  }
  if (finalCounts.lingo_games !== 0 || finalCounts.lingo_solo !== 0) {
    throw new Error(`CRITICAL: Games or solo tables modified! games=${finalCounts.lingo_games}, solo=${finalCounts.lingo_solo}`);
  }

  const postSaurabhProg = remainingProgress.find(p => p.id === 'saurabhhsingh');
  if (!postSaurabhProg || postSaurabhProg.payload?.xp !== 110 || postSaurabhProg.payload?.completed?.length !== 2) {
    throw new Error('CRITICAL: Post-cleanup verification failed for saurabhhsingh progress!');
  }

  console.log('\n🎉 CLEANUP SUCCEEDED: Database is in pristine production state!');
}

run().catch(err => {
  console.error('\n❌ ERROR:', err.message);
  process.exit(1);
});
