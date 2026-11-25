import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CURRICULUM_CATALOG } from '../server/curriculumCatalog.mjs';
import { REWARD_DEFINITIONS, REWARD_BY_ID } from '../server/rewardDefinitions.mjs';
import { evaluateRewards, claimReward } from '../server/rewardEngine.mjs';
import { lessons } from '../content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tempDataPath = path.join(os.tmpdir(), `lingo-rewards-test-${Date.now()}.json`);

const port = 3457;
const baseUrl = `http://127.0.0.1:${port}/api`;

async function req(endpoint, body, token, method) {
  const res = await fetch(baseUrl + endpoint, {
    method: method || (body !== undefined ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
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
  assert.ok(l, `Lesson ${lessonId} must exist in content.js`);
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
  console.log('--- RUNNING LINGO GAMIFIED REWARD & WALLET SYSTEM TESTS ---');

  // 0. Definitions integrity check
  assert.ok(REWARD_DEFINITIONS.length >= 40, 'Expected unit, section, and CEFR reward definitions');
  const uniqueDefIds = new Set(REWARD_DEFINITIONS.map(r => r.id));
  assert.equal(uniqueDefIds.size, REWARD_DEFINITIONS.length, 'Reward definition IDs must be unique');

  const preA1 = CURRICULUM_CATALOG.levels.find(l => l.id === 'pre-a1');
  assert.ok(preA1 && preA1.sections.length === 4, 'Pre-A1 must have 4 sections');
  const allPreA1Units = preA1.sections.flatMap(s => s.units);
  assert.ok(allPreA1Units.length >= 5, 'Pre-A1 must have at least 5 units');
  const unit1 = allPreA1Units[0];
  const unit5 = allPreA1Units[4];
  const unit1RewardId = `reward_unit_${unit1.id}`;
  const unit5RewardId = `reward_unit_${unit5.id}`;
  const sec1RewardId = `reward_section_${preA1.sections[0].id}`;
  const sec2RewardId = `reward_section_${preA1.sections[1].id}`;
  const preA1MilestoneId = 'reward_cefr_pre-a1';

  assert.equal(REWARD_BY_ID.get(unit1RewardId)?.xpAmount, 50);
  assert.equal(REWARD_BY_ID.get(unit5RewardId)?.xpAmount, 100);
  assert.equal(REWARD_BY_ID.get(unit5RewardId)?.gemsAmount, 10);
  assert.equal(REWARD_BY_ID.get(preA1MilestoneId)?.xpAmount, 500);
  assert.equal(REWARD_BY_ID.get(preA1MilestoneId)?.gemsAmount, 50);
  console.log('PASS 0: Verified reward definitions catalog & Pre-A1 milestone config.');

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

    const username = 'reward_tester';
    const password = 'StrongPassword123!';
    const signup = await req('/auth/signup', { name: 'Reward Tester', username, password });
    assert.equal(signup.status, 200, `Signup failed: ${JSON.stringify(signup.data)}`);
    const token = signup.data.token;
    assert.equal(signup.data.progress.gems, 0, 'New account starts with 0 gems');

    // 1. Test: Incomplete unit does NOT unlock chest & claiming returns 403
    const firstLessonOnly = unit1.lessons[0];
    const partialRes = await req('/progress/lesson', {
      lesson: firstLessonOnly.id,
      answers: perfectAnswersFor(firstLessonOnly.id),
      durationSec: 25
    }, token);
    assert.equal(partialRes.status, 200);
    assert.equal(partialRes.data.progress.rewards?.[unit1RewardId]?.status, 'locked', 'Incomplete Unit 1 must stay locked');

    const earlyClaim = await req(`/rewards/${unit1RewardId}/claim`, {}, token);
    assert.equal(earlyClaim.status, 403, 'Server must reject claiming an incomplete unit chest');
    console.log('PASS 1: Incomplete unit chest remains locked and server rejects premature claims (403).');

    // 2. Test: Finish remaining lessons in Unit 1 -> unlocks Unit 1 chest (50 XP + badge) -> claim atomically
    for (const l of unit1.lessons.slice(1)) {
      const lr = await req('/progress/lesson', {
        lesson: l.id,
        answers: perfectAnswersFor(l.id),
        durationSec: 30
      }, token);
      assert.equal(lr.status, 200);
    }

    let rwState = await req('/rewards', undefined, token, 'GET');
    assert.equal(rwState.status, 200);
    assert.equal(rwState.data.rewards?.[unit1RewardId]?.status, 'available', 'Completed Unit 1 chest should be available');

    const xpBeforeU1Claim = rwState.data.xp;
    const claimU1 = await req(`/rewards/${unit1RewardId}/claim`, {}, token);
    assert.equal(claimU1.status, 200);
    assert.equal(claimU1.data.alreadyClaimed, false);
    assert.equal(claimU1.data.xpAdded, 50);
    assert.equal(claimU1.data.xp, xpBeforeU1Claim + 50, 'XP must increase by +50');
    assert.equal(claimU1.data.reward?.id, unit1RewardId);
    assert.equal(claimU1.data.progress.rewards?.[unit1RewardId]?.status, 'claimed');

    // 3. Test: Double-claim does NOT duplicate XP/Gems
    const doubleClaimU1 = await req(`/rewards/${unit1RewardId}/claim`, {}, token);
    assert.equal(doubleClaimU1.status, 200);
    assert.equal(doubleClaimU1.data.alreadyClaimed, true, 'Second claim must report alreadyClaimed: true');
    assert.equal(doubleClaimU1.data.xpAdded, 0, 'Duplicate claim must add 0 XP');
    assert.equal(doubleClaimU1.data.gemsAdded, 0, 'Duplicate claim must add 0 Gems');
    assert.equal(doubleClaimU1.data.xp, xpBeforeU1Claim + 50, 'XP must remain unchanged on duplicate claim');
    console.log('PASS 2 & 3: Unit 1 chest unlocks, claims +50 XP atomically, and blocks duplicate payouts.');

    // 4. Test: Complete Units 2..4 (Sections 1..3 = 3/4 sections done, Pre-A1 Milestone STILL locked)
    const middleUnitsLessons = allPreA1Units.slice(1, 4).flatMap(u => u.lessons);
    for (const l of middleUnitsLessons) {
      const lr = await req('/progress/lesson', {
        lesson: l.id,
        answers: perfectAnswersFor(l.id),
        durationSec: 35
      }, token);
      assert.equal(lr.status, 200, `Lesson ${l.id} completion failed`);
    }

    // Complete Unit 5 EXCEPT its final assessment lesson -> still 3/4 sections and Unit 5 locked
    for (const l of unit5.lessons.slice(0, -1)) {
      const lr = await req('/progress/lesson', {
        lesson: l.id,
        answers: perfectAnswersFor(l.id),
        durationSec: 35
      }, token);
      assert.equal(lr.status, 200, `Lesson ${l.id} completion failed`);
    }

    // Verify Pre-A1 Milestone & Unit 5 chest are STILL locked (final assessment not completed yet)
    const prematurePreA1 = await req(`/rewards/${preA1MilestoneId}/claim`, {}, token);
    assert.equal(prematurePreA1.status, 403, 'Pre-A1 Milestone cannot unlock before all 4 sections & final assessment');
    const prematureU5 = await req(`/rewards/${unit5RewardId}/claim`, {}, token);
    assert.equal(prematureU5.status, 403, 'Unit 5 chest cannot unlock before final lesson in Unit 5');

    // Now finish Unit 5 final assessment lesson -> Unit 5 chest, Section 4, and Pre-A1 Milestone unlock
    const finalUnit5Lesson = unit5.lessons[unit5.lessons.length - 1];
    const finalLr = await req('/progress/lesson', {
      lesson: finalUnit5Lesson.id,
      answers: perfectAnswersFor(finalUnit5Lesson.id),
      durationSec: 40
    }, token);
    assert.equal(finalLr.status, 200);

    // Unit 5 chest and Section 1 Reward must now be available
    const beforeU5 = await req('/rewards', undefined, token, 'GET');
    assert.equal(beforeU5.data.rewards?.[unit5RewardId]?.status, 'available', 'Unit 5 Reward chest must unlock after Unit 5');
    assert.equal(beforeU5.data.rewards?.[sec1RewardId]?.status, 'available', 'Section 1 reward must unlock after Section 1');

    const xpBeforeU5 = beforeU5.data.xp;
    const claimU5 = await req(`/rewards/${unit5RewardId}/claim`, {}, token);
    assert.equal(claimU5.status, 200);
    assert.equal(claimU5.data.xpAdded, 100);
    assert.equal(claimU5.data.gemsAdded, 10);
    assert.equal(claimU5.data.xp, xpBeforeU5 + 100);
    assert.equal(claimU5.data.gems, 10);

    // Double claim Unit 5 does not duplicate Gems
    const doubleU5 = await req(`/rewards/${unit5RewardId}/claim`, {}, token);
    assert.equal(doubleU5.data.alreadyClaimed, true);
    assert.equal(doubleU5.data.gems, 10, 'Double claim must not duplicate Gems');
    console.log('PASS 4: Incomplete Pre-A1 blocked (403); finishing final assessment unlocks Unit 5 chest (+100 XP & +10 Gems once).');

    // 5. Test: Refresh (/api/me) and second-device login preserve state & reward history
    const meRefresh = await req('/me', undefined, token, 'GET');
    assert.equal(meRefresh.status, 200);
    assert.equal(meRefresh.data.progress.gems, 10);
    assert.equal(meRefresh.data.progress.rewards?.[unit5RewardId]?.status, 'claimed');

    const secondLogin = await req('/auth/login', { username, password });
    assert.equal(secondLogin.status, 200);
    assert.equal(secondLogin.data.progress.gems, 10, 'Second device login receives synced gems balance');
    assert.equal(secondLogin.data.progress.rewards?.[unit1RewardId]?.status, 'claimed');
    console.log('PASS 5: Refresh and second-device login preserve claimed chests and Gems wallet.');

    // 6. Test: Claim Section 2 reward (+150 XP + 15 Gems) & Pre-A1 Milestone (500 XP + 50 Gems + Starter Graduate + Certificate)
    const claimSec2 = await req(`/rewards/${sec2RewardId}/claim`, {}, token);
    assert.equal(claimSec2.status, 200);
    assert.equal(claimSec2.data.gemsAdded, 15);

    const claimPreA1 = await req(`/rewards/${preA1MilestoneId}/claim`, {}, token);
    assert.equal(claimPreA1.status, 200, 'Pre-A1 Milestone should claim once all 4 sections + final assessment pass');
    assert.equal(claimPreA1.data.xpAdded, 500);
    assert.equal(claimPreA1.data.gemsAdded, 50);
    assert.equal(claimPreA1.data.gems, 10 + 15 + 50, 'Total Gems = 75');
    assert.ok(claimPreA1.data.progress.badges?.starter_graduate, 'Starter Graduate badge must be awarded');
    assert.ok(claimPreA1.data.progress.certificates?.['pre-a1'], 'Completion certificate must be saved');

    const historyRes = await req('/rewards', undefined, token, 'GET');
    assert.ok(historyRes.data.history.length >= 4, 'Profile reward history must contain all claimed rewards');
    console.log('PASS 6: Pre-A1 Milestone unlocks upon 4/4 sections + final assessment and awards 500 XP, 50 Gems, Badge, & Certificate.');

    // 7. Test: Safe idempotent backfill on legacy completed account (already finished Unit 1, zero reward state)
    const legacyProgress = {
      xp: 300,
      words: 15,
      streak: 3,
      completed: unit1.lessons.map(l => l.id),
      checkpoints: [],
      saved: [],
      history: {}
    };
    const backfillEval = evaluateRewards(legacyProgress, new Date().toISOString());
    assert.ok(backfillEval.newlyAvailable.some(r => r.id === unit1RewardId), 'Legacy account qualifies for Unit 1 chest');
    assert.equal(legacyProgress.xp, 300, 'Backfill must not mutate existing XP until user opens chest');
    assert.equal(legacyProgress.gems, 0, 'Gems initialized safely to 0 without overwriting user stats');
    const legacyClaim = claimReward(legacyProgress, unit1RewardId);
    assert.equal(legacyClaim.xpAdded, 50);
    assert.equal(legacyProgress.xp, 350);
    console.log('PASS 7: Legacy user backfill unlocks eligible rewards without resetting or double-crediting XP.');

    console.log('\nALL REWARD SYSTEM TESTS PASSED (100%)!');
  } finally {
    serverProc.kill();
    try { fs.rmSync(tempDataPath, { force: true }); } catch { }
  }
}

runTests().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
