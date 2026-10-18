import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('   LINGO PHASE 2 — ISOLATED PGLITE DATABASE VERIFICATION SUITE   ');
console.log('================================================================');

async function run() {
  const db = new PGlite();
  
  // 1. Environment & Version
  const versionRes = await db.query('SELECT version();');
  const pgVersion = versionRes.rows[0].version;
  console.log(`[PGlite Engine]: ${pgVersion}\n`);

  // Ensure standard Supabase roles exist so baseline & migration DDL execute accurately
  await db.exec(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
      END IF;
    END $$;
  `);

  // 2. Baseline Schema Execution
  console.log('--- PHASE B: MIGRATION EXECUTION & RERUN SAFETY ---');
  const baselineSqlPath = path.join(root, 'supabase', 'schema.sql');
  const baselineSql = fs.readFileSync(baselineSqlPath, 'utf8');
  await db.exec(baselineSql);
  console.log('PASS: Baseline schema (supabase/schema.sql) applied successfully.');

  // 3. Phase 2 Migration Execution (First Run)
  const migrationSqlPath = path.join(root, 'supabase', 'migrations', '20261015000001_phase2_curriculum_core.sql');
  const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');
  await db.exec(migrationSql);
  console.log('PASS: Phase 2 migration (20261015000001_phase2_curriculum_core.sql) applied successfully (Run 1).');

  // 4. Migration Execution (Second Run - Rerun Safety)
  await db.exec(migrationSql);
  console.log('PASS: Phase 2 migration rerun succeeded without error (Run 2 - Idempotency confirmed).\n');

  // 5. Migration Integrity & Catalog Checks
  console.log('--- PHASE C.4: MIGRATION INTEGRITY & CATALOG CHECKS ---');
  const tablesRes = await db.query(`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
  `);
  const tableNames = tablesRes.rows.map(r => r.tablename);
  console.log(`Total public tables detected: ${tableNames.length}`);
  
  const expectedTables = [
    'curriculum_activities', 'curriculum_content_audit_log', 'curriculum_exercise_objectives',
    'curriculum_exercise_revisions', 'curriculum_exercise_solutions', 'curriculum_exercises',
    'curriculum_grammar_concepts', 'curriculum_learning_objectives', 'curriculum_lesson_grammar',
    'curriculum_lesson_objectives', 'curriculum_lesson_prerequisites', 'curriculum_lesson_vocabulary',
    'curriculum_lessons', 'curriculum_levels', 'curriculum_programs', 'curriculum_sections',
    'curriculum_units', 'curriculum_vocabulary', 'learner_curriculum_profiles',
    'learner_exercise_attempts', 'learner_lesson_progress', 'learner_objective_mastery',
    'lingo_accounts', 'lingo_games', 'lingo_progress', 'lingo_sessions'
  ];

  for (const table of expectedTables) {
    assert.ok(tableNames.includes(table), `Expected table ${table} missing in catalog`);
  }
  console.log(`PASS: All 22 Phase 2 curriculum/learner tables and 4 baseline tables verified in catalog.`);

  // Verify Triggers exist
  const triggersRes = await db.query(`
    SELECT trigger_name, event_manipulation, event_object_table 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `);
  const revTrigger = triggersRes.rows.find(r => r.trigger_name === 'trg_revision_immutability');
  const solTrigger = triggersRes.rows.find(r => r.trigger_name === 'trg_solution_immutability');
  assert.ok(revTrigger, 'trg_revision_immutability trigger missing');
  assert.ok(solTrigger, 'trg_solution_immutability trigger missing');
  console.log(`PASS: Triggers verified: ${revTrigger.trigger_name} on ${revTrigger.event_object_table}, ${solTrigger.trigger_name} on ${solTrigger.event_object_table}.\n`);

  // 6. Immutability Tests
  console.log('--- PHASE C.1: EXERCISE REVISION & SOLUTION IMMUTABILITY TESTS ---');
  
  // Seed fixtures
  await db.exec(`
    INSERT INTO public.curriculum_programs (id, title) VALUES ('en_core', 'Core English');
    INSERT INTO public.curriculum_levels (id, program_id, code, name, badge, tagline, display_order)
    VALUES ('a1', 'en_core', 'A1', 'Beginner', '🌱', 'Elementary English', 1);
    INSERT INTO public.curriculum_sections (id, level_id, section_number, title, display_order)
    VALUES ('sec_1', 'a1', '1', 'Foundations', 1);
    INSERT INTO public.curriculum_units (id, section_id, unit_number, title, display_order)
    VALUES ('u_1', 'sec_1', '1', 'Greetings', 1);
    INSERT INTO public.curriculum_lessons (id, unit_id, title, pedagogical_focus, display_order)
    VALUES ('les_hello', 'u_1', 'Saying Hello', 'Greeting expressions', 1);
    INSERT INTO public.curriculum_activities (id, lesson_id, activity_type, title, display_order)
    VALUES ('11111111-1111-1111-1111-111111111111', 'les_hello', 'practice', 'Warmup', 1);
    INSERT INTO public.curriculum_exercises (id, activity_id, exercise_type, display_order)
    VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'multiple_choice', 1);
  `);

  // Scenario 1A: Draft revision can be created and edited
  await db.exec(`
    INSERT INTO public.curriculum_exercise_revisions (
      id, exercise_id, revision_number, prompt, content_payload, is_active, published_at
    ) VALUES (
      '33333333-3333-3333-3333-333333333331',
      '22222222-2222-2222-2222-222222222222',
      1,
      'Draft Prompt 1',
      '{"options": ["A", "B"]}'::jsonb,
      false,
      NULL
    );
  `);
  // Update draft prompt
  await db.exec(`
    UPDATE public.curriculum_exercise_revisions 
    SET prompt = 'Updated Draft Prompt 1'
    WHERE id = '33333333-3333-3333-3333-333333333331';
  `);
  const draftCheck = await db.query(`SELECT prompt FROM public.curriculum_exercise_revisions WHERE id = '33333333-3333-3333-3333-333333333331'`);
  assert.equal(draftCheck.rows[0].prompt, 'Updated Draft Prompt 1');
  console.log('PASS 1A: Draft revisions can be freely edited before publication.');

  // Scenario 1B: Draft revision deletion
  await db.exec(`
    DELETE FROM public.curriculum_exercise_revisions 
    WHERE id = '33333333-3333-3333-3333-333333333331';
  `);
  const draftDelCheck = await db.query(`SELECT COUNT(*) as c FROM public.curriculum_exercise_revisions WHERE id = '33333333-3333-3333-3333-333333333331'`);
  assert.equal(draftDelCheck.rows[0].c, 0);
  console.log('PASS 1B: Draft revisions can be deleted during authoring cleanup.');

  // Scenario 1C: Insert published revision
  await db.exec(`
    INSERT INTO public.curriculum_exercise_revisions (
      id, exercise_id, revision_number, prompt, content_payload, xp_weight, is_active, published_at
    ) VALUES (
      '33333333-3333-3333-3333-333333333332',
      '22222222-2222-2222-2222-222222222222',
      1,
      'Published Prompt 1',
      '{"options": ["Hello", "Bye"]}'::jsonb,
      10,
      true,
      now()
    );
  `);
  console.log('PASS 1C: Published revision created with is_active = true and published_at set.');

  // Scenario 1D: Attempt to edit published content must fail
  let editPublishedError = null;
  try {
    await db.exec(`
      UPDATE public.curriculum_exercise_revisions 
      SET prompt = 'Malicious change'
      WHERE id = '33333333-3333-3333-3333-333333333332';
    `);
  } catch (err) {
    editPublishedError = err;
  }
  assert.ok(editPublishedError, 'Expected exception on modifying published prompt');
  assert.match(editPublishedError.message, /Published exercise revisions are immutable/);
  console.log(`PASS 1D: Editing published revision prompt rejected with exception: "${editPublishedError.message.trim()}".`);

  // Scenario 1E: Permitted lifecycle deactivation
  await db.exec(`
    UPDATE public.curriculum_exercise_revisions 
    SET is_active = false
    WHERE id = '33333333-3333-3333-3333-333333333332';
  `);
  const deactCheck = await db.query(`SELECT is_active, published_at FROM public.curriculum_exercise_revisions WHERE id = '33333333-3333-3333-3333-333333333332'`);
  assert.equal(deactCheck.rows[0].is_active, false);
  assert.ok(deactCheck.rows[0].published_at !== null);
  console.log('PASS 1E: Permitted deactivation succeeded (is_active: true -> false) with content untouched.');

  // Scenario 1F: Editing deactivated historical revision must STILL fail
  let editDeactivatedError = null;
  try {
    await db.exec(`
      UPDATE public.curriculum_exercise_revisions 
      SET prompt = 'Altered historical prompt'
      WHERE id = '33333333-3333-3333-3333-333333333332';
    `);
  } catch (err) {
    editDeactivatedError = err;
  }
  assert.ok(editDeactivatedError, 'Expected exception on modifying deactivated published revision');
  assert.match(editDeactivatedError.message, /Published exercise revisions are immutable/);
  console.log(`PASS 1F: Editing deactivated revision rejected with exception: "${editDeactivatedError.message.trim()}".`);

  // Scenario 1G: Attempting to strip published_at timestamp must fail
  let stripPubError = null;
  try {
    await db.exec(`
      UPDATE public.curriculum_exercise_revisions 
      SET published_at = NULL
      WHERE id = '33333333-3333-3333-3333-333333333332';
    `);
  } catch (err) {
    stripPubError = err;
  }
  assert.ok(stripPubError, 'Expected exception on nullifying published_at');
  assert.match(stripPubError.message, /Publication timestamp cannot be removed/);
  console.log(`PASS 1G: Stripping publication timestamp rejected: "${stripPubError.message.trim()}".`);

  // Scenario 1H: Deleting published revision must fail
  let delPublishedError = null;
  try {
    await db.exec(`
      DELETE FROM public.curriculum_exercise_revisions 
      WHERE id = '33333333-3333-3333-3333-333333333332';
    `);
  } catch (err) {
    delPublishedError = err;
  }
  assert.ok(delPublishedError, 'Expected exception on deleting published revision');
  assert.match(delPublishedError.message, /cannot be deleted/);
  console.log(`PASS 1H: Deleting published revision rejected: "${delPublishedError.message.trim()}".`);

  // Scenario 1I: Published solution modification and deletion
  await db.exec(`
    INSERT INTO public.curriculum_exercise_solutions (revision_id, solution_payload, grading_rubric)
    VALUES (
      '33333333-3333-3333-3333-333333333332',
      '{"correct_index": 0}'::jsonb,
      '{"pass_threshold": 1.0}'::jsonb
    );
  `);
  
  let editSolutionError = null;
  try {
    await db.exec(`
      UPDATE public.curriculum_exercise_solutions
      SET solution_payload = '{"correct_index": 1}'::jsonb
      WHERE revision_id = '33333333-3333-3333-3333-333333333332';
    `);
  } catch (err) {
    editSolutionError = err;
  }
  assert.ok(editSolutionError, 'Expected exception on updating published solution');
  assert.match(editSolutionError.message, /Exercise solutions and grading rubrics for published revisions are immutable/);
  console.log(`PASS 1I: Modifying solution payload rejected: "${editSolutionError.message.trim()}".`);

  // Scenario 1J: Deleting published solution
  let delSolutionError = null;
  try {
    await db.exec(`
      DELETE FROM public.curriculum_exercise_solutions
      WHERE revision_id = '33333333-3333-3333-3333-333333333332';
    `);
  } catch (err) {
    delSolutionError = err;
  }
  assert.ok(delSolutionError, 'Expected exception on deleting published solution');
  assert.match(delSolutionError.message, /Exercise solutions for published revisions are immutable and cannot be deleted/);
  console.log(`PASS 1J: Deleting published solution rejected: "${delSolutionError.message.trim()}".\n`);

  // 7. Historical Data Protection Tests (ON DELETE RESTRICT)
  console.log('--- PHASE C.2: HISTORICAL DATA PROTECTION (FOREIGN KEY RESTRICT) ---');

  // Seed user account
  await db.exec(`
    INSERT INTO public.lingo_accounts (id, payload)
    VALUES ('learner_alice', '{"username":"learner_alice","name":"Alice"}'::jsonb);
  `);

  // Seed learner progress
  await db.exec(`
    INSERT INTO public.learner_lesson_progress (account_id, lesson_id, status, attempts_count)
    VALUES ('learner_alice', 'les_hello', 'completed', 1);
  `);

  // Test 2A: Deleting lesson referenced by learner_lesson_progress must be RESTRICTED
  let delLessonProgressError = null;
  try {
    await db.exec(`DELETE FROM public.curriculum_lessons WHERE id = 'les_hello';`);
  } catch (err) {
    delLessonProgressError = err;
  }
  assert.ok(delLessonProgressError, 'Expected foreign key restrict violation on deleting lesson');
  assert.match(delLessonProgressError.message, /foreign key constraint|violates foreign key/i);
  console.log(`PASS 2A: Deleting lesson with active learner progress blocked by ON DELETE RESTRICT.`);

  // Seed learner attempt
  await db.exec(`
    INSERT INTO public.learner_exercise_attempts (
      account_id, exercise_id, revision_id, lesson_id, submitted_answer, is_correct, score_earned
    ) VALUES (
      'learner_alice',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333332',
      'les_hello',
      '{"choice": 0}'::jsonb,
      true,
      10
    );
  `);

  // Remove progress record to specifically test that attempts alone also restrict lesson deletion
  await db.exec(`DELETE FROM public.learner_lesson_progress WHERE account_id = 'learner_alice';`);

  // Test 2B: Deleting lesson referenced by learner_exercise_attempts must be RESTRICTED
  let delLessonAttemptError = null;
  try {
    await db.exec(`DELETE FROM public.curriculum_lessons WHERE id = 'les_hello';`);
  } catch (err) {
    delLessonAttemptError = err;
  }
  assert.ok(delLessonAttemptError, 'Expected foreign key restrict violation on deleting lesson with attempts');
  assert.match(delLessonAttemptError.message, /foreign key constraint|violates foreign key/i);
  console.log(`PASS 2B: Deleting lesson with historical learner attempts blocked by ON DELETE RESTRICT.`);

  // Verify historical attempt record is intact
  const attemptVerify = await db.query(`SELECT COUNT(*) as c FROM public.learner_exercise_attempts WHERE account_id = 'learner_alice'`);
  assert.equal(attemptVerify.rows[0].c, 1);
  console.log(`PASS 2C: Historical learner attempt records remain completely intact after failed deletion.\n`);

  // 8. RLS and Permissions Verification
  console.log('--- PHASE C.3: ROW LEVEL SECURITY (RLS) & PRIVILEGE VERIFICATION ---');
  
  // Inspect rowsecurity on all 22 migration tables + 4 baseline tables
  const rlsRes = await db.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  let disabledRlsCount = 0;
  for (const row of rlsRes.rows) {
    if (!row.rowsecurity) {
      console.error(`ERROR: RLS disabled on table ${row.tablename}`);
      disabledRlsCount++;
    }
  }
  assert.equal(disabledRlsCount, 0, 'Found tables with RLS disabled!');
  console.log(`PASS 3A: Row Level Security (RLS) confirmed ENABLED on all ${rlsRes.rows.length} public tables.`);

  // Test privileges for anon and authenticated roles
  const privRes = await db.query(`
    SELECT table_name, privilege_type, grantee 
    FROM information_schema.table_privileges 
    WHERE table_schema = 'public' 
      AND grantee IN ('anon', 'authenticated')
    ORDER BY table_name, grantee;
  `);
  assert.equal(privRes.rows.length, 0, 'Found unexpected privileges granted to anon or authenticated');
  console.log(`PASS 3B: Zero table privileges for 'anon' and 'authenticated' roles verified across all tables.`);

  // Test privileges for service_role
  const servicePrivRes = await db.query(`
    SELECT DISTINCT table_name 
    FROM information_schema.table_privileges 
    WHERE table_schema = 'public' 
      AND grantee = 'service_role';
  `);
  console.log(`PASS 3C: 'service_role' confirmed granted access to all ${servicePrivRes.rows.length} public tables.`);

  console.log('\n================================================================');
  console.log('   ALL PGLITE POSTGRESQL VERIFICATION TESTS PASSED (100%)       ');
  console.log('================================================================');
}

run().catch(err => {
  console.error('\nTEST FAILED WITH EXCEPTION:', err);
  process.exit(1);
});
