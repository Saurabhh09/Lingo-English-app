import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BADGE_CATALOG } from '../server/badgeCatalog.mjs';
import { evaluateAchievements, CURRICULUM_VOCAB_TERMS } from '../server/achievementEngine.mjs';
import { lessons } from '../content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tempDataPath = path.join(os.tmpdir(), `lingo-ach-test-${Date.now()}.json`);

const port = 3456;
const baseUrl = `http://127.0.0.1:${port}/api`;

async function req(endpoint, body, token, method) {
  const res = await fetch(baseUrl + endpoint, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function perfectAnswersFor(lessonId) {
  const l = lessons.find(x => x.id === lessonId);
  assert.ok(l, `Lesson ${lessonId} must exist`);
  return l.questions.map(q => q[2]);
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${baseUrl}/health`);
      if (r.ok) return;
    } catch { }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Timed out waiting for isolated test server.');
}

async function runTests() {
  console.log('--- RUNNING LINGO ACHIEVEMENTS & BADGE SYSTEM TESTS ---');

  // 0. Catalog sanity check
  assert.ok(BADGE_CATALOG.length >= 36, `Expected at least 36 badges, got ${BADGE_CATALOG.length}`);
  const uniqueIds = new Set(BADGE_CATALOG.map(b => b.id));
  assert.equal(uniqueIds.size, BADGE_CATALOG.length, 'Badge IDs must be unique');
  const categories = new Set(BADGE_CATALOG.map(b => b.category));
  for (const c of ['unit', 'section', 'cefr', 'streak', 'learning']) {
    assert.ok(categories.has(c), `Category ${c} must exist in catalog`);
  }
  console.log(`PASS 0: Verified expandable catalog (${BADGE_CATALOG.length} unique badges across all 5 categories).`);

  // Boot isolated server
  const serverProc = spawn('node', ['server.mjs'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      ISOLATED_TEST: '1',
      NODE_ENV: 'test',
      DATA_PATH: tempDataPath
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer();

    // Sign up user
    const username = 'badge_tester';
    const password = 'StrongPassword123!';
    const signup = await req('/auth/signup', { name: 'Badge Tester', username, password });
    assert.equal(signup.status, 200, `Signup failed: ${JSON.stringify(signup.data)}`);
    const token = signup.data.token;

    // 1. Complete Unit 1 (hello, everyday, sentences) -> First Steps + Section Starter + Knowledge Keeper + Perfect Unit + Perfect Score + Speed Learner
    for (const id of ['hello', 'everyday', 'sentences']) {
      const r = await req('/progress/lesson', {
        lesson: id,
        answers: perfectAnswersFor(id),
        durationSec: 40,
        exerciseTimesSec: [6, 7, 8, 9, 10]
      }, token);
      assert.equal(r.status, 200, `Lesson ${id} submit failed: ${JSON.stringify(r.data)}`);
    }

    let ach = await req('/achievements', null, token, 'GET');
    assert.equal(ach.status, 200);
    assert.ok(ach.data.earnedBadges.first_steps, 'First Steps should unlock on completing Unit 1');
    assert.ok(ach.data.earnedBadges.perfect_unit, 'Perfect Unit should unlock on 100% Unit 1');
    assert.ok(ach.data.earnedBadges.speed_learner, 'Speed Learner should unlock on fast Unit 1');
    assert.ok(ach.data.earnedBadges.quick_thinker, 'Quick Thinker should unlock on 10+ fast exercises');
    assert.ok(ach.data.earnedBadges.perfect_score, 'Perfect Score should unlock on 100% lesson');
    assert.equal(ach.data.earnedBadges.section_starter, undefined, 'Section Starter must wait until Unit 2 of Section 1 is also completed');
    assert.equal(ach.data.earnedBadges.starter_graduate, undefined, 'Starter Graduate MUST NOT unlock after just Unit 1');
    console.log('PASS 1: Unit 1 badges awarded accurately (and Section Starter stays locked until full Section 1 is done).');

    // Complete Unit 2 of Section 1 -> unlocks Section Starter + Knowledge Keeper + Perfect Section
    for (const id of ['pre-a1-u2-l1', 'pre-a1-u2-l2', 'pre-a1-u2-l3']) {
      const r = await req('/progress/lesson', {
        lesson: id,
        answers: perfectAnswersFor(id),
        durationSec: 40
      }, token);
      assert.equal(r.status, 200, `Lesson ${id} submit failed: ${JSON.stringify(r.data)}`);
    }
    ach = await req('/achievements', null, token, 'GET');
    assert.ok(ach.data.earnedBadges.section_starter, 'Section Starter should unlock on completing all units in Section 1');
    assert.ok(ach.data.earnedBadges.knowledge_keeper, 'Knowledge Keeper should unlock on completing all units in Section 1');
    assert.ok(ach.data.earnedBadges.perfect_section, 'Perfect Section should unlock on 100% Section 1');
    console.log('PASS 3: Section 1 completion badges (Section Starter, Knowledge Keeper, Perfect Section) verified.');

    // 9. Duplicate event protection: re-submit 'sentences' and verify no duplicate awards
    const earnedBeforeDup = Object.keys(ach.data.earnedBadges).length;
    const dupRes = await req('/progress/lesson', {
      lesson: 'sentences',
      answers: perfectAnswersFor('sentences'),
      durationSec: 30
    }, token);
    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.data.newlyUnlockedBadges.length, 0, 'Duplicate submission must NOT re-award badges');
    const achAfterDup = await req('/achievements', null, token, 'GET');
    assert.equal(Object.keys(achAfterDup.data.earnedBadges).length, earnedBeforeDup, 'Badge count must not duplicate');
    console.log('PASS 9: Duplicate completion event triggers zero duplicate badge awards.');

    // 2 & 4. Complete remaining Pre-A1 lessons (indices 6..17) -> verify Starter Graduate blocked at 50%, unlocked at 100%
    const preA1Lessons = lessons.slice(6, 18); // remaining 12 lessons of Pre-A1
    for (let i = 0; i < preA1Lessons.length; i++) {
      const l = preA1Lessons[i];
      const r = await req('/progress/lesson', {
        lesson: l.id,
        answers: perfectAnswersFor(l.id),
        durationSec: 50
      }, token);
      assert.equal(r.status, 200, `Lesson ${l.id} failed`);
      if (i === 4) {
        const mid = await req('/achievements', null, token, 'GET');
        assert.equal(mid.data.earnedBadges.starter_graduate, undefined, 'Starter Graduate MUST NOT unlock at partial Pre-A1 progress');
      }
    }
    const afterPreA1 = await req('/achievements', null, token, 'GET');
    assert.ok(afterPreA1.data.earnedBadges.unit_explorer, 'Unit Explorer should unlock after 5 Pre-A1 units');
    assert.ok(afterPreA1.data.earnedBadges.starter_graduate, 'Starter Graduate must unlock at 100% Pre-A1');
    assert.ok(afterPreA1.data.earnedBadges.cefr_explorer, 'CEFR Explorer must unlock after completing first CEFR level');
    assert.ok(afterPreA1.data.earnedBadges.section_legend, 'Section Legend must unlock after completing all sections in Pre-A1');
    assert.equal(afterPreA1.data.earnedBadges.beginner_graduate, undefined, 'Beginner Graduate (A1) must stay locked');
    console.log('PASS 2 & 4: Unit Explorer (5 units) and strict 100% CEFR Starter Graduate verified (blocked at 50%).');

    // 10. Verify locked badges show accurate progress (e.g. Unit Collector: 5/10, Word Collector: 0/100)
    assert.equal(afterPreA1.data.achievementProgress.unit_collector.currentProgress, 5);
    assert.equal(afterPreA1.data.achievementProgress.unit_collector.targetProgress, 10);
    assert.equal(afterPreA1.data.achievementProgress.word_collector.currentProgress, 0);
    assert.equal(afterPreA1.data.achievementProgress.word_collector.targetProgress, 100);
    console.log('PASS 10: Locked badges display accurate current/target progress.');

    // 6. Save 50 vocabulary words -> Vocabulary Builder unlocks, Word Collector shows 50/100
    const vocabList = Array.from(CURRICULUM_VOCAB_TERMS).slice(0, 50);
    assert.equal(vocabList.length, 50);
    let lastWordRes = null;
    for (const w of vocabList) {
      lastWordRes = await req('/progress/word', { word: w }, token);
      assert.equal(lastWordRes.status, 200, `Saving word ${w} failed: ${JSON.stringify(lastWordRes.data)}`);
    }
    const after50Words = await req('/achievements', null, token, 'GET');
    assert.ok(after50Words.data.earnedBadges.vocabulary_builder, 'Vocabulary Builder must unlock at 50 saved words');
    assert.equal(after50Words.data.earnedBadges.word_collector, undefined, 'Word Collector must remain locked at 50 words');
    assert.equal(after50Words.data.achievementProgress.word_collector.currentProgress, 50);
    console.log('PASS 6: Vocabulary Builder unlocks at 50 saved words and Word Collector tracks 50/100.');

    // 7 & 8. Refresh (/api/me) and login from another device (/api/auth/login) -> earned badges persist & sync
    const meRefresh = await req('/me', null, token, 'GET');
    assert.equal(meRefresh.status, 200);
    assert.ok(meRefresh.data.progress.badges.starter_graduate, 'Earned badges persist after session refresh');

    const device2Login = await req('/auth/login', { username, password });
    assert.equal(device2Login.status, 200);
    const achDevice2 = await req('/achievements', null, device2Login.data.token, 'GET');
    assert.equal(achDevice2.status, 200);
    assert.deepEqual(
      Object.keys(achDevice2.data.earnedBadges).sort(),
      Object.keys(after50Words.data.earnedBadges).sort(),
      'Device 2 login sees identical synced badge collection'
    );
    console.log('PASS 7 & 8: Refresh and multi-device login synchronize all earned badges.');

    // 5. Reach 7-day streak & test safe backfill for pre-existing users
    const legacyProgress = {
      xp: 900,
      words: 90,
      streak: 7,
      completed: lessons.slice(0, 3).map(l => l.id),
      saved: vocabList,
      history: { '2026-11-20': 10, '2026-11-21': 10 }
      // Note: ZERO badges / achievementStats present initially (pre-feature user)
    };
    const backfillRes = evaluateAchievements(legacyProgress, { type: 'backfill' }, '2026-11-25T12:00:00Z');
    assert.ok(legacyProgress.badges.first_steps, 'Backfill awards First Steps to existing Unit 1 completer');
    assert.ok(legacyProgress.badges.first_flame, 'Backfill awards First Flame for 7-day streak');
    assert.ok(legacyProgress.badges.week_warrior, 'Backfill awards Week Warrior for 7-day streak');
    assert.ok(legacyProgress.badges.vocabulary_builder, 'Backfill awards Vocabulary Builder for 50 saved words');
    assert.equal(legacyProgress.xp, 900, 'Backfill must not reset or alter existing XP');
    assert.equal(legacyProgress.completed.length, 3, 'Backfill must preserve existing completed lessons');
    assert.ok(backfillRes.newlyUnlocked.length >= 4);
    console.log('PASS 5 & Backfill: 7-day Week Warrior + safe legacy backfill verified without touching existing progress.');

    // Security: Unauthenticated request to /api/achievements fails 401; client cannot inject arbitrary badges
    const unauth = await req('/achievements', null, null, 'GET');
    assert.equal(unauth.status, 401);
    const spoofRes = await req('/achievements', { unlockBadge: 'language_legend' }, token, 'POST');
    assert.equal(spoofRes.status, 404, 'Client cannot self-award badges via API');
    console.log('PASS Security: Auth & server-side badge validation enforced.');

    console.log('ALL ACHIEVEMENT SYSTEM TESTS PASSED (100%).');
  } finally {
    serverProc.kill();
    try { fs.unlinkSync(tempDataPath); } catch { }
  }
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
