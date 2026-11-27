import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lingoDir = path.resolve(__dirname, '..');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function waitForHealth(baseUrl, child) {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early with code ${child.exitCode}`);
    }
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      if (r.ok) return;
    } catch { }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Timed out waiting for isolated server');
}

async function api(baseUrl, endpoint, { body, token, method } = {}) {
  const res = await fetch(`${baseUrl}/api${endpoint}`, {
    method: method || (body !== undefined ? 'POST' : 'GET'),
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

const port = await getFreePort();
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingo-p2-gate-'));
const dataPath = path.join(tmpDir, 'data.json');
const baseUrl = `http://127.0.0.1:${port}`;

let child = spawn(process.execPath, ['server.mjs'], {
  cwd: lingoDir,
  env: {
    ...process.env,
    ISOLATED_TEST: '1',
    LINGO_NO_DOTENV: '1',
    PORT: String(port),
    DATA_PATH: dataPath
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

try {
  await waitForHealth(baseUrl, child);

  // 1. Create a normal user and a user that will be flagged as leaked
  const normalSignup = await api(baseUrl, '/auth/signup', {
    body: { username: 'normal_user', name: 'Normal User', password: 'NormalPass123' }
  });
  assert.equal(normalSignup.status, 200);
  const normalToken = normalSignup.data.token;
  assert.equal(normalSignup.data.user.mustChangePassword, false);

  const flaggedSignup = await api(baseUrl, '/auth/signup', {
    body: { username: 'leaked_user', name: 'Leaked User', password: 'OldPassword123' }
  });
  assert.equal(flaggedSignup.status, 200);
  const preFlagToken = flaggedSignup.data.token;

  // 2. Flag leaked_user via flag-leaked-accounts.mjs (using a synthetic backup file)
  const backupPath = path.join(tmpDir, 'backup.json');
  fs.writeFileSync(backupPath, JSON.stringify({
    accounts: {
      leaked_user: { username: 'leaked_user', demo: false },
      demo_123: { username: 'demo_123', demo: true }
    }
  }));

  // Dry-run leaves data.json untouched
  const dryRun = spawn(process.execPath, ['scripts/flag-leaked-accounts.mjs', '--file', backupPath], {
    cwd: lingoDir,
    env: { ...process.env, LINGO_NO_DOTENV: '1', DATA_PATH: dataPath, SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
    stdio: 'pipe'
  });
  const dryCode = await new Promise(r => dryRun.on('close', r));
  assert.equal(dryCode, 0);
  const beforeApply = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  assert.ok(!beforeApply.accounts.leaked_user.mustChangePassword, 'Dry-run must not modify storage');

  // Apply sets mustChangePassword=true on non-demo leaked_user only
  const applyRun = spawn(process.execPath, ['scripts/flag-leaked-accounts.mjs', '--file', backupPath, '--apply'], {
    cwd: lingoDir,
    env: { ...process.env, LINGO_NO_DOTENV: '1', DATA_PATH: dataPath, SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
    stdio: 'pipe'
  });
  const applyCode = await new Promise(r => applyRun.on('close', r));
  assert.equal(applyCode, 0);
  const afterApply = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  assert.equal(afterApply.accounts.leaked_user.mustChangePassword, true);
  assert.ok(!afterApply.accounts.normal_user.mustChangePassword);

  // Restart isolated server so local JSON adapter picks up the external DB update
  child.kill('SIGTERM');
  await new Promise(r => child.once('exit', r));
  child = spawn(process.execPath, ['server.mjs'], {
    cwd: lingoDir,
    env: {
      ...process.env,
      ISOLATED_TEST: '1',
      LINGO_NO_DOTENV: '1',
      PORT: String(port),
      DATA_PATH: dataPath
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await waitForHealth(baseUrl, child);

  // 3. Old session token issued BEFORE flagging cannot bypass the gate
  const preBypass = await api(baseUrl, '/progress/goal', { token: preFlagToken, body: { goal: 20 } });
  assert.equal(preBypass.status, 403, 'Pre-existing token must be gated with 403');
  assert.equal(preBypass.data.mustChangePassword, true);

  // 4. Flagged user logs in with old password -> gets mustChangePassword: true, gated on other endpoints
  const flaggedLogin = await api(baseUrl, '/auth/login', {
    body: { username: 'leaked_user', password: 'OldPassword123' }
  });
  assert.equal(flaggedLogin.status, 200);
  assert.equal(flaggedLogin.data.mustChangePassword, true);
  assert.equal(flaggedLogin.data.user.mustChangePassword, true);
  const gatedToken = flaggedLogin.data.token;

  const gatedGames = await api(baseUrl, '/games', { token: gatedToken, body: { topic: 'Mixed English' } });
  assert.equal(gatedGames.status, 403, 'Flagged user must be blocked from creating games');
  const gatedSocial = await api(baseUrl, '/social/overview', { token: gatedToken });
  assert.equal(gatedSocial.status, 403, 'Flagged user must be blocked from social endpoints');
  const allowedMe = await api(baseUrl, '/me', { token: gatedToken });
  assert.equal(allowedMe.status, 200, '/me remains accessible so client renders reset screen');
  assert.equal(allowedMe.data.user.mustChangePassword, true);

  // 5. Normal user login & endpoints remain completely unchanged
  const normalLogin = await api(baseUrl, '/auth/login', {
    body: { username: 'normal_user', password: 'NormalPass123' }
  });
  assert.equal(normalLogin.status, 200);
  assert.equal(normalLogin.data.mustChangePassword, false);
  const normalGoal = await api(baseUrl, '/progress/goal', { token: normalToken, body: { goal: 20 } });
  assert.equal(normalGoal.status, 200);

  // 6. change-password validation & success (scrypt N=2^17, clears flag, revokes old tokens)
  const badCurrent = await api(baseUrl, '/auth/change-password', {
    token: gatedToken,
    body: { currentPassword: 'WrongPassword', newPassword: 'BrandNewPassword123!' }
  });
  assert.equal(badCurrent.status, 401);

  const shortNew = await api(baseUrl, '/auth/change-password', {
    token: gatedToken,
    body: { currentPassword: 'OldPassword123', newPassword: 'short99' }
  });
  assert.equal(shortNew.status, 400);

  const changed = await api(baseUrl, '/auth/change-password', {
    token: gatedToken,
    body: { currentPassword: 'OldPassword123', newPassword: 'BrandNewStrongPassword2026!' }
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.user.mustChangePassword, false);
  const freshToken = changed.data.token;

  // Verify scrypt-n17 stored and old tokens invalidated
  const storedAfterChange = JSON.parse(fs.readFileSync(dataPath, 'utf8')).accounts.leaked_user;
  assert.equal(storedAfterChange.passwordAlgo, 'scrypt-n17');
  assert.equal(storedAfterChange.mustChangePassword, false);

  const oldPreRes = await api(baseUrl, '/me', { token: preFlagToken });
  assert.equal(oldPreRes.status, 401, 'Old pre-reset token must be invalidated by tokenVersion bump');

  const unlockedGoal = await api(baseUrl, '/progress/goal', { token: freshToken, body: { goal: 20 } });
  assert.equal(unlockedGoal.status, 200, 'New token unlocks all endpoints');

  // 7. Login rate limiting per username (8 per 15 min) & generic error message
  for (let i = 0; i < 8; i++) {
    const attempt = await api(baseUrl, '/auth/login', {
      body: { username: 'rate_target_user', password: 'WrongPassword123' }
    });
    assert.equal(attempt.status, 401);
  }
  const rateLimited = await api(baseUrl, '/auth/login', {
    body: { username: 'rate_target_user', password: 'WrongPassword123' }
  });
  assert.equal(rateLimited.status, 429, '9th login attempt for same username must return 429');
  assert.ok(String(rateLimited.data.error).includes('Too many sign-in attempts'));

  console.log('PASS: Phase 2 forced password reset gate, scrypt N=2^17 rehash, session revocation, and login rate limit verified.');
} finally {
  child.kill('SIGTERM');
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
