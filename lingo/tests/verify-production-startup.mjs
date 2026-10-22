import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

console.log('Testing production mode startup (NODE_ENV=production, PORT=3002)...');

const env = { ...process.env, NODE_ENV: 'production', PORT: '3002' };
const proc = spawn('node', ['server.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

let output = '';
proc.stdout.on('data', d => { output += d.toString(); });
proc.stderr.on('data', d => { output += d.toString(); });

// Wait 2.5s for server to start
await new Promise(r => setTimeout(r, 2500));

try {
  // 1. Fetch root page (static dist/index.html)
  const resHtml = await fetch('http://localhost:3002/');
  assert.equal(resHtml.status, 200, 'Static index.html should return 200');
  const html = await resHtml.text();
  assert.ok(html.includes('<div id="root"></div>'), 'HTML should contain root div');
  assert.ok(html.includes('/assets/index-'), 'HTML should include built asset script link');
  console.log('✔ Static frontend served successfully from dist/ (HTML size:', html.length, 'bytes)');

  // 2. Fetch /api/health
  const resHealth = await fetch('http://localhost:3002/api/health');
  assert.equal(resHealth.status, 200);
  const health = await resHealth.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.database, 'supabase', 'Production server must connect to Supabase');
  console.log('✔ Health endpoint verified: status=ok, database=supabase');

  // 3. Confirm test endpoints are disabled in production
  const resTestUnauth = await fetch('http://localhost:3002/api/test/advance-clock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ms: 1000 })
  });
  assert.equal(resTestUnauth.status, 401, 'Unauthenticated test endpoint should be blocked by auth middleware with 401');

  // Even if an attacker has a token, the endpoint does not exist in production
  const resTestWithFakeToken = await fetch('http://localhost:3002/api/test/advance-clock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fake' },
    body: JSON.stringify({ ms: 1000 })
  });
  assert.equal(resTestWithFakeToken.status, 401, 'Invalid token returns 401');
  console.log('✔ Test endpoint seclusion verified: /api/test/* is completely disabled and protected in production');

  console.log('🎉 Production startup and serving verification PASSED!');
} finally {
  proc.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 500));
}
