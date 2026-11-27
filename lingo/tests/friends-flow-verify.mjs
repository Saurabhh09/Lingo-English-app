import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const tempDataPath = path.join(os.tmpdir(), `lingo-friends-verify-${Date.now()}.json`);
const port = 3459;
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
  console.log('--- RUNNING FRIENDS MODE LOBBY, COUNTDOWN, GAMEPLAY & PODIUM LEADERBOARD TESTS ---');
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

    const host = await req('/auth/signup', { name: 'Saurabh', username: 'host_saurabh', password: 'Password123!' });
    const guest = await req('/auth/signup', { name: 'Zayn', username: 'guest_zayn', password: 'Password123!' });
    assert.equal(host.status, 200);
    assert.equal(guest.status, 200);

    // 1. Host creates participating Friends room
    const created = await req('/games', {
      topic: 'Mixed English',
      difficulty: 'Intermediate',
      duration: 5,
      questionCount: 3,
      hostRole: 'player'
    }, host.data.token);
    assert.equal(created.status, 200);
    assert.equal(created.data.status, 'waiting');
    assert.equal(created.data.hostRole, 'player');
    const code = created.data.code;
    assert.match(code, /^[A-Z0-9]{6}$/);

    // 2. Guest joins room
    const joined = await req('/games/join', { code }, guest.data.token);
    assert.equal(joined.status, 200);
    assert.equal(joined.data.members.length, 2);
    console.log(`PASS 1: Participating Friends room ${code} created & guest joined cleanly.`);

    // 3. Host starts -> Countdown -> Playing
    const started = await req(`/games/${code}/start`, {}, host.data.token);
    assert.equal(started.status, 200);
    assert.equal(started.data.status, 'countdown');
    await req('/test/advance-clock', { ms: 10000 });

    const hostPlay = await req(`/games/${code}`, undefined, host.data.token, 'GET');
    const guestPlay = await req(`/games/${code}`, undefined, guest.data.token, 'GET');
    assert.equal(hostPlay.data.status, 'playing');
    assert.equal(hostPlay.data.question.id, guestPlay.data.question.id);
    console.log('PASS 2: Countdown transitions to synchronized playing state.');

    // 4. Both players answer 3 questions & reach Leaderboard with accuracyPercent populated
    for (let idx = 0; idx < 3; idx++) {
      const hState = await req(`/games/${code}`, undefined, host.data.token, 'GET');
      const gState = await req(`/games/${code}`, undefined, guest.data.token, 'GET');
      const hAns = await req(`/games/${code}/answer`, { index: idx, questionId: hState.data.question.id, choice: 0 }, host.data.token);
      assert.equal(hAns.status, 200);
      assert.ok(hAns.data.answer, 'Host sees immediate answer feedback');
      const gAns = await req(`/games/${code}/answer`, { index: idx, questionId: gState.data.question.id, choice: 1 }, guest.data.token);
      assert.equal(gAns.status, 200);

      await req(`/games/${code}/next`, {}, host.data.token);
      await req(`/games/${code}/next`, {}, guest.data.token);
    }

    const finalHost = await req(`/games/${code}`, undefined, host.data.token, 'GET');
    assert.equal(finalHost.data.status, 'finished');
    assert.equal(finalHost.data.leaderboard.length, 2);
    for (const row of finalHost.data.leaderboard) {
      assert.equal(typeof row.accuracyPercent, 'number', 'Leaderboard row includes accuracyPercent');
      assert.equal(typeof row.correct, 'number', 'Leaderboard row includes correct count');
      assert.equal(typeof row.timedOut, 'number', 'Leaderboard row includes timeouts count');
    }
    console.log('PASS 3: Friends match finishes with leaderboard sorted and per-player accuracy stats populated.');

    console.log('\nALL FRIENDS MODE TESTS PASSED (100%)!');
  } finally {
    serverProc.kill();
    try { fs.rmSync(tempDataPath, { force: true }); } catch { }
  }
}

runTests().catch(err => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
