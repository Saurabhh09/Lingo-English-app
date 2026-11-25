import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  fisherYatesShuffle,
  createShuffledOptions,
  getOrCreateStableShuffle,
  clearStableShufflesByPrefix,
  toOriginalIndex,
  toDisplayIndex,
  recordCorrectPositionMetric,
  getShuffleDistributionStats
} from '../server/optionShuffler.mjs';
import { CURRICULUM_CATALOG, getPublicLesson, getLessonSolutionKeys } from '../server/curriculumCatalog.mjs';
import { LISTENING_MODULES, getPublicPracticeCatalog } from '../server/practiceCatalog.mjs';
import { lessons } from '../content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tempDataPath = path.join(os.tmpdir(), `lingo-shuffle-test-${Date.now()}.json`);
const port = 3461;
const baseUrl = `http://127.0.0.1:${port}/api`;

// Polyfill minimal sessionStorage for Node environment
const memStore = new Map();
globalThis.sessionStorage = {
  get length() { return memStore.size; },
  key(i) { return Array.from(memStore.keys())[i] ?? null; },
  getItem(k) { return memStore.has(k) ? memStore.get(k) : null; },
  setItem(k, v) { memStore.set(String(k), String(v)); },
  removeItem(k) { memStore.delete(String(k)); },
  clear() { memStore.clear(); }
};

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
  console.log('--- RUNNING ANSWER OPTION SHUFFLING & BIAS ELIMINATION TESTS ---');

  // 1. Scenarios where original correct answer is A (0), B (1), C (2), or D (3)
  for (let origCorrect = 0; origCorrect < 4; origCorrect++) {
    const rawOpts = ['Option Alpha', 'Option Beta', 'Option Gamma', 'Option Delta'].map((txt, idx) => ({
      id: `opt_${idx}`,
      originalIndex: idx,
      text: txt,
      isCorrect: idx === origCorrect
    }));

    for (let trial = 0; trial < 25; trial++) {
      const shuf = createShuffledOptions(rawOpts);
      assert.equal(shuf.options.length, 4, 'All 4 options present');
      const uniqueTexts = new Set(shuf.options.map(o => o.text));
      assert.equal(uniqueTexts.size, 4, 'No missing or duplicate option texts');
      const uniqueIds = new Set(shuf.options.map(o => o.id));
      assert.equal(uniqueIds.size, 4, 'Stable IDs preserved');

      const correctDisplayIdx = toDisplayIndex(shuf, origCorrect);
      assert.ok(correctDisplayIdx >= 0 && correctDisplayIdx < 4);
      assert.equal(shuf.options[correctDisplayIdx].isCorrect, true, 'Correct flag follows shuffled object');
      assert.equal(toOriginalIndex(shuf, correctDisplayIdx), origCorrect, 'Round-trip display -> original matches');

      for (let d = 0; d < 4; d++) {
        if (d !== correctDisplayIdx) {
          assert.equal(shuf.options[d].isCorrect, false, 'Incorrect options remain incorrect');
          assert.notEqual(toOriginalIndex(shuf, d), origCorrect);
        }
      }
    }
  }
  console.log('PASS 1: Original answers A, B, C, and D preserve exact identity, uniqueness, and round-trip accuracy.');

  // 2. Stability across active attempt & refresh (sessionStorage), and fresh shuffle on retry
  sessionStorage.clear();
  const attemptKey = 'lingo-shuf:lesson:hello:0:q0';
  const baseOptions = ['Hello', 'Goodbye', 'Good night', 'Thank you'];
  const firstRender = getOrCreateStableShuffle(attemptKey, baseOptions);
  for (let rerender = 0; rerender < 10; rerender++) {
    const sameRender = getOrCreateStableShuffle(attemptKey, baseOptions);
    assert.deepEqual(
      sameRender.displayToOriginal,
      firstRender.displayToOriginal,
      'Re-renders / timer ticks / refresh must NOT reshuffle active question'
    );
  }
  clearStableShufflesByPrefix('lingo-shuf:lesson:hello:');
  let changedOnRetry = false;
  for (let retry = 1; retry <= 10; retry++) {
    const nextAttempt = getOrCreateStableShuffle(`lingo-shuf:lesson:hello:${retry}:q0`, baseOptions);
    if (nextAttempt.displayToOriginal.join(',') !== firstRender.displayToOriginal.join(',')) {
      changedOnRetry = true;
      break;
    }
  }
  assert.ok(changedOnRetry, 'Retrying after clearing attempt cache produces fresh shuffles');
  console.log('PASS 2: Options stay 100% locked during an active attempt & refresh, and re-randomize cleanly on retry.');

  // 3. Distribution check across heavily A-biased curriculum exercises (448/690 originally at index 0)
  const allExercises = CURRICULUM_CATALOG.levels.flatMap(l =>
    l.sections.flatMap(s =>
      s.units.flatMap(u => u.lessons.flatMap(ls => ls.exercises || []))
    )
  );
  assert.equal(allExercises.length, 690);
  const rawCounts = [0, 0, 0, 0];
  for (const ex of allExercises) {
    rawCounts[ex.solutionKey.correctIndex] += 1;
  }
  assert.ok(rawCounts[0] / allExercises.length > 0.60, 'Confirmed raw dataset bias at A (>60%)');

  // Shuffle 6x across all 690 exercises = 4,140 presentations
  for (let pass = 0; pass < 6; pass++) {
    for (const ex of allExercises) {
      const shuf = createShuffledOptions(ex.options);
      const dispCorrect = toDisplayIndex(shuf, ex.solutionKey.correctIndex);
      recordCorrectPositionMetric(dispCorrect);
    }
  }
  const dist = getShuffleDistributionStats();
  assert.equal(dist.total, 4140);
  for (const letter of ['A', 'B', 'C', 'D']) {
    const share = dist[letter] / dist.total;
    assert.ok(
      share >= 0.21 && share <= 0.29,
      `Position ${letter} share ${(share * 100).toFixed(1)}% must be roughly uniform (~25%), got counts=${JSON.stringify(dist)}`
    );
  }
  console.log(`PASS 3: Shuffling eliminates 65% Option-A bias -> balanced distribution over 4,140 presentations: A=${dist.A}, B=${dist.B}, C=${dist.C}, D=${dist.D}.`);

  // 4. End-to-End Integration with Live Backend API (Learn, Practice, Solo, Friends)
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
    await req('/test/reset-clock', {});

    const host = await req('/auth/signup', { name: 'Shuf Host', username: 'shuf_host', password: 'Password123!' });
    const guest = await req('/auth/signup', { name: 'Shuf Guest', username: 'shuf_guest', password: 'Password123!' });
    assert.equal(host.status, 200);
    assert.equal(guest.status, 200);
    const hTok = host.data.token;
    const gTok = guest.data.token;

    // 4a. Learn Lesson (`hello`) with shuffled UI choices -> maps to original canonical index & earns XP
    const helloPublic = getPublicLesson('hello');
    const helloKeys = getLessonSolutionKeys('hello');
    const submittedCanonicalAnswers = [];
    for (let i = 0; i < helloPublic.exercises.length; i++) {
      const ex = helloPublic.exercises[i];
      const shuf = getOrCreateStableShuffle(`lingo-shuf:lesson:hello:0:q${i}:${ex.id}`, ex.options);
      const origCorrect = helloKeys[i].solutionKey.correctIndex;
      const displayedCorrectBtn = toDisplayIndex(shuf, origCorrect);
      const mappedBack = toOriginalIndex(shuf, displayedCorrectBtn);
      const checkRes = await req('/curriculum/exercises/check', {
        lessonId: 'hello',
        exerciseIndex: i,
        choice: mappedBack,
        exerciseId: ex.id
      }, hTok);
      assert.equal(checkRes.status, 200);
      assert.equal(checkRes.data.isCorrect, true, `Learn exercise ${i} must validate true from shuffled choice`);
      submittedCanonicalAnswers.push(mappedBack);
    }
    const lessonDone = await req('/progress/lesson', { lesson: 'hello', answers: submittedCanonicalAnswers }, hTok);
    assert.equal(lessonDone.status, 200);
    assert.equal(lessonDone.data.passed, true);
    assert.ok(lessonDone.data.earned > 0, 'Lesson XP awarded cleanly after shuffled attempt');

    // 4b. Practice Listening module with shuffled choices
    const prPub = getPublicPracticeCatalog();
    const listMod = prPub.listening[0];
    const modSolutions = LISTENING_MODULES[0].solutions;
    const practiceCanonicalChoices = listMod.questions.map((q, qIdx) => {
      const shuf = getOrCreateStableShuffle(`lingo-shuf:listening:${listMod.id}:0:q${qIdx}`, q.options);
      const displayedCorrect = toDisplayIndex(shuf, modSolutions[qIdx]);
      return toOriginalIndex(shuf, displayedCorrect);
    });
    const listSubmit = await req('/practice/listening/submit', {
      moduleId: listMod.id,
      answers: practiceCanonicalChoices
    }, hTok);
    assert.equal(listSubmit.status, 200);
    assert.equal(listSubmit.data.passed, true, 'Listening practice validates 100% accurately with shuffled options');

    // 4c. Solo Game with shuffled options
    const soloInit = await req('/games/solo', { difficulty: 'Beginner', topic: 'Mixed English', duration: 2, questionCount: 3 }, hTok);
    assert.equal(soloInit.status, 200);
    await req('/test/advance-clock', { ms: 10000 });
    const soloPlay = await req('/games/solo', undefined, hTok, 'GET');
    const qObj = soloPlay.data.question;
    const contentMatch = lessons.flatMap(l => l.questions).find(x => x[0] === qObj.prompt);
    assert.ok(contentMatch, 'Found question in bank');
    const soloShuf = getOrCreateStableShuffle(`lingo-shuf:solo:${soloPlay.data.id}:${soloPlay.data.startedAt}:q0:${qObj.id}`, qObj.options);
    const soloDispCorrect = toDisplayIndex(soloShuf, contentMatch[2]);
    const soloAns = await req('/games/solo/answer', {
      index: 0,
      questionId: qObj.id,
      choice: toOriginalIndex(soloShuf, soloDispCorrect)
    }, hTok);
    assert.equal(soloAns.status, 200);
    assert.equal(soloAns.data.answer.isCorrect, true, 'Solo game validates correct answer through display -> original mapping');

    // 4d. Friends Multiplayer with per-player shuffled options & synchronized validation
    const room = await req('/games', { difficulty: 'Beginner', topic: 'Mixed English', duration: 2, questionCount: 3, hostRole: 'player' }, hTok);
    const code = room.data.code;
    await req('/games/join', { code }, gTok);
    await req(`/games/${code}/start`, {}, hTok);
    await req('/test/advance-clock', { ms: 10000 });
    const hPlay = await req(`/games/${code}`, undefined, hTok, 'GET');
    const gPlay = await req(`/games/${code}`, undefined, gTok, 'GET');
    assert.equal(hPlay.data.question.prompt, gPlay.data.question.prompt, 'Both players get the exact same question prompt');
    const fMatch = lessons.flatMap(l => l.questions).find(x => x[0] === hPlay.data.question.prompt);
    const hShuf = getOrCreateStableShuffle(`lingo-shuf:room:${code}:shuf_host:${hPlay.data.startedAt}:q0:${hPlay.data.question.id}`, hPlay.data.question.options);
    const gShuf = getOrCreateStableShuffle(`lingo-shuf:room:${code}:shuf_guest:${gPlay.data.startedAt}:q0:${gPlay.data.question.id}`, gPlay.data.question.options);
    const hRes = await req(`/games/${code}/answer`, { index: 0, questionId: hPlay.data.question.id, choice: toOriginalIndex(hShuf, toDisplayIndex(hShuf, fMatch[2])) }, hTok);
    const gWrongDisp = (toDisplayIndex(gShuf, fMatch[2]) + 1) % 4;
    const gRes = await req(`/games/${code}/answer`, { index: 0, questionId: gPlay.data.question.id, choice: toOriginalIndex(gShuf, gWrongDisp) }, gTok);
    assert.equal(hRes.data.answer.isCorrect, true, 'Host shuffled correct answer validates true');
    assert.equal(gRes.data.answer.isCorrect, false, 'Guest shuffled wrong answer validates false');

    console.log('PASS 4: End-to-end backend validation & XP/score intact for Learn, Practice, Solo, and Friends.');
    console.log('\nALL OPTION SHUFFLING & BIAS FIX TESTS PASSED (100%)!');
  } finally {
    serverProc.kill();
    try { fs.rmSync(tempDataPath, { force: true }); } catch { }
  }
}

runTests().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
