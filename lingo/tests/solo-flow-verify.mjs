import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tempDataPath = path.join(os.tmpdir(), `lingo-solo-verify-${Date.now()}.json`);
const port = 3458;
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
  console.log('--- RUNNING SOLO MODE REDESIGN & FINAL REVIEW TESTS ---');
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

    const signup = await req('/auth/signup', {
      name: 'Solo Tester',
      username: 'solo_verify_user',
      password: 'Password123!'
    });
    assert.equal(signup.status, 200);
    const token = signup.data.token;

    // 1. Create 3-question Solo game -> Countdown
    const created = await req('/games/solo', {
      difficulty: 'Intermediate',
      topic: 'Mixed English',
      duration: 3,
      questionCount: 3,
      metadata: { mode: 'solo' }
    }, token);
    assert.equal(created.status, 200);
    assert.equal(created.data.status, 'countdown');
    assert.equal(created.data.question, null, 'Question stays hidden during countdown');
    assert.equal(created.data.total, 3);
    console.log('PASS 1: Solo countdown starts cleanly with question secluded.');

    // 2. Advance clock 10s -> Playing Q1
    await req('/test/advance-clock', { ms: 10000 });
    const q1 = await req('/games/solo', undefined, token, 'GET');
    assert.equal(q1.status, 200);
    assert.equal(q1.data.status, 'playing');
    assert.equal(q1.data.index, 0);
    assert.ok(q1.data.question?.prompt);
    assert.equal(q1.data.question?.options?.length, 4);

    // Answer Q1 & advance Q2
    const a1 = await req('/games/solo/answer', { index: 0, questionId: q1.data.question.id, choice: 0 }, token);
    assert.equal(a1.status, 200);
    assert.ok(a1.data.answer);
    const n2 = await req('/games/solo/next', {}, token);
    assert.equal(n2.status, 200);
    assert.equal(n2.data.index, 1);

    // Answer Q2 & advance Q3 (final question)
    await req('/games/solo/answer', { index: 1, questionId: n2.data.question.id, choice: 1 }, token);
    const n3 = await req('/games/solo/next', {}, token);
    assert.equal(n3.status, 200);
    assert.equal(n3.data.index, 2);
    console.log('PASS 2: Active solo questions and next transitions work cleanly.');

    // 3. Submit final question answer -> status finished, answer feedback AND question preserved for Show Results review
    const finalRes = await req('/games/solo/answer', { index: 2, questionId: n3.data.question.id, choice: 2 }, token);
    assert.equal(finalRes.status, 200);
    assert.equal(finalRes.data.status, 'finished');
    assert.ok(finalRes.data.answer, 'Final question answer feedback must be returned');
    assert.equal(typeof finalRes.data.answer.correct, 'number', 'Correct answer index must be returned');
    assert.ok(finalRes.data.question?.prompt, 'Final question prompt preserved for Show Results review');
    assert.equal(finalRes.data.question?.options?.length, 4, 'Final question options preserved for Show Results review');
    assert.ok(finalRes.data.stats, 'Final stats computed');
    console.log('PASS 3: Final question preserves prompt/options + correct answer feedback for Show Results review.');

    // 4. Leave cleans up session
    const leaveRes = await req('/games/solo/leave', {}, token);
    assert.equal(leaveRes.status, 200);
    const afterLeave = await req('/games/solo', undefined, token, 'GET');
    assert.equal(afterLeave.status, 404);
    console.log('PASS 4: Exit Game clears solo session cleanly.');

    console.log('\nALL SOLO MODE TESTS PASSED (100%)!');
  } finally {
    serverProc.kill();
    try { fs.rmSync(tempDataPath, { force: true }); } catch { }
  }
}

runTests().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
